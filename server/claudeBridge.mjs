// Local Claude bridge for the Content Studio copywriter.
//
// No API keys: we strip ANTHROPIC_API_KEY/ANTHROPIC_AUTH_TOKEN and invoke the
// locally installed, already-logged-in `claude` CLI, which uses its OAuth
// subscription token (~/.claude/.credentials.json). Same mechanism as
// C:\Users\Xlythe\cloud-ide (which drives the Python claude_agent_sdk the same way).
//
// Uses the Claude Agent SDK (@anthropic-ai/claude-agent-sdk) to run the bundled
// `claude` under that subscription token. One session is reused per chat (resume),
// reasoning is capped at medium effort, and thinking + answer stream separately.

import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { transform as sucraseTransform } from "sucrase";

const MODEL_MAP = {
  haiku: "claude-haiku-4-5",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-8",
};

function resolveModel(short) {
  return MODEL_MAP[String(short || "").toLowerCase()] || MODEL_MAP.haiku;
}

// ---- Prompt building -------------------------------------------------------

const SCHEMAS = {
  caption: `{"caption": string, "hashtags": string[]}`,
  single: `{"headline": string, "subheadline": string, "body": string}`,
  slides: `{"slides": [{"headline": string, "body": string}], "caption": string}`,
};

const GUIDANCE = {
  caption:
    "Write one engaging social media caption (LinkedIn/Instagram) for the topic, plus 5-10 relevant hashtags. Keep the caption punchy with line breaks where natural.",
  single:
    "Write copy for a SINGLE social image: a short bold headline (max ~8 words), a one-line subheadline, and a concise body (2-4 short sentences).",
  slides:
    "Write copy for an Instagram carousel that teaches the topic. Produce 5-7 slides; each slide has a short headline and a brief body (1-3 short sentences). Slide 1 is a strong hook, the last slide is a call to action. Also write one caption for the post.",
};

function buildPrompt(contentType, userPrompt) {
  const type = SCHEMAS[contentType] ? contentType : "caption";
  return [
    "You are an expert social media copywriter.",
    GUIDANCE[type],
    "",
    "IMPORTANT: Do NOT use any emojis, emoticons, or pictographic/symbol characters anywhere in the text. Plain text only.",
    "",
    `Topic / instructions from the user:\n${userPrompt}`,
    "",
    `Return ONLY valid JSON matching exactly this shape (no markdown, no code fences, no commentary):`,
    SCHEMAS[type],
  ].join("\n");
}

// Belt-and-suspenders: strip any emoji/pictographic characters the model emits anyway.
function stripEmoji(value) {
  if (typeof value === "string") {
    return value
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{200D}\u{20E3}]/gu, "")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }
  if (Array.isArray(value)) return value.map(stripEmoji);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = stripEmoji(v);
    return out;
  }
  return value;
}

// ---- Claude Agent SDK invocation -------------------------------------------
//
// Run the locally installed, logged-in `claude` via the Agent SDK so we can
// (a) reuse one session per chat (resume = retained memory), (b) stream thinking
// and answer text on separate channels, and (c) cap reasoning at MEDIUM effort.
// Subscription auth only: the child env has ANTHROPIC_API_KEY/ANTHROPIC_AUTH_TOKEN
// stripped (same approach as C:\Users\Xlythe\cloud-ide).

// Stable working dir so a resumed session resolves to the same transcript store.
const AGENT_CWD = process.cwd();

function subscriptionEnv() {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  return env;
}

function dataUrlToImageBlock(dataUrl) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s.exec(String(dataUrl || ""));
  if (!m) return null;
  return { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } };
}

