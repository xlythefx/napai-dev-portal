// The starter template library shipped with every new project. Each template is
// real Remotion component code (imported raw from a .tpl file) plus a propsSchema
// describing its editable inputs and previewProps for the library loop preview.
// `newProject()` deep-copies these so per-project edits never mutate the seeds.

import kineticTitleCode from "./seed/kinetic-title.tpl?raw";
import lowerThirdCode from "./seed/lower-third.tpl?raw";
import imageRevealCode from "./seed/image-reveal.tpl?raw";
import videoClipCode from "./seed/video-clip.tpl?raw";
import type { Template } from "./types";

export const SEED_TEMPLATES: Template[] = [
  {
    id: "tpl_kinetic_title",
    name: "Kinetic Title",
    tags: ["intro", "title", "headline", "kinetic", "opener"],
    description: "Animated bold headline + subtitle over a gradient — great for intros and openers.",
    code: kineticTitleCode,
    propsSchema: [
      { key: "title", type: "text", label: "Title", default: "Big Bold Headline" },
      { key: "subtitle", type: "text", label: "Subtitle", default: "Your supporting line goes here" },
      { key: "bgFrom", type: "color", label: "Gradient from", default: "#6366f1" },
      { key: "bgTo", type: "color", label: "Gradient to", default: "#ec4899" },
      { key: "color", type: "color", label: "Text color", default: "#ffffff" },
      { key: "size", type: "number", label: "Title size", default: 120, min: 40, max: 320, step: 2 },
    ],
    previewProps: {
      title: "Summer Sale",
      subtitle: "Up to 50% off everything",
      bgFrom: "#6366f1",
      bgTo: "#ec4899",
      color: "#ffffff",
      size: 120,
    },
  },
  {
    id: "tpl_lower_third",
    name: "Lower Third",
    tags: ["lower-third", "name", "caption", "credit", "speaker"],
    description: "Name/role lower-third callout with an accent bar.",
    code: lowerThirdCode,
    propsSchema: [
      { key: "name", type: "text", label: "Name", default: "Jane Doe" },
      { key: "role", type: "text", label: "Role", default: "Founder & CEO" },
      { key: "accent", type: "color", label: "Accent", default: "#6366f1" },
      {
        key: "position",
        type: "select",
        label: "Position",
        default: "bottom-left",
        options: ["bottom-left", "bottom-center"],
      },
    ],
    previewProps: {
      name: "Jane Doe",
      role: "Founder & CEO",
      accent: "#6366f1",
      position: "bottom-left",
    },
  },
  {
    id: "tpl_image_reveal",
    name: "Image Reveal",
    tags: ["image", "reveal", "photo", "showcase", "ken-burns"],
    description: "Full-frame image with a Ken Burns zoom and a caption overlay.",
    code: imageRevealCode,
    propsSchema: [
      { key: "image", type: "image", label: "Image", default: "" },
      { key: "caption", type: "text", label: "Caption", default: "A moment worth sharing" },
      { key: "zoom", type: "number", label: "Ken Burns zoom", default: 1.15, min: 1, max: 1.6, step: 0.05 },
      { key: "overlayOpacity", type: "number", label: "Overlay", default: 0.6, min: 0, max: 1, step: 0.05 },
    ],
    previewProps: {
      image: "",
      caption: "A moment worth sharing",
      zoom: 1.15,
      overlayOpacity: 0.6,
    },
  },
  {
    id: "tpl_video_clip",
    name: "Video Clip",
    tags: ["video", "b-roll", "clip", "footage"],
    description: "Full-frame video clip with a caption.",
    code: videoClipCode,
    propsSchema: [
      { key: "video", type: "video", label: "Video clip", default: "" },
      { key: "caption", type: "text", label: "Caption", default: "Watch this" },
      { key: "captionColor", type: "color", label: "Caption color", default: "#ffffff" },
      { key: "trimStart", type: "number", label: "Trim start (frames)", default: 0, min: 0, max: 600, step: 1 },
    ],
    previewProps: {
      video: "",
      caption: "Watch this",
      captionColor: "#ffffff",
      trimStart: 0,
    },
  },
];
