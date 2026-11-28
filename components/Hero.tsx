"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { STAGES, Stage, TOTAL_STAGES, INITIAL_FRAME } from "@/lib/stages";
import { FrameCanvas } from "./FrameCanvas";
import { HeroOverlay, HeroOverlayHandle } from "./HeroOverlay";
import { useReducedMotion } from "@/lib/useReducedMotion";

interface HeroProps {
  onHeroComplete?: () => void;
  isSpacerVisible?: boolean;
}

export function Hero({ onHeroComplete, isSpacerVisible }: HeroProps) {
  // Opens on Stage 1 ("One Energy.", index 0)
  const [activeStageId, setActiveStageId] = useState<number>(1);
  const [targetFrame, setTargetFrame] = useState<number>(INITIAL_FRAME);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HeroOverlayHandle | null>(null);
  const currentFrameRef = useRef<number>(INITIAL_FRAME);
  const lockUntilRef = useRef<number>(0);
  const prefersReducedMotion = useReducedMotion();

  const activeStage = STAGES.find((s) => s.id === activeStageId) || STAGES[0];

  // Map frame to stage based on reverse scroll boundaries:
  // Stage 1 (One Energy.): 191 down to 152
  // Stage 2 (Break the seal.): 151 down to 56
  // Stage 3 (Up close.): 55 down to 24
  // Stage 4 (Charged.): 23 down to 0
  const getStageForFrame = useCallback((frame: number): Stage => {
    if (frame >= 152) return STAGES[0]; // One Energy.
    if (frame >= 56) return STAGES[1];  // Break the seal.
    if (frame >= 24) return STAGES[2];  // Up close.
    return STAGES[3];                  // Charged.
  }, []);

  const handleFrameUpdate = useCallback(
    (frameIndex: number) => {
      currentFrameRef.current = frameIndex;

      // Update progress line & check wordmark directly
      if (overlayRef.current) {
        overlayRef.current.updateProgress(frameIndex);
        overlayRef.current.checkWordmarkTightening(frameIndex);
      }

      // Only re-render when stage changes
      const stage = getStageForFrame(frameIndex);
      setActiveStageId((prevId) => (prevId !== stage.id ? stage.id : prevId));
    },
    [getStageForFrame]
  );

  useEffect(() => {
    if (isLocked) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLocked]);

  const changeStage = useCallback(
    (direction: 1 | -1) => {
      const now = performance.now();
      if (now < lockUntilRef.current || isTransitioning) {
        return false;
      }

      // Forward gesture (direction 1 = scroll down) at Stage 4 (Charged.):
      // Release lock and scroll to spacer section below
      if (activeStageId === TOTAL_STAGES && direction === 1) {
        if (isLocked) {
          setIsLocked(false);
          document.body.style.overflow = "";
          if (onHeroComplete) {
            onHeroComplete();
          }
          setTimeout(() => {
            const spacer = document.getElementById("spacer-section");
            if (spacer) {
              spacer.scrollIntoView({ behavior: "smooth" });
            }
          }, 50);
        }
        return false;
      }

      // Upward gesture at Stage 1 (One Energy.): do nothing (top of the page)
      if (activeStageId === 1 && direction === -1) {
        return true;
      }

      const nextStageId = activeStageId + direction;
      if (nextStageId < 1 || nextStageId > TOTAL_STAGES) {
        return false;
      }

      const nextStage = STAGES.find((s) => s.id === nextStageId);
      if (!nextStage) return false;

      // Scrolling down (direction 1) moves to next stage's restFrame/exitFrame
      // Scrolling up (direction -1) moves back to previous stage's entryFrame/restFrame
      const destFrame = direction === 1 ? nextStage.restFrame : nextStage.entryFrame;
      const frameDelta = Math.abs(destFrame - currentFrameRef.current);
      const durationMs = (frameDelta / 24) * 1000;

      // Ignore input until transition completes plus 150 ms
      lockUntilRef.current = now + durationMs + 150;

      setTargetFrame(destFrame);
      setIsTransitioning(true);
      return true;
    },
    [activeStageId, isTransitioning, isLocked, onHeroComplete]
  );

  const handleTransitionComplete = useCallback(() => {
    setIsTransitioning(false);
  }, []);

  // Re-lock at frame 0 (Charged.) when user scrolls back up from spacer
  useEffect(() => {
    if (isLocked || !isSpacerVisible) return;

    const handleWindowScroll = () => {
      if (window.scrollY <= 10) {
        setIsLocked(true);
        setActiveStageId(4);
        currentFrameRef.current = 0;
        setTargetFrame(0);
        if (overlayRef.current) {
          overlayRef.current.updateProgress(0);
        }
      }
    };

    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleWindowScroll);
    };
  }, [isLocked, isSpacerVisible]);

  // Window Wheel Listener
  useEffect(() => {
    if (!isLocked) return;

    let accumulatedDeltaY = 0;
    const DELTA_THRESHOLD = 25;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // leave browser zoom alone
      e.preventDefault();

      accumulatedDeltaY += e.deltaY;
      if (Math.abs(accumulatedDeltaY) < DELTA_THRESHOLD) return;

      const direction: 1 | -1 = accumulatedDeltaY > 0 ? 1 : -1;
      accumulatedDeltaY = 0;
      changeStage(direction);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, [isLocked, changeStage]);

  // Window Touchmove Listener
  useEffect(() => {
    if (!isLocked) return;

    let touchStartY = 0;
    const SWIPE_THRESHOLD = 40;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) return; // leave pinch zoom alone
      e.preventDefault();

      const currentY = e.touches[0].clientY;
      const diffY = touchStartY - currentY;

      if (Math.abs(diffY) > SWIPE_THRESHOLD) {
        const direction: 1 | -1 = diffY > 0 ? 1 : -1;
        touchStartY = currentY;
        changeStage(direction);
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isLocked, changeStage]);

  // Window Keydown Listener
  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Space on a focused control must activate it, not change stage
      if (e.key === " " && (e.target as Element).closest?.("button, a, input, textarea, select")) return;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        changeStage(1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        changeStage(-1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLocked, changeStage]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      aria-label="One Energy Interactive Stage Showcase"
      className="fixed top-0 left-0 w-screen h-[100dvh] h-screen bg-[#0B1A2E] overflow-hidden z-10 outline-none select-none"
    >
      <FrameCanvas
        targetFrame={targetFrame}
        isTransitioning={isTransitioning}
        prefersReducedMotion={prefersReducedMotion}
        onFrameUpdate={handleFrameUpdate}
        onTransitionComplete={handleTransitionComplete}
      />
      <HeroOverlay
        ref={overlayRef}
        activeStage={activeStage}
        prefersReducedMotion={prefersReducedMotion}
      />
    </div>
  );
}