// One response through the Agent SDK. Streams onEvent({type:"thinking"|"delta"|
// "session"|"done"}) and returns { text, sessionId }. Pass `resume` to continue
// an existing session (full prior context retained = memory). Tool-less, so the
// model just emits our JSON answer; maxTurns gives a thinking-heavy reply room to
// finish across SDK turns.
async function runAgent({ prompt, model, resume, images, onEvent }, { timeoutMs = 600000 } = {}) {
  const abort = new AbortController();
  const timer = setTimeout(() => { try { abort.abort(); } catch { /* noop */ } }, timeoutMs);

  // Text-only -> string prompt. With images -> a one-shot streaming-input user
  // message carrying the image blocks (the wire shape the CLI accepts).
  let promptInput = prompt;
  if (Array.isArray(images) && images.length) {
    const content = [{ type: "text", text: prompt }];
    for (const d of images) { const b = dataUrlToImageBlock(d); if (b) content.push(b); }
    promptInput = (async function* () {
      yield { type: "user", message: { role: "user", content }, parent_tool_use_id: null };
    })();
  }

  const options = {
    model: resolveModel(model),
    effort: "medium",
    includePartialMessages: true,
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    allowedTools: [],
    settingSources: [],
    maxTurns: 8, // no tools, so no runaway loop; lets a thinking-heavy answer finish
    cwd: AGENT_CWD,
    env: subscriptionEnv(),
    abortController: abort,
    ...(resume ? { resume } : {}),
  };

  const emit = (ev) => { if (onEvent) { try { onEvent(ev); } catch { /* noop */ } } };

  let acc = "";               // streamed answer text (text_delta channel)
  let lastAssistantText = ""; // full text of the most recent assistant message
  let resultText = "";        // text from the final result envelope
  let sawThinking = false;
  let sessionId = null;
  let isError = false;
  let errorMessage = "";

  try {
    for await (const msg of query({ prompt: promptInput, options })) {
      if (!sessionId && msg && typeof msg.session_id === "string" && msg.session_id) {
        sessionId = msg.session_id;
        emit({ type: "session", sessionId });
      }
      if (msg.type === "stream_event") {
        const ev = msg.event;
        const d = ev?.delta;
        if (ev?.type === "content_block_delta" && d?.type === "text_delta" && typeof d.text === "string") {
          acc += d.text;
          emit({ type: "delta", text: d.text });
        } else if (ev?.type === "content_block_delta" && d?.type === "thinking_delta" && typeof d.thinking === "string") {
          sawThinking = true;
          emit({ type: "thinking", text: d.thinking });
        }
      } else if (msg.type === "assistant") {
        const txt = (msg.message?.content || []).filter((c) => c?.type === "text").map((c) => c.text).join("");
        if (txt.trim()) lastAssistantText = txt; // keep the latest non-empty answer text
      } else if (msg.type === "result") {
        if (msg.subtype === "error" || msg.is_error) {
          isError = true;
          errorMessage = (typeof msg.result === "string" && msg.result) || "Claude returned an error";
        } else if (typeof msg.result === "string" && msg.result.trim()) {
          resultText = msg.result;
        }
      }
    }
  } finally {
    clearTimeout(timer);
  }

  if (isError) throw new Error(errorMessage);

  // Prefer the streamed text; fall back to the full assistant message, then the
  // result envelope — so a thinking-heavy reply whose answer didn't arrive as
  // text deltas is still captured.
  const finalText = (acc.trim() ? acc : "") || lastAssistantText || resultText;
  if (!finalText.trim()) {
    throw new Error(
      sawThinking
        ? "The model spent its turn thinking and didn't return an answer — please try again."
        : "Claude returned an empty response.",
    );
  }
  emit({ type: "done", text: finalText, sessionId });
  return { text: finalText, sessionId };
}

// ---- Parsing ---------------------------------------------------------------

function stripFences(text) {
  return text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
}

function extractJson(text) {
  const cleaned = stripFences(text);
  try {
    return JSON.parse(cleaned);
  } catch { /* fall through */ }
  // Fallback: grab the first {...} block.
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return JSON.parse(cleaned.slice(start, end + 1));
  }
  throw new Error("Model did not return valid JSON");
}

// ---- Public API ------------------------------------------------------------

