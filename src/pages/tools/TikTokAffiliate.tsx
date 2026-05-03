import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Image as ImageIcon,
  User,
  Package,
  Play,
  Sparkles,
  Video,
  Download,
  Link2,
  AlertCircle,
  Landmark,
  Film,
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  Pin,
  PinOff,
  Layers,
  Palette,
  Shirt,
  Footprints,
  Smartphone,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { generateEditImage, generateAffiliateVideo, stitchVideos } from "@/lib/tiktokApi";

type StepStatus = "pending" | "running" | "done" | "failed";

type WorkflowStep = {
  id: string;
  label: string;
  status: StepStatus;
  sceneIndex?: number;
};

type ImageFile = {
  file: File;
  preview: string;
};

type SceneIncludes = {
  model: boolean;
  background: boolean;
  productBackground: boolean;
  products: boolean;
};

const DEFAULT_SCENE_INCLUDES: SceneIncludes = {
  model: true,
  background: true,
  productBackground: true,
  products: true,
};

type PromoteCategory = "clothes" | "makeup" | "shoes" | "electronics";

const CATEGORY_PROMPTS: Record<PromoteCategory, string[]> = {
  clothes: [
    "Model wearing the product, full body shot, no speaking, displaying the clothing. Clean minimal background.",
    "Product only, close-up on the clothing item, clean white or neutral background. No model visible.",
    "Model from side angle wearing the product, three-quarter view. Professional affiliate style.",
    "Model detail shot showing fabric and fit of the product. Soft natural lighting.",
  ],
  makeup: [
    "Model showing makeup product application, close-up on face, clean studio lighting. Beauty affiliate style.",
    "Product only, cosmetics on clean surface, flat lay or angled shot. No model visible.",
    "Before/after or swatch style, product in use. Soft glamour lighting.",
    "Product detail shot, packaging and texture. Minimal background.",
  ],
  shoes: [
    "Model wearing the shoes, full body or feet shot, no speaking. Clean minimal background.",
    "Shoes only, product shot on clean surface. Side and top angles. No model visible.",
    "Model walking or posing in shoes, three-quarter view. Lifestyle affiliate style.",
    "Close-up on shoe details, sole, material. Professional product photography.",
  ],
  electronics: [
    "Model or hands holding the device, showing key features. Clean tech backdrop.",
    "Product only, device on neutral surface. Multiple angles. No person visible.",
    "Screen or display focus, device in use. Minimal distracting elements.",
    "Product detail shot, ports, design. Tech unboxing style.",
  ],
};

const PIN_STORAGE_KEY = "tiktok_affiliate_pins";

type PinnedOutputs = Record<string, { imageUrl?: string; videoUrl?: string }>;

