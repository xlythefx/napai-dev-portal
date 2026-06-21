import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { Slideshow, slideTransitionSpec } from "@/lib/slideshow";
import SlideRenderer from "./SlideRenderer";

interface DeckPlayerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deck: Slideshow;
}

const DeckPlayer = ({ open, onOpenChange, deck }: DeckPlayerProps) => {
  const slides = deck.slides;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [cycle, setCycle] = useState(0); // bump to remount/replay current slide
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  // Reset when (re)opened.
  useEffect(() => {
    if (open) {
      setIndex(0);
      setPlaying(true);
      setCycle((c) => c + 1);
    }
  }, [open]);

  // Fit the stage to the available area.
  useLayoutEffect(() => {
    if (!open) return;
    const el = stageRef.current;
    if (!el) return;
    const compute = () => {
      const availW = el.clientWidth;
      const availH = el.clientHeight;
      if (availW <= 0 || availH <= 0) return;
      setScale(Math.min(availW / deck.settings.width, availH / deck.settings.height));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, deck.settings.width, deck.settings.height]);

  // Advance timer.
  useEffect(() => {
    if (!open || !playing) return;
    const slide = slides[index];
    if (!slide) return;
    const t = window.setTimeout(() => {
      if (index < slides.length - 1) {
        setIndex((i) => i + 1);
        setCycle((c) => c + 1);
      } else {
        setPlaying(false);
      }
    }, slide.durationMs + slide.transitionMs);
    return () => window.clearTimeout(t);
  }, [open, playing, index, cycle, slides]);

  const current = slides[index];
  if (!current) return null;

  const go = (next: number) => {
    setIndex(Math.max(0, Math.min(slides.length - 1, next)));
    setCycle((c) => c + 1);
  };

  const restart = () => {
    setIndex(0);
    setCycle((c) => c + 1);
    setPlaying(true);
  };

  const togglePlay = () => {
    if (!playing && index === slides.length - 1) {
      restart();
    } else {
      setPlaying((p) => !p);
      setCycle((c) => c + 1);
    }
  };

  const transition = slideTransitionSpec(current.transitionIn, current.transitionMs);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-[95vw] flex-col gap-3 p-4">
        <div ref={stageRef} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black/90">
          <div style={{ width: deck.settings.width * scale, height: deck.settings.height * scale, position: "relative", overflow: "hidden" }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${current.id}-${cycle}`}
                style={{ position: "absolute", inset: 0 }}
                initial={transition.initial}
                animate={transition.animate}
                exit={transition.exit}
                transition={transition.transition}
              >
                <SlideRenderer slide={current} settings={deck.settings} scale={scale} mode="play" playKey={cycle} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Segment progress */}
        <div className="flex gap-1">
          {slides.map((s, i) => (
            <div key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary"
                style={{ width: i < index ? "100%" : i === index ? "100%" : "0%", transition: "none" }}
              />
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button size="icon" variant="ghost" onClick={() => go(index - 1)} disabled={index === 0}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button size="icon" onClick={togglePlay} className="rounded-full">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={() => go(index + 1)} disabled={index === slides.length - 1}>
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={restart}>
            <RotateCcw className="h-5 w-5" />
          </Button>
          <span className="ml-2 text-sm text-muted-foreground">
            {index + 1} / {slides.length}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeckPlayer;