export async function generateCopy({ prompt, contentType, model, resume } = {}) {
  if (!prompt || !String(prompt).trim()) {
    throw new Error("Prompt is required");
  }
  const fullPrompt = buildPrompt(contentType, String(prompt).trim());
  const { text, sessionId } = await runAgent({ prompt: fullPrompt, model, resume });
  const data = stripEmoji(extractJson(text));
  return { contentType: SCHEMAS[contentType] ? contentType : "caption", data, sessionId };
}

// ---- AI canvas assistant (Cursor-style design edits) -----------------------

const FONTS = "Montserrat, Inter, Roboto, Open Sans, Lato, Poppins, Playfair Display, Oswald";

function buildCanvasEditPrompt(instruction, canvas, history) {
  const convo = (Array.isArray(history) ? history.slice(-6) : [])
    .map((m) => `${String(m.role).toUpperCase()}: ${m.content}`)
    .join("\n");
  const current = {
    width: canvas.width,
    height: canvas.height,
    background: canvas.background,
    textElements: canvas.textElements,
    imageElements: (canvas.imageElements || []).map((i) => ({
      id: i.id,
      x: i.x,
      y: i.y,
      width: i.width,
      height: i.height,
      opacity: i.opacity,
      locked: !!i.locked,
    })),
  };
  return [
    "You are a senior graphic designer editing ONE social-media canvas.",
    "Edit the canvas per the user instruction: text wording, font, size, color, weight, alignment, positions (x,y), text box width, and the background.",
    `Coordinate system: origin is top-left, units are pixels. Canvas is ${canvas.width} x ${canvas.height}. Keep elements inside these bounds.`,
    "Rules:",
    '- Preserve each text element\'s existing "id" when modifying it; only assign a new id for a genuinely new text element.',
    '- For images, you may ONLY reposition/resize them by their "id" (x,y,width,height,opacity). Never invent image data or new images.',
    '- Some elements include "locked": true. NEVER modify, move, restyle, reorder, or delete locked elements — return them exactly as given. You may design the rest of the layout around them.',
    "- Do NOT use emojis or pictographic characters.",
    `- fontFamily must be one of: ${FONTS}.`,
    "- align is one of left|center|right|justify. originX is left|center|right. originY is top|center|bottom. Colors are hex strings.",
    "- Keep good contrast and readable sizes; balance the layout.",
    "",
    "Current canvas JSON:",
    JSON.stringify(current),
    "",
    convo ? `Conversation so far:\n${convo}\n` : "",
    `User instruction: ${instruction}`,
    "",
    "Return ONLY valid JSON (no markdown, no code fences) of this exact shape:",
    '{"summary": "one short sentence on what you changed", "canvas": {"background": {"type","color","gradientFrom","gradientTo","gradientAngle","opacity"}, "textElements": [{"id","text","x","y","fontSize","color","fontFamily","fontWeight","align","originX","originY","width","opacity"}], "imageElements": [{"id","x","y","width","height","opacity"}]}}',
  ].join("\n");
}

export async function editCanvas({ instruction, canvas, history, model, images, resume } = {}) {
  if (!instruction || !String(instruction).trim()) throw new Error("Instruction is required");
  if (!canvas || typeof canvas !== "object") throw new Error("Canvas is required");
  const fullPrompt = buildCanvasEditPrompt(String(instruction).trim(), canvas, history);
  const { text, sessionId } = await runAgent({ prompt: fullPrompt, model, images, resume });
  return { ...stripEmoji(extractJson(text)), sessionId }; // { summary, canvas, sessionId }
}

export async function editCanvasStream({ instruction, canvas, history, model, images, resume } = {}, onEvent) {
  if (!instruction || !String(instruction).trim()) throw new Error("Instruction is required");
  if (!canvas || typeof canvas !== "object") throw new Error("Canvas is required");
  const fullPrompt = buildCanvasEditPrompt(String(instruction).trim(), canvas, history);
  await runAgent({ prompt: fullPrompt, model, images, resume, onEvent });
}

// ---- AI slideshow assistant (whole-deck animated edits) --------------------