function loadPins(): PinnedOutputs {
  try {
    const raw = localStorage.getItem(PIN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function savePins(pins: PinnedOutputs) {
  try {
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pins));
  } catch {
    // ignore quota exceeded etc.
  }
}

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const TikTokAffiliate = () => {
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [promoteCategory, setPromoteCategory] = useState<PromoteCategory>("clothes");
  const [modelImage, setModelImage] = useState<ImageFile | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<ImageFile | null>(null);
  const [productBackgroundImage, setProductBackgroundImage] = useState<ImageFile | null>(null);
  const [productImages, setProductImages] = useState<ImageFile[]>([]);
  const [sceneCount, setSceneCount] = useState(2);
  const [scenePrompts, setScenePrompts] = useState<string[]>(CATEGORY_PROMPTS.clothes.slice(0, 2));
  const [sceneIncludes, setSceneIncludes] = useState<SceneIncludes[]>(() =>
    CATEGORY_PROMPTS.clothes.slice(0, 2).map(() => ({ ...DEFAULT_SCENE_INCLUDES }))
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");
  const [sceneResults, setSceneResults] = useState<
    { imageUrl: string; videoUrl: string; prompt: string }[]
  >([]);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [lastError, setLastError] = useState<{ message: string; logs?: string[] } | null>(null);
  const [pinnedOutputs, setPinnedOutputs] = useState<PinnedOutputs>(() => loadPins());

  useEffect(() => {
    setPinnedOutputs(loadPins());
  }, []);

  const togglePinScene = (sceneIndex: number, imageUrl: string, videoUrl: string) => {
    const editKey = `scene_${sceneIndex}_edit`;
    const videoKey = `scene_${sceneIndex}_video`;
    const isPinned = pinnedOutputs[editKey]?.imageUrl === imageUrl;
    setPinnedOutputs((prev) => {
      const next = { ...prev };
      if (isPinned) {
        delete next[editKey];
        delete next[videoKey];
      } else {
        next[editKey] = { imageUrl };
        next[videoKey] = { videoUrl };
      }
      savePins(next);
      return next;
    });
  };

  const isScenePinned = (sceneIndex: number, imageUrl: string) =>
    pinnedOutputs[`scene_${sceneIndex}_edit`]?.imageUrl === imageUrl;

  const togglePinStitch = (videoUrl: string) => {
    const key = "stitch";
    setPinnedOutputs((prev) => {
      const next = { ...prev };
      if (next[key]?.videoUrl === videoUrl) {
        delete next[key];
      } else {
        next[key] = { videoUrl };
      }
      savePins(next);
      return next;
    });
  };

  const isPinnedStitch = (videoUrl: string) => pinnedOutputs.stitch?.videoUrl === videoUrl;

  const applyCategoryPrompts = (cat: PromoteCategory) => {
    const prompts = CATEGORY_PROMPTS[cat];
    setScenePrompts((prev) => {
      const next = [...prev];
      for (let i = 0; i < next.length; i++) {
        next[i] = prompts[i] ?? prompts[0] ?? "";
      }
      return next;
    });
  };

  const handleCategorySelect = (cat: PromoteCategory) => {
    setPromoteCategory(cat);
    applyCategoryPrompts(cat);
  };

  const updateStep = (id: string, status: StepStatus) => {
    setWorkflowSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  };

  const buildWorkflowSteps = (count: number): WorkflowStep[] => {
    const steps: WorkflowStep[] = [];
    for (let i = 0; i < count; i++) {
      steps.push({ id: `scene-${i}-edit`, label: `Scene ${i + 1}: Edit image`, status: "pending", sceneIndex: i });
      steps.push({ id: `scene-${i}-video`, label: `Scene ${i + 1}: Generate video`, status: "pending", sceneIndex: i });
    }
    steps.push({ id: "stitch", label: "Stitch final video", status: "pending" });
    return steps;
  };

  const handleModelUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      if (modelImage?.preview) URL.revokeObjectURL(modelImage.preview);
      setModelImage({ file, preview: URL.createObjectURL(file) });
    }
  }, [modelImage?.preview]);

  const handleBackgroundUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      if (backgroundImage?.preview) URL.revokeObjectURL(backgroundImage.preview);
      setBackgroundImage({ file, preview: URL.createObjectURL(file) });
    }
  }, [backgroundImage?.preview]);

  const handleProductBackgroundUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      if (productBackgroundImage?.preview) URL.revokeObjectURL(productBackgroundImage.preview);
      setProductBackgroundImage({ file, preview: URL.createObjectURL(file) });
    }
  }, [productBackgroundImage?.preview]);

  const handleProductUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const images = files
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setProductImages((prev) => [...prev, ...images].slice(0, 4));
  }, []);

  const removeModelImage = () => {
    if (modelImage?.preview) URL.revokeObjectURL(modelImage.preview);
    setModelImage(null);
  };

  const removeBackgroundImage = () => {
    if (backgroundImage?.preview) URL.revokeObjectURL(backgroundImage.preview);
    setBackgroundImage(null);
  };

  const removeProductBackgroundImage = () => {
    if (productBackgroundImage?.preview) URL.revokeObjectURL(productBackgroundImage.preview);
    setProductBackgroundImage(null);
  };

  const removeProductImage = (index: number) => {
    setProductImages((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  };

  const handleSceneCountChange = (n: number) => {
    const prompts = CATEGORY_PROMPTS[promoteCategory];
    setSceneCount(n);
    setScenePrompts((prev) => {
      const next = [...prev];
      while (next.length < n) next.push(prompts[next.length] ?? prompts[0] ?? "");
      return next.slice(0, n);
    });
    setSceneIncludes((prev) => {
      const next = [...prev];
      while (next.length < n) next.push({ ...DEFAULT_SCENE_INCLUDES });
      return next.slice(0, n);
    });
  };

  const handleGenerate = async () => {
    if (!modelImage || !backgroundImage) return;
    setIsGenerating(true);
    setSceneResults([]);
    setFinalVideoUrl(null);
    setLastError(null);
    setWorkflowSteps(buildWorkflowSteps(sceneCount));

    try {
      const modelUri = await fileToDataUri(modelImage.file);
      const bgUri = await fileToDataUri(backgroundImage.file);
      const prodBgUri = productBackgroundImage ? await fileToDataUri(productBackgroundImage.file) : null;
      const productUris = await Promise.all(productImages.map((p) => fileToDataUri(p.file)));

      const results: { imageUrl: string; videoUrl: string; prompt: string }[] = [];

      const fallbackPrompts = CATEGORY_PROMPTS[promoteCategory];
      for (let i = 0; i < sceneCount; i++) {
        const prompt = (scenePrompts[i]?.trim() || fallbackPrompts[i] || fallbackPrompts[0]) ?? "";
        const inc = sceneIncludes[i] ?? { ...DEFAULT_SCENE_INCLUDES };

        const imageUrls: string[] = [];
        if (inc.model && modelUri) imageUrls.push(modelUri);
        if (inc.background && bgUri) imageUrls.push(bgUri);
        if (inc.productBackground && prodBgUri) imageUrls.push(prodBgUri);
        if (inc.products && productUris.length > 0) imageUrls.push(...productUris);

        if (imageUrls.length === 0) {
          throw new Error(
            `Scene ${i + 1}: At least one image must be included. Enable at least one toggle with an uploaded image.`
          );
        }

        let image_url: string;
        let video_url: string;

        const pinnedEdit = pinnedOutputs[`scene_${i}_edit`];
        const pinnedVideo = pinnedOutputs[`scene_${i}_video`];

        if (pinnedEdit?.imageUrl) {
          setGenerationStep(`Scene ${i + 1}/${sceneCount}: Using pinned edit...`);
          updateStep(`scene-${i}-edit`, "running");
          image_url = pinnedEdit.imageUrl;
          updateStep(`scene-${i}-edit`, "done");
        } else {
          setGenerationStep(`Scene ${i + 1}/${sceneCount}: Editing image...`);
          updateStep(`scene-${i}-edit`, "running");
          const editRes = await generateEditImage({
            imageUrls,
            prompt,
            aspectRatio: "9:16",
          });
          image_url = editRes.image_url;
          updateStep(`scene-${i}-edit`, "done");
        }

        if (pinnedVideo?.videoUrl) {
          setGenerationStep(`Scene ${i + 1}/${sceneCount}: Using pinned video...`);
          updateStep(`scene-${i}-video`, "running");
          video_url = pinnedVideo.videoUrl;
          updateStep(`scene-${i}-video`, "done");
        } else {
          setGenerationStep(`Scene ${i + 1}/${sceneCount}: Generating video (5s)...`);
          updateStep(`scene-${i}-video`, "running");
          const vidRes = await generateAffiliateVideo({
            imageUrl: image_url,
            prompt: "Smooth cinematic motion, professional affiliate style, subtle movement.",
            duration: "5",
            aspectRatio: "9:16",
          });
          video_url = vidRes.video_url;
          updateStep(`scene-${i}-video`, "done");
        }

        results.push({ imageUrl: image_url, videoUrl: video_url, prompt });
        setSceneResults([...results]);
      }

      const pinnedStitch = pinnedOutputs.stitch?.videoUrl;
      const allScenesMatchPins = results.every((r, idx) => pinnedOutputs[`scene_${idx}_video`]?.videoUrl === r.videoUrl);
      if (pinnedStitch && allScenesMatchPins) {
        setGenerationStep("Using pinned stitch...");
        updateStep("stitch", "running");
        setFinalVideoUrl(pinnedStitch);
        updateStep("stitch", "done");
      } else {
        setGenerationStep("Stitching final video...");
        updateStep("stitch", "running");
        const { video_url } = await stitchVideos(results.map((r) => r.videoUrl));
        updateStep("stitch", "done");
        setFinalVideoUrl(video_url);
      }

      setGenerationStep("");
      setCurrentPage(5);
      toast({ title: "Done!", description: `${sceneCount} scene(s) + final video ready.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      const logs = err && typeof err === "object" && "logs" in err ? (err as { logs?: string[] }).logs : undefined;
      setLastError({ message: msg, logs });
      setGenerationStep("");
      setWorkflowSteps((prev) =>
        prev.map((s) => (s.status === "running" ? { ...s, status: "failed" as StepStatus } : s))
      );
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const sceneHasValidInclude = (i: number) => {
    const inc = sceneIncludes[i] ?? { ...DEFAULT_SCENE_INCLUDES };
    return (
      (inc.model && !!modelImage) ||
      (inc.background && !!backgroundImage) ||
      (inc.productBackground && !!productBackgroundImage) ||
      (inc.products && productImages.length > 0)
    );
  };
  const allScenesValid = Array.from({ length: sceneCount }, (_, i) => sceneHasValidInclude(i)).every(Boolean);
  const canProceedFromStep1 = !!modelImage;
  const canProceedFromStep2 = !!backgroundImage;
  const canProceedFromStep3 = true; // Product bg and products are optional
  const canGenerate = modelImage && backgroundImage && !isGenerating && allScenesValid;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-28 pb-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <Link
              to="/tools"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Tools
            </Link>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">AI Agent</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
              TikTok Affiliate AI Agent
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Multi-scene flow: Model + background + products. Nano Banana Edit for each scene, then Kling video (~5s per scene). Optimized for clothes/affiliate.
            </p>
          </motion.div>

          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={currentPage === 1 ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(1)}
            >
              1. Model
            </Button>
            <Button
              variant={currentPage === 2 ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(2)}
            >
              2. Background
            </Button>
            <Button
              variant={currentPage === 3 ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(3)}
            >
              3. Products
            </Button>
            <Button
              variant={currentPage === 4 ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(4)}
              disabled={!modelImage || !backgroundImage}
            >
              4. Promote + Scenes
            </Button>
            <Button
              variant={currentPage === 5 ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(5)}
              disabled={sceneResults.length === 0 && !finalVideoUrl}
            >
              5. Output
            </Button>
          </div>

          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="grid lg:grid-cols-5 gap-8"
          >
            {currentPage === 1 && (
            <div className="lg:col-span-5 max-w-2xl space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Model Image
                  </CardTitle>
                  <CardDescription>Required. Person displaying the product (no speaking)</CardDescription>
                </CardHeader>
                <CardContent>
                  <label
                    className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                      modelImage
                        ? "border-primary/50 bg-primary/5"
                        : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    {modelImage ? (
                      <div className="relative w-full h-full p-4">
                        <img src={modelImage.preview} alt="Model" className="w-full h-full object-contain rounded-lg" />
                        <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={(e) => { e.preventDefault(); removeModelImage(); }}>Remove</Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Upload model</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleModelUpload} />
                  </label>
                </CardContent>
              </Card>
              <Button
                size="lg"
                className="w-full h-14 text-lg rounded-full"
                disabled={!canProceedFromStep1}
                onClick={() => setCurrentPage(2)}
              >
                Next: Background
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
            )}

            {currentPage === 2 && (
            <div className="lg:col-span-5 max-w-2xl space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Landmark className="w-5 h-5" />
                    Background
                  </CardTitle>
                  <CardDescription>Required. Scene background for composition</CardDescription>
                </CardHeader>
                <CardContent>
                  <label
                    className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                      backgroundImage
                        ? "border-primary/50 bg-primary/5"
                        : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    {backgroundImage ? (
                      <div className="relative w-full h-full p-4">
                        <img src={backgroundImage.preview} alt="Background" className="w-full h-full object-contain rounded-lg" />
                        <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={(e) => { e.preventDefault(); removeBackgroundImage(); }}>Remove</Button>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Upload background</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleBackgroundUpload} />
                  </label>
                </CardContent>
              </Card>
              <Button
                size="lg"
                className="w-full h-14 text-lg rounded-full"
                disabled={!canProceedFromStep2}
                onClick={() => setCurrentPage(3)}
              >
                Next: Products
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
            )}

            {currentPage === 3 && (
            <div className="lg:col-span-5 max-w-2xl space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    Product Background (optional)
                  </CardTitle>
                  <CardDescription>Backdrop for product-only shots (e.g. white surface, studio setup)</CardDescription>
                </CardHeader>
                <CardContent>
                  <label
                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50`}
                  >
                    {productBackgroundImage ? (
                      <div className="relative w-full h-full p-4">
                        <img src={productBackgroundImage.preview} alt="Product background" className="w-full h-full object-contain rounded-lg" />
                        <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={(e) => { e.preventDefault(); removeProductBackgroundImage(); }}>Remove</Button>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Upload product background</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleProductBackgroundUpload} />
                  </label>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Products (optional, 1–4)
                  </CardTitle>
                  <CardDescription>Clothes, shirts, etc. for affiliate</CardDescription>
                </CardHeader>
                <CardContent>
                  <label className="flex flex-col items-center justify-center w-full min-h-[80px] border-2 border-dashed rounded-xl cursor-pointer py-4 border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50">
                    <span className="text-sm text-muted-foreground">{productImages.length}/4 products</span>
                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleProductUpload} />
                  </label>
                  {productImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {productImages.map((img, i) => (
                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                          <img src={img.preview} alt={`Product ${i + 1}`} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeProductImage(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Button
                size="lg"
                className="w-full h-14 text-lg rounded-full"
                disabled={!canProceedFromStep3}
                onClick={() => setCurrentPage(4)}
              >
                Next: Promote + Scenes
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
            )}

            {currentPage === 4 && (
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    What do you want to promote?
                  </CardTitle>
                  <CardDescription>Choose a category — prompts update in real time below</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={promoteCategory === "clothes" ? "default" : "outline"}
                      size="sm"
                      className="h-auto py-3 flex flex-col gap-1"
                      onClick={() => handleCategorySelect("clothes")}
                    >
                      <Shirt className="w-5 h-5" />
                      Clothes
                    </Button>
                    <Button
                      variant={promoteCategory === "makeup" ? "default" : "outline"}
                      size="sm"
                      className="h-auto py-3 flex flex-col gap-1"
                      onClick={() => handleCategorySelect("makeup")}
                    >
                      <Palette className="w-5 h-5" />
                      Make up
                    </Button>
                    <Button
                      variant={promoteCategory === "shoes" ? "default" : "outline"}
                      size="sm"
                      className="h-auto py-3 flex flex-col gap-1"
                      onClick={() => handleCategorySelect("shoes")}
                    >
                      <Footprints className="w-5 h-5" />
                      Shoes
                    </Button>
                    <Button
                      variant={promoteCategory === "electronics" ? "default" : "outline"}
                      size="sm"
                      className="h-auto py-3 flex flex-col gap-1"
                      onClick={() => handleCategorySelect("electronics")}
                    >
                      <Smartphone className="w-5 h-5" />
                      Electronics
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Film className="w-5 h-5" />
                    Scenes (2–4)
                  </CardTitle>
                  <CardDescription>Per scene ~5s video. Individual prompts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    {[2, 3, 4].map((n) => (
                      <Button
                        key={n}
                        variant={sceneCount === n ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSceneCountChange(n)}
                      >
                        {n} scenes
                      </Button>
                    ))}
                  </div>
                  {scenePrompts.slice(0, sceneCount).map((p, i) => {
                    const inc = sceneIncludes[i] ?? { ...DEFAULT_SCENE_INCLUDES };
                    return (
                      <div key={i} className="space-y-3">
                        <label className="text-xs font-medium text-muted-foreground">Scene {i + 1}</label>
                        <Textarea
                          value={p}
                          onChange={(e) => {
                            const next = [...scenePrompts];
                            next[i] = e.target.value;
                            setScenePrompts(next);
                          }}
                          placeholder={CATEGORY_PROMPTS[promoteCategory][i]}
                          rows={2}
                          className="mt-1 resize-none"
                        />
                        <div className="flex flex-wrap gap-4 text-xs">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Switch
                              checked={inc.model}
                              disabled={!modelImage}
                              onCheckedChange={(checked) => {
                                const next = [...sceneIncludes];
                                next[i] = { ...(next[i] ?? { ...DEFAULT_SCENE_INCLUDES }), model: checked };
                                setSceneIncludes(next);
                              }}
                            />
                            <span className={!modelImage ? "text-muted-foreground/60" : ""}>Model</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Switch
                              checked={inc.background}
                              disabled={!backgroundImage}
                              onCheckedChange={(checked) => {
                                const next = [...sceneIncludes];
                                next[i] = { ...(next[i] ?? { ...DEFAULT_SCENE_INCLUDES }), background: checked };
                                setSceneIncludes(next);
                              }}
                            />
                            <span className={!backgroundImage ? "text-muted-foreground/60" : ""}>Background</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Switch
                              checked={inc.productBackground}
                              disabled={!productBackgroundImage}
                              onCheckedChange={(checked) => {
                                const next = [...sceneIncludes];
                                next[i] = { ...(next[i] ?? { ...DEFAULT_SCENE_INCLUDES }), productBackground: checked };
                                setSceneIncludes(next);
                              }}
                            />
                            <span className={!productBackgroundImage ? "text-muted-foreground/60" : ""}>Product bg</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Switch
                              checked={inc.products}
                              disabled={productImages.length === 0}
                              onCheckedChange={(checked) => {
                                const next = [...sceneIncludes];
                                next[i] = { ...(next[i] ?? { ...DEFAULT_SCENE_INCLUDES }), products: checked };
                                setSceneIncludes(next);
                              }}
                            />
                            <span className={productImages.length === 0 ? "text-muted-foreground/60" : ""}>Products</span>
                          </label>
                        </div>
                        {!sceneHasValidInclude(i) && (
                          <p className="text-xs text-amber-600">Scene {i + 1}: Enable at least one toggle with an uploaded image</p>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Button
                size="lg"
                className="w-full h-14 text-lg rounded-full"
                disabled={!canGenerate}
                onClick={handleGenerate}
              >
                {isGenerating ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-2"
                    />
                    {generationStep || "Generating..."}
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Generate Multi-Scene Video
                  </>
                )}
              </Button>
            </div>
            )}

            {(currentPage === 4 || currentPage === 5) && (
            <div className={`space-y-6 ${currentPage === 5 ? "lg:col-span-5" : "lg:col-span-3"}`}>
              <Card>
                <CardHeader>
                  <CardTitle>Output</CardTitle>
                  <CardDescription>
                    {sceneResults.length > 0
                      ? `${sceneResults.length} scene(s) generated`
                      : "Scene videos and links will appear here"}
                    {Object.keys(pinnedOutputs).length > 0 && (
                      <span className="block mt-1 text-primary/80">
                        {Object.keys(pinnedOutputs).length} pinned — will skip API calls to save credits.{" "}
                        <button
                          type="button"
                          className="underline hover:no-underline text-xs"
                          onClick={() => {
                            setPinnedOutputs({});
                            savePins({});
                            toast({ title: "Pins cleared" });
                          }}
                        >
                          Unpin all
                        </button>
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {workflowSteps.length > 0 && (
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs font-medium text-muted-foreground mb-3">Workflow</p>
                      <div className="space-y-2">
                        {workflowSteps.map((step) => (
                          <div key={step.id} className="flex items-center gap-2 text-sm">
                            {step.status === "pending" && <Circle className="w-4 h-4 text-muted-foreground/50" />}
                            {step.status === "running" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                            {step.status === "done" && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                            {step.status === "failed" && <XCircle className="w-4 h-4 text-destructive" />}
                            <span className={step.status === "failed" ? "text-destructive" : step.status === "done" ? "text-muted-foreground" : ""}>
                              {step.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {sceneResults.map((scene, i) => (
                    <div key={i} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Scene {i + 1}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          title={isScenePinned(i, scene.imageUrl) ? "Unpin scene (use credits on next run)" : "Pin scene (skip API, save credits)"}
                          onClick={() => togglePinScene(i, scene.imageUrl, scene.videoUrl)}
                        >
                          {isScenePinned(i, scene.imageUrl) ? (
                            <Pin className="w-4 h-4 text-primary fill-primary" />
                          ) : (
                            <PinOff className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="ml-1 text-xs">{isScenePinned(i, scene.imageUrl) ? "Pinned" : "Pin"}</span>
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{scene.prompt}</p>
                      <div className="aspect-[9/16] max-h-[300px] rounded-lg overflow-hidden bg-muted/30">
                        <video src={scene.videoUrl} controls className="w-full h-full object-contain" playsInline />
                      </div>
                      <div className="rounded bg-muted/50 p-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          <Link2 className="w-3 h-3" /> Video link
                        </p>
                        <a href={scene.videoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all block">
                          {scene.videoUrl}
                        </a>
                      </div>
                      <a href={scene.videoUrl} download={`scene-${i + 1}.mp4`}>
                        <Button variant="outline" size="sm" className="w-full">
                          <Download className="w-4 h-4 mr-2" />
                          Download Scene {i + 1}
                        </Button>
                      </a>
                    </div>
                  ))}

                  {finalVideoUrl && (
                    <div className="rounded-lg border-2 border-primary/50 bg-primary/5 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <Film className="w-5 h-5" />
                          Final Stitched Video
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title={isPinnedStitch(finalVideoUrl) ? "Unpin stitch" : "Pin stitch (skip re-stitch on next run)"}
                          onClick={() => togglePinStitch(finalVideoUrl)}
                        >
                          {isPinnedStitch(finalVideoUrl) ? (
                            <Pin className="w-4 h-4 text-primary fill-primary" />
                          ) : (
                            <PinOff className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      <div className="aspect-[9/16] max-h-[300px] rounded-lg overflow-hidden bg-muted/30">
                        <video src={finalVideoUrl} controls className="w-full h-full object-contain" playsInline />
                      </div>
                      <div className="rounded bg-muted/50 p-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          <Link2 className="w-3 h-3" /> Final video link
                        </p>
                        <a href={finalVideoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all block">
                          {finalVideoUrl}
                        </a>
                      </div>
                      <a href={finalVideoUrl} download="final-stitched.mp4">
                        <Button variant="default" size="sm" className="w-full">
                          <Download className="w-4 h-4 mr-2" />
                          Download Final Video
                        </Button>
                      </a>
                    </div>
                  )}

                  {sceneResults.length === 0 && !lastError && (
                    <div className="aspect-[9/16] max-h-[400px] mx-auto rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Video className="w-16 h-16 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Upload model + configure scenes</p>
                        <p className="text-xs mt-1">Nano Banana Edit + Kling</p>
                      </div>
                    </div>
                  )}

                  {lastError && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                      <p className="text-sm font-medium text-destructive flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {lastError.message}
                      </p>
                      {lastError.logs && lastError.logs.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Logs</p>
                          <pre className="text-xs bg-muted/50 rounded p-3 overflow-x-auto max-h-32 overflow-y-auto font-mono whitespace-pre-wrap break-words">
                            {lastError.logs.join("\n")}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            )}
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default TikTokAffiliate;
