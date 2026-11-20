"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { TOTAL_FRAMES, INITIAL_FRAME } from "@/lib/stages";

interface FrameCanvasProps {
  targetFrame: number;
  isTransitioning: boolean;
  prefersReducedMotion: boolean;
  onFrameUpdate: (frameIndex: number) => void;
  onTransitionComplete: () => void;
  onFrameLoaded?: () => void;
  onLoadingProgress?: (progress: number) => void;
}

export function FrameCanvas({
  targetFrame,
  isTransitioning,
  prefersReducedMotion,
  onFrameUpdate,
  onTransitionComplete,
  onFrameLoaded,
  onLoadingProgress,
}: FrameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bitmapsRef = useRef<(ImageBitmap | null)[]>(new Array(TOTAL_FRAMES).fill(null));
  const [canvasVisible, setCanvasVisible] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  const currentFrameRef = useRef<number>(INITIAL_FRAME);
  const animFrameIdRef = useRef<number | null>(null);

  const getFramePath = useCallback((index: number) => {
    const padded = String(index).padStart(3, "0");
    return `/frames/frame_${padded}.webp`;
  }, []);

  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const bitmap = bitmapsRef.current[frameIndex];
    if (!bitmap) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imgWidth = bitmap.width;
    const imgHeight = bitmap.height;

    const imgRatio = imgWidth / imgHeight;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawWidth: number;
    let drawHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (canvasRatio > imgRatio) {
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / imgRatio;
      offsetX = 0;
      offsetY = (canvasHeight - drawHeight) / 2;
    } else {
      drawHeight = canvasHeight;
      drawWidth = canvasHeight * imgRatio;
      offsetX = (canvasWidth - drawWidth) / 2;
      offsetY = 0;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(bitmap, offsetX, offsetY, drawWidth, drawHeight);
    currentFrameRef.current = frameIndex;
  }, []);

  const updateCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    const targetWidth = Math.round(width * dpr);
    const targetHeight = Math.round(height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      drawFrame(currentFrameRef.current);
    }
  }, [drawFrame]);

  useEffect(() => {
    updateCanvasDimensions();
    window.addEventListener("resize", updateCanvasDimensions);
    return () => {
      window.removeEventListener("resize", updateCanvasDimensions);
    };
  }, [updateCanvasDimensions]);

  // Decode frame 191 (initial landing frame) first, draw immediately, then decode all remaining frames
  useEffect(() => {
    let isCancelled = false;

    async function loadAllFrames() {
      try {
        // 1. Fetch & decode initial frame 191 first
        const respInitial = await fetch(getFramePath(INITIAL_FRAME));
        const blobInitial = await respInitial.blob();
        if (isCancelled) return;
        const bitmapInitial = await createImageBitmap(blobInitial);
        if (isCancelled) return;

        bitmapsRef.current[INITIAL_FRAME] = bitmapInitial;
        updateCanvasDimensions();
        drawFrame(INITIAL_FRAME);

        setCanvasVisible(true);
        if (onFrameLoaded) onFrameLoaded();

        // 2. Decode remaining frames into ImageBitmaps (from 190 down to 0)
        let loadedCount = 1;
        const remainingIndices: number[] = [];
        for (let i = TOTAL_FRAMES - 1; i >= 0; i--) {
          if (i !== INITIAL_FRAME) remainingIndices.push(i);
        }

        const batchSize = 10;
        for (let i = 0; i < remainingIndices.length; i += batchSize) {
          if (isCancelled) break;
          const batch = remainingIndices.slice(i, i + batchSize).map((frameIdx) =>
            (async () => {
              try {
                const resp = await fetch(getFramePath(frameIdx));
                const blob = await resp.blob();
                if (isCancelled) return;
                const bm = await createImageBitmap(blob);
                if (isCancelled) return;
                bitmapsRef.current[frameIdx] = bm;
              } catch (e) {
                console.warn(`Failed to decode frame ${frameIdx}:`, e);
              } finally {
                loadedCount++;
                const progress = loadedCount / TOTAL_FRAMES;
                setLoadProgress(progress);
                if (onLoadingProgress) onLoadingProgress(progress);
              }
            })()
          );
          await Promise.all(batch);
        }
      } catch (err) {
        console.error("Frame loading error:", err);
      }
    }

    loadAllFrames();

    return () => {
      isCancelled = true;
    };
  }, [drawFrame, getFramePath, onFrameLoaded, onLoadingProgress, updateCanvasDimensions]);

  // Real-time 24 fps playback driven by time mapping with monotonic ease-in-out
  useEffect(() => {
    if (!isTransitioning) return;

    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }

    const startFrame = currentFrameRef.current;
    const endFrame = targetFrame;
    const frameDelta = endFrame - startFrame;
    const absFrameDelta = Math.abs(frameDelta);

    if (absFrameDelta === 0) {
      onTransitionComplete();
      return;
    }

    if (prefersReducedMotion) {
      drawFrame(endFrame);
      onFrameUpdate(endFrame);
      onTransitionComplete();
      return;
    }

    const durationMs = (absFrameDelta / 24) * 1000;
    const startTime = performance.now();
    let lastDrawnFrame = -1;

    // Smooth monotonic ease
    const easeInOutMonotonic = (t: number): number => {
      return t * t * (3 - 2 * t);
    };

    const tick = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, Math.max(0, elapsed / durationMs));
      const easedProgress = easeInOutMonotonic(progress);

      const computedFrame =
        frameDelta > 0
          ? Math.floor(startFrame + easedProgress * absFrameDelta)
          : Math.ceil(startFrame + easedProgress * frameDelta);

      const clampedFrame =
        frameDelta > 0
          ? Math.min(endFrame, Math.max(startFrame, computedFrame))
          : Math.max(endFrame, Math.min(startFrame, computedFrame));

      if (clampedFrame !== lastDrawnFrame) {
        lastDrawnFrame = clampedFrame;
        drawFrame(clampedFrame);
        onFrameUpdate(clampedFrame);
      }

      if (progress < 1) {
        animFrameIdRef.current = requestAnimationFrame(tick);
      } else {
        drawFrame(endFrame);
        onFrameUpdate(endFrame);
        onTransitionComplete();
      }
    };

    animFrameIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [
    isTransitioning,
    targetFrame,
    prefersReducedMotion,
    drawFrame,
    onFrameUpdate,
    onTransitionComplete,
  ]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none bg-[#0B1A2E]">
      {loadProgress < 1 && (
        <div
          className="absolute top-0 left-0 h-[2px] bg-[#FF5A1F] z-50 transition-all duration-150 ease-out"
          style={{ width: `${Math.round(loadProgress * 100)}%` }}
          aria-hidden="true"
        />
      )}

      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Unbranded aluminum soda can floats, zooms, opens, pours, and rotates against a dark blue smoky background."
        className="w-full h-full object-cover transition-opacity duration-600 ease-out"
        style={{
          opacity: canvasVisible ? 1 : 0,
        }}
      />
    </div>
  );
}