const ENTER_ANIMS = "none, fadeIn, slideInLeft, slideInRight, slideInUp, slideInDown, scaleIn, popIn, blurIn, rotateIn, typewriter";
const EXIT_ANIMS = "none, fadeOut, slideOutLeft, slideOutRight, slideOutUp, slideOutDown, scaleOut, blurOut";
const EMPHASIS_ANIMS = "none, pulse, float, shake, wiggle, glow, kenBurns";
const SLIDE_TRANSITIONS = "none, fade, slideLeft, slideUp, zoom, wipeLeft, dissolve";
const EASINGS = "linear, easeIn, easeOut, easeInOut, anticipate, backOut";

function buildDeckEditPrompt(instruction, scope, targetSlideId, deck, history) {
  const convo = (Array.isArray(history) ? history.slice(-6) : [])
    .map((m) => `${String(m.role).toUpperCase()}: ${m.content}`)
    .join("\n");
  const settings = deck.settings || {};
  const scopeRule =
    scope === "deck"
      ? 'You MAY edit, add, remove, and reorder slides. Return the FULL ordered array of slides the deck should contain. Keep a slide by returning it with its existing "id"; CREATE a new slide by adding an object with a brand-new unique "id" (e.g. "slide_new_1") and a complete "elements" array (design a full layout: headline, body text, supporting shapes, with staggered enter animations). If the user asks for N slides total, return exactly N slide objects in the intended order.'
      : `Modify ONLY the slide whose id is "${targetSlideId}". Return exactly that one slide.`;
  return [
    "You are a senior motion designer editing an animated marketing slideshow.",
    "Slides render as DOM + framer-motion (HTML/CSS animation), then export to video.",
    "Edit per the user instruction: text, fonts, colors, sizes, positions, backgrounds, per-element animation, and slide timing/transitions.",
    `Coordinate system: origin is top-left, units are pixels. The deck is ${settings.width} x ${settings.height}. Keep elements inside these bounds.`,
    "Rules:",
    '- Preserve each element\'s existing "id" when modifying it; only assign a new id for a genuinely new text or shape element.',
    '- Element "type" is one of: text, image, shape. For images you may ONLY reposition/resize/animate by id (never invent "src" or new images).',
    "- Do NOT use emojis or pictographic characters.",
    "- Colors are hex strings. fontFamily must be one of: Montserrat, Inter, Roboto, Open Sans, Lato, Poppins, Playfair Display, Oswald.",
    "- text align is one of left|center|right.",
    `- animation.enter is one of: ${ENTER_ANIMS}.`,
    `- animation.exit is one of: ${EXIT_ANIMS}.`,
    `- animation.emphasis is one of: ${EMPHASIS_ANIMS}.`,
    `- animation.enterEasing is one of: ${EASINGS}.`,
    `- slide transitionIn is one of: ${SLIDE_TRANSITIONS}. Durations are in milliseconds.`,
    `- Scope: ${scopeRule}`,
    "- Keep good contrast, readable sizes, and a balanced layout. Stagger element enter delays for a polished feel.",
    "",
    "Current deck JSON (image data omitted):",
    JSON.stringify(deck),
    "",
    convo ? `Conversation so far:\n${convo}\n` : "",
    `User instruction: ${instruction}`,
    "",
    "Return ONLY valid JSON (no markdown, no code fences) of this exact shape:",
    '{"summary": "one short sentence on what you changed", "slides": [{"id": string, "name"?: string, "durationMs"?: number, "transitionIn"?: string, "transitionMs"?: number, "background"?: {"type","color","gradientFrom","gradientTo","gradientAngle","opacity"}, "elements": [{"id","type","x","y","width","height","rotation","opacity","zIndex","text"?,"fontSize"?,"color"?,"fontFamily"?,"fontWeight"?,"align"?,"lineHeight"?,"letterSpacing"?,"fit"?,"borderRadius"?,"shape"?,"fill"?,"stroke"?,"strokeWidth"?,"animation":{"enter","enterDurationMs","enterDelayMs","enterEasing","emphasis","emphasisDurationMs","exit","exitDurationMs"}}]}]}',
  ].join("\n");
}

export async function editDeck({ instruction, scope, targetSlideId, deck, history, model, images, resume } = {}) {
  if (!instruction || !String(instruction).trim()) throw new Error("Instruction is required");
  if (!deck || !Array.isArray(deck.slides)) throw new Error("Deck is required");
  const fullPrompt = buildDeckEditPrompt(String(instruction).trim(), scope, targetSlideId, deck, history);
  const { text, sessionId } = await runAgent({ prompt: fullPrompt, model, images, resume });
  return { ...stripEmoji(extractJson(text)), sessionId }; // { summary, slides, sessionId }
}

export async function editDeckStream({ instruction, scope, targetSlideId, deck, history, model, images, resume } = {}, onEvent) {
  if (!instruction || !String(instruction).trim()) throw new Error("Instruction is required");
  if (!deck || !Array.isArray(deck.slides)) throw new Error("Deck is required");
  const fullPrompt = buildDeckEditPrompt(String(instruction).trim(), scope, targetSlideId, deck, history);
  await runAgent({ prompt: fullPrompt, model, images, resume, onEvent });
}

// ---- Video Studio assistant (layer graph) ----------------------------------

// A video is SCENES; each scene has a background + an ordered list of LAYERS
// (text/image/video/shape/component). The assistant edits/adds/animates layers.
// Separate op (editTemplate) vibe-codes a component template's TSX.

const LAYER_SCHEMA = [
  "Each LAYER object:",
  '{ "id": string, "name": string, "type": "text"|"image"|"video"|"shape"|"component",',
  '  "width": number, "height": number, "startFrame"?: number, "endFrame"?: number,',
  '  "transform": { "x": V, "y": V, "scale": V, "rotation": V, "opacity": V } }',
  "plus per type:",
  '  text:  "text": string, "fontFamily": string, "fontSize": Vn, "color": Vc, "weight": "100".."900", "align": "left"|"center"|"right", "lineHeight": number, "letterSpacing": number',
  '  image: "fit": "cover"|"contain", "radius": number   (do NOT set "src")',
  '  video: "fit": "cover"|"contain", "trimStart": number, "volume": 0..1   (do NOT set "src")',
  '  shape: "shape": "rect"|"ellipse"|"line", "fill": Vc, "stroke": hex, "strokeWidth": number, "radius": number',
  '  component: "templateId": string (one of the available templates), "props": object (per that template propsSchema)',
  "Where:",
  "  x,y = layer box top-left in px (origin top-left). rotation in degrees about the box center. opacity 0..1.",
  '  V / Vn (a number) and Vc (a hex color) may each be a STATIC value OR an ANIMATED track:',
  '    { "keyframes": [ { "frame": int (scene-local, 0..durationInFrames), "value": number-or-hex, "easing": "linear"|"easeIn"|"easeOut"|"easeInOut"|"spring"|"backOut" } ] }',
  "  To animate something (move/fade/scale/recolor/pulse), output a keyframes track with >= 2 keyframes.",
];

function buildLayerEditPrompt(instruction, scope, targetSceneId, project, history, presets) {
  const convo = (Array.isArray(history) ? history.slice(-6) : [])
    .map((m) => `${String(m.role).toUpperCase()}: ${m.content}`)
    .join("\n");
  const templates = Array.isArray(project.templates) ? project.templates : [];
  const presetList = Array.isArray(presets) ? presets : [];
  const scopeRule =
    scope === "project"
      ? 'You MAY add, remove, reorder, and edit scenes. Return the FULL ordered array of scenes. Keep a scene by its existing "id"; CREATE a new scene with a brand-new unique "id". Each scene has a "background" and a "layers" array. If the user asks for N scenes, return exactly N.'
      : scope === "append"
      ? 'Generate ONLY brand-new scenes to ADD to the END of the video. Do NOT return or reference any existing scene. Give every new scene — and every layer inside it — a brand-new unique "id". The current video JSON is shown only for style/continuity context; never re-emit it. Each scene has a "durationInFrames", a "background", and a "layers" array. If the user asks for N scenes, return exactly N.'
      : `Edit ONLY the scene whose id is "${targetSceneId}". Return its FULL "layers" array (and "background" if changed). Keep each unchanged layer; preserve every layer's "id".`;
  const returnShape =
    scope === "project" || scope === "append"
      ? '{"summary": string, "scenes": [{"id": string, "durationInFrames"?: number, "transition"?: "none"|"fade"|"slide"|"wipe", "transitionDurationInFrames"?: number, "background"?: {"type":"solid"|"gradient"|"image","color":hex,"gradientFrom":hex,"gradientTo":hex,"gradientAngle":number}, "layers"?: [LAYER, ...], "presetId"?: string, "texts"?: string[]}]}'
      : '{"summary": string, "layers": [LAYER, ...], "background"?: {"type":"solid"|"gradient"|"image","color":hex,"gradientFrom":hex,"gradientTo":hex,"gradientAngle":number}}';
  return [
    "You are a senior motion designer editing a marketing video by directly manipulating its LAYER GRAPH.",
    `Project: fps=${project.fps}, dimensions ${project.width}x${project.height}. Frames are scene-local (0..durationInFrames).`,
    "",
    ...LAYER_SCHEMA,
    "",
    'TEMPLATE LIBRARY — reusable components you SHOULD prefer. Each: {id, name, tags, description, propsSchema}. To reuse one, add a layer of type "component" with its "templateId" and fill "props" per its propsSchema. Match the user\'s intent to a template by name/tags/description.',
    JSON.stringify(templates),
    "",
    ...(presetList.length && (scope === "project" || scope === "append")
      ? [
          'SCENE PRESETS — saved whole scenes you can reuse. Each: {id, name, tags, description, slots}. To reuse one, return a scene as {"presetId": "<id>", "texts": ["...", ...]} where "texts" replace its text slots IN ORDER (omit to keep defaults). Do NOT re-emit a preset\'s layers. Prefer a matching preset over building a scene from scratch.',
          JSON.stringify(presetList),
          "",
        ]
      : []),
    "Rules:",
    '- Preserve an existing layer\'s "id" when editing it; mint a brand-new unique "id" for a new layer. Layer order = paint order (later = on top).',
    '- NEVER set "src" on image/video layers or the background image — media is uploaded by the user. Reposition/animate existing media by its "id"; new media layers get no src.',
    "- Colors are hex strings. Keep good contrast and readable sizes; keep layers within the frame. No emojis.",
    "- To ANIMATE, output keyframe tracks (e.g. fade = opacity keyframes 0->1; move = x/y keyframes; pulse = scale keyframes up then down).",
    "- PREFER reusing a template from the library above as a `component` layer (pick the best match by name/tags/description and fill its props). Only build raw text/shape layers from scratch when no template reasonably fits.",
    `- Scope: ${scopeRule}`,
    "",
    "Current video JSON (media stripped; existing keyframes shown):",
    JSON.stringify({ fps: project.fps, width: project.width, height: project.height, scenes: project.scenes }),
    "",
    convo ? `Conversation so far:\n${convo}\n` : "",
    `User instruction: ${instruction}`,
    "",
    "Return ONLY valid JSON (no markdown, no code fences) of this exact shape:",
    returnShape,
  ].join("\n");
}

export async function editVideoProject({ instruction, scope, targetSceneId, project, history, model, images, resume, presets } = {}) {
  if (!instruction || !String(instruction).trim()) throw new Error("Instruction is required");
  if (!project || !Array.isArray(project.scenes)) throw new Error("Project is required");
  const fullPrompt = buildLayerEditPrompt(String(instruction).trim(), scope, targetSceneId, project, history, presets);
  const { text, sessionId } = await runAgent({ prompt: fullPrompt, model, images, resume });
  return { ...stripEmoji(extractJson(text)), sessionId }; // { summary, scenes|layers, background?, sessionId }
}

export async function editVideoProjectStream({ instruction, scope, targetSceneId, project, history, model, images, resume, presets } = {}, onEvent) {
  if (!instruction || !String(instruction).trim()) throw new Error("Instruction is required");
  if (!project || !Array.isArray(project.scenes)) throw new Error("Project is required");
  const fullPrompt = buildLayerEditPrompt(String(instruction).trim(), scope, targetSceneId, project, history, presets);
  await runAgent({ prompt: fullPrompt, model, images, resume, onEvent });
}

// ---- Template vibe-coding (AI-written Remotion TSX) -------------------------

const TEMPLATE_CONTRACT = [
  "STRICT CONTRACT for the template code (a TSX string):",
  "- NO import or require statements anywhere.",
  "- It MUST `export default` a React component, e.g. `const X = ({ props }) => { ... };\\nexport default X;`",
  "- Reference ONLY these in-scope identifiers (already provided — never import them):",
  "  React, useCurrentFrame, useVideoConfig, interpolate, interpolateColors, spring, Easing, random,",
  "  AbsoluteFill, Sequence, Series, Img, Audio, Video, staticFile, brand.",
  "- useCurrentFrame() -> current frame number. useVideoConfig() -> { fps, width, height, durationInFrames }.",
  "- interpolate(frame, [inputRange], [outputRange], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }).",
  "- spring({ frame, fps, config: { damping } }) returns 0..1 for entrance motion.",
  "- AbsoluteFill is a full-frame container; use it as the ROOT and fill the whole frame. Use inline style objects.",
  "- Img for images and Video for video clips (src comes from a prop). Guard media: render a placeholder when the prop is empty.",
  "- brand = { fontHeading, fontBody, colors: { primary, accent, dark, light, muted, success, warning }, radius }.",
  "- Read ALL dynamic content from props.<key> (e.g. props.title). Coerce numbers with Number(props.x).",
  "- Animate from the frame (springs / interpolations). Keep it tasteful, legible, well-contrasted.",
  "- NO network, NO eval, NO document/window/process, NO localStorage.",
].join("\n");

function buildTemplatePrompt(instruction, mode, template, history) {
  const convo = (Array.isArray(history) ? history.slice(-6) : [])
    .map((m) => `${String(m.role).toUpperCase()}: ${m.content}`)
    .join("\n");
  const existing =
    mode === "edit" && template
      ? `Current template to MODIFY (keep what works; apply the instruction):\nname: ${template.name}\npropsSchema: ${JSON.stringify(template.propsSchema)}\ncode:\n${template.code}`
      : "Create a brand-new template from scratch per the instruction.";
  return [
    "You write ONE Remotion video template as a self-contained React component (TSX string). It renders a single scene of a marketing video.",
    "",
    TEMPLATE_CONTRACT,
    "",
    "Also return:",
    "- propsSchema: an array describing EVERY prop the code reads. Each item: { key, type, label, default, and for number: min,max,step; for select: options:[...] }. type is one of text|longtext|color|number|image|video|select.",
    '- previewProps: an object with a sample value for every prop key (good-looking defaults; leave image/video props as "").',
    "",
    existing,
    "",
    convo ? `Conversation so far:\n${convo}\n` : "",
    `User instruction: ${instruction}`,
    "",
    "Return ONLY valid JSON (no markdown, no code fences) of this exact shape:",
    '{"summary": string, "template": {"name": string, "code": string, "propsSchema": [{"key": string, "type": string, "label": string, "default": string|number, "min"?: number, "max"?: number, "step"?: number, "options"?: string[]}], "previewProps": object}}',
  ].join("\n");
}

const FORBIDDEN_CODE =
  /\bimport\b|\brequire\s*\(|\bfetch\s*\(|\bXMLHttpRequest\b|\beval\s*\(|\bnew\s+Function\b|\bWebSocket\b|\bdocument\s*\.|\bwindow\s*\.|\bglobalThis\b|\bprocess\b|\blocalStorage\b/;

function validateTemplateCode(code) {
  if (!code || !String(code).trim()) throw new Error("The assistant returned empty template code.");
  if (FORBIDDEN_CODE.test(code)) throw new Error("Template code used a forbidden construct (imports, network, eval, or DOM/process globals).");
  if (!/export\s+default/.test(code)) throw new Error("Template code must `export default` a component.");
  try {
    sucraseTransform(code, { transforms: ["typescript", "jsx", "imports"], jsxRuntime: "classic", production: true });
  } catch (e) {
    throw new Error(`Template code does not parse: ${e?.message || e}`);
  }
}

export async function editTemplate({ instruction, mode, template, history, model, images, resume } = {}) {
  if (!instruction || !String(instruction).trim()) throw new Error("Instruction is required");
  const m = mode === "edit" ? "edit" : "create";
  if (m === "edit" && (!template || !template.code)) throw new Error("A template is required to edit");
  const fullPrompt = buildTemplatePrompt(String(instruction).trim(), m, template, history);
  const { text, sessionId } = await runAgent({ prompt: fullPrompt, model, images, resume });

  const parsed = extractJson(text);
  const tpl = parsed?.template ?? {};
  validateTemplateCode(tpl.code);
  // Strip emoji from text-ish fields only (NOT the code).
  return {
    summary: stripEmoji(String(parsed.summary ?? "Updated the template.")),
    template: {
      name: stripEmoji(String(tpl.name ?? template?.name ?? "Untitled template")),
      code: String(tpl.code),
      propsSchema: Array.isArray(tpl.propsSchema) ? tpl.propsSchema : [],
      previewProps: tpl.previewProps && typeof tpl.previewProps === "object" ? tpl.previewProps : {},
    },
    sessionId,
  };
}

export async function editTemplateStream({ instruction, mode, template, history, model, images, resume } = {}, onEvent) {
  if (!instruction || !String(instruction).trim()) throw new Error("Instruction is required");
  const m = mode === "edit" ? "edit" : "create";
  if (m === "edit" && (!template || !template.code)) throw new Error("A template is required to edit");
  const fullPrompt = buildTemplatePrompt(String(instruction).trim(), m, template, history);
  await runAgent({ prompt: fullPrompt, model, images, resume, onEvent });
}

// Suggest a handful of search/matching tags for a template from its name + code.
// Cheap single-shot; defaults to haiku. Returns { tags: string[] }.
export async function suggestTags({ name, code, summary, model } = {}) {
  const context = code
    ? `Template code (context only):\n${String(code).slice(0, 4000)}`
    : summary
    ? `Scene contents (context only):\n${String(summary).slice(0, 2000)}`
    : "";
  const prompt = [
    "Generate 3-6 short keyword tags for a marketing-video template or scene, used for search and AI matching.",
    "Each tag is a single lowercase word or short hyphenated phrase (e.g. intro, title, lower-third, cta, stat, quote, outro, logo, testimonial).",
    `Name: ${String(name || "Untitled")}`,
    context,
    "",
    'Return ONLY valid JSON (no markdown, no code fences): {"tags": ["...", "..."]}',
  ].filter(Boolean).join("\n");
  const { text } = await runAgent({ prompt, model });
  const data = extractJson(text);
  const tags = Array.isArray(data?.tags)
    ? [...new Set(data.tags.map((t) => String(t).toLowerCase().trim()).filter(Boolean))].slice(0, 8)
    : [];
  return { tags };
}

export function claudeStatus() {
  const credPath = join(homedir(), ".claude", ".credentials.json");
  const result = { loggedIn: false, subscriptionType: null };
  try {
    if (!existsSync(credPath)) return result;
    const parsed = JSON.parse(readFileSync(credPath, "utf-8"));
    const oauth = parsed?.claudeAiOauth;
    if (oauth && typeof oauth === "object") {
      result.loggedIn = Boolean(oauth.accessToken);
      result.subscriptionType = oauth.subscriptionType ?? null;
    }
  } catch {
    return { loggedIn: false, subscriptionType: null };
  }
  return result;
}
