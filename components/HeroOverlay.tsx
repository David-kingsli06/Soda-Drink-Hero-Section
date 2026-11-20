"use client";

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import gsap from "gsap";
import { Stage, STAGES, TOTAL_STAGES } from "@/lib/stages";

export interface HeroOverlayHandle {
  updateProgress: (frame: number) => void;
  checkWordmarkTightening: (frame: number) => void;
}

interface HeroOverlayProps {
  activeStage: Stage;
  prefersReducedMotion: boolean;
}

export const HeroOverlay = forwardRef<HeroOverlayHandle, HeroOverlayProps>(
  function HeroOverlay({ activeStage, prefersReducedMotion }, ref) {
    const [displayedStage, setDisplayedStage] = useState<Stage>(activeStage);
    const headlineWordsRef = useRef<(HTMLSpanElement | null)[]>([]);
    const headlineWrapperRef = useRef<HTMLHeadingElement | null>(null);
    const accentLineRef = useRef<HTMLDivElement | null>(null);
    const sublineRef = useRef<HTMLParagraphElement | null>(null);
    const counterNumberRef = useRef<HTMLSpanElement | null>(null);
    const activeTimelineRef = useRef<gsap.core.Timeline | null>(null);
    const progressBarRef = useRef<HTMLDivElement | null>(null);

    const wordmarkTightenedRef = useRef<boolean>(false);

    // Dynamic counter: "01 / 04" up to "04 / 04" based on array index + 1
    const stageNumPadded = String(displayedStage.id).padStart(2, "0");
    const totalStagesPadded = String(TOTAL_STAGES).padStart(2, "0");

    const words = displayedStage.headline.split(" ");
    // Stage 1 (Index 0) is "One Energy." (wordmark)
    // Stage 2 (Index 1) is "Break the seal." (diagonal clip-path wipe)
    // Stage 3 (Index 2) is "Up close." (scale settle)
    // Stage 4 (Index 3) is "Charged."
    const isWordmarkStage = displayedStage.id === 1;
    const isClipPathStage = displayedStage.id === 2;
    const isScaleSettleStage = displayedStage.id === 3;

    // Direct DOM progress updates on high-frequency frame ticks (bypasses React render overhead)
    // Scrolling down from 191 to 0 represents 0% to 100% of hero journey: (191 - frame) / 191
    useImperativeHandle(ref, () => ({
      updateProgress: (frame: number) => {
        if (progressBarRef.current) {
          const pct = Math.min(100, Math.max(0, ((191 - frame) / 191) * 100));
          progressBarRef.current.style.width = `${pct}%`;
        }
      },
      checkWordmarkTightening: (frame: number) => {
        if (displayedStage.id !== 1 || prefersReducedMotion) return;
        const wrapper = headlineWrapperRef.current;
        if (!wrapper) return;

        if (frame >= 176 && !wordmarkTightenedRef.current) {
          wordmarkTightenedRef.current = true;
          gsap.to(wrapper, {
            letterSpacing: "-0.01em",
            opacity: 1,
            duration: 0.9,
            ease: "cubic-bezier(0.22, 1, 0.36, 1)",
          });
        } else if (frame < 176 && wordmarkTightenedRef.current) {
          wordmarkTightenedRef.current = false;
          gsap.to(wrapper, {
            letterSpacing: "0.4em",
            opacity: 0,
            duration: 0.9,
            ease: "cubic-bezier(0.22, 1, 0.36, 1)",
          });
        }
      },
    }));

    // Cubic Bezier Evaluators
    const easeEntrance = useCallback((t: number): number => {
      let startT = 0, endT = 1, guessedT = t;
      for (let i = 0; i < 8; i++) {
        const currentX =
          3 * (1 - guessedT) * (1 - guessedT) * guessedT * 0.22 +
          3 * (1 - guessedT) * guessedT * guessedT * 1 +
          guessedT * guessedT * guessedT;
        if (Math.abs(currentX - t) < 0.001) break;
        if (currentX < t) startT = guessedT;
        else endT = guessedT;
        guessedT = (startT + endT) / 2;
      }
      return (
        3 * (1 - guessedT) * (1 - guessedT) * guessedT * 1 +
        3 * (1 - guessedT) * guessedT * guessedT * 0.36 +
        guessedT * guessedT * guessedT
      );
    }, []);

    const easeWipe = useCallback((t: number): number => {
      let startT = 0, endT = 1, guessedT = t;
      for (let i = 0; i < 8; i++) {
        const currentX =
          3 * (1 - guessedT) * (1 - guessedT) * guessedT * 0.65 +
          3 * (1 - guessedT) * guessedT * guessedT * 0.35 +
          guessedT * guessedT * guessedT;
        if (Math.abs(currentX - t) < 0.001) break;
        if (currentX < t) startT = guessedT;
        else endT = guessedT;
        guessedT = (startT + endT) / 2;
      }
      return (
        3 * (1 - guessedT) * (1 - guessedT) * guessedT * 0 +
        3 * (1 - guessedT) * guessedT * guessedT * 1 +
        guessedT * guessedT * guessedT
      );
    }, []);

    // Exit Animation when activeStage changes
    useEffect(() => {
      if (activeStage.id === displayedStage.id) return;

      if (prefersReducedMotion) {
        setDisplayedStage(activeStage);
        return;
      }

      if (activeTimelineRef.current) {
        activeTimelineRef.current.kill();
      }

      const validWords = headlineWordsRef.current.filter(Boolean);
      const exitTl = gsap.timeline({
        onComplete: () => {
          setDisplayedStage(activeStage);
        },
      });

      if (validWords.length > 0) {
        exitTl.to(
          [...validWords].reverse(),
          {
            yPercent: 110,
            duration: 0.2,
            ease: "power2.in",
          },
          0
        );
      }

      if (accentLineRef.current) {
        exitTl.to(
          accentLineRef.current,
          {
            scaleX: 0,
            duration: 0.2,
            ease: "power2.in",
          },
          0
        );
      }

      if (sublineRef.current) {
        exitTl.to(
          sublineRef.current,
          {
            opacity: 0,
            y: -8,
            duration: 0.2,
            ease: "power2.in",
          },
          0
        );
      }

      if (displayedStage.id === 2 && headlineWrapperRef.current) {
        exitTl.to(
          headlineWrapperRef.current,
          {
            clipPath: "polygon(0 0, 0 0, 0 100%, 0 100%)",
            duration: 0.3,
            ease: easeWipe,
          },
          0
        );
      }
    }, [activeStage, displayedStage.id, prefersReducedMotion, easeWipe]);

    // Entrance Animation when displayedStage updates
    useEffect(() => {
      wordmarkTightenedRef.current = false;

      if (prefersReducedMotion) {
        headlineWordsRef.current.forEach((el) => {
          if (el) {
            el.style.transform = "none";
            el.style.opacity = "1";
          }
        });
        if (accentLineRef.current) {
          accentLineRef.current.style.transform = "none";
          accentLineRef.current.style.opacity = "1";
        }
        if (sublineRef.current) {
          sublineRef.current.style.transform = "none";
          sublineRef.current.style.opacity = "1";
        }
        if (headlineWrapperRef.current) {
          headlineWrapperRef.current.style.clipPath = "none";
          headlineWrapperRef.current.style.transform = "none";
          headlineWrapperRef.current.style.letterSpacing = "-0.01em";
          headlineWrapperRef.current.style.opacity = "1";
        }
        return;
      }

      if (activeTimelineRef.current) {
        activeTimelineRef.current.kill();
      }

      const tl = gsap.timeline();
      activeTimelineRef.current = tl;

      const validWords = headlineWordsRef.current.filter(Boolean);
      const wrapper = headlineWrapperRef.current;

      gsap.set(validWords, { yPercent: 110, opacity: 1 });
      if (accentLineRef.current) {
        gsap.set(accentLineRef.current, { scaleX: 0, opacity: 1, transformOrigin: "left center" });
      }
      if (sublineRef.current) {
        gsap.set(sublineRef.current, { y: 12, opacity: 0 });
      }

      if (wrapper) {
        gsap.set(wrapper, {
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
          scale: 1,
          letterSpacing: "-0.01em",
          opacity: 1,
        });
      }

      let headlineStartOffset = 0;

      // Clip-path wipe on "Break the seal." (Stage 2)
      if (isClipPathStage && wrapper) {
        gsap.set(wrapper, { clipPath: "polygon(0 0, 0 0, 0 100%, 0 100%)" });
        tl.to(
          wrapper,
          {
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
            duration: 0.45,
            ease: easeWipe,
          },
          0
        );
        headlineStartOffset = 0.45;
      }

      // Scale settle on "Up close." (Stage 3)
      if (isScaleSettleStage && wrapper) {
        gsap.set(wrapper, { scale: 1.06, transformOrigin: "left center" });
        tl.to(
          wrapper,
          {
            scale: 1,
            duration: 0.65,
            ease: easeEntrance,
          },
          headlineStartOffset
        );
      }

      // Wordmark "One Energy." (Stage 1)
      if (isWordmarkStage && wrapper) {
        // Starts tight on initial load (since frame is 191 >= 176)
        gsap.set(wrapper, {
          letterSpacing: "-0.01em",
          opacity: 1,
        });
        wordmarkTightenedRef.current = true;
      }

      // Word-Mask Rise
      tl.to(
        validWords,
        {
          yPercent: 0,
          duration: 0.55,
          ease: easeEntrance,
          stagger: 0.06,
        },
        headlineStartOffset
      );

      // Accent Line
      if (accentLineRef.current) {
        tl.to(
          accentLineRef.current,
          {
            scaleX: 1,
            duration: 0.35,
            ease: "power2.out",
          },
          headlineStartOffset
        );
      }

      // Subline
      if (sublineRef.current) {
        tl.to(
          sublineRef.current,
          {
            y: 0,
            opacity: 1,
            duration: 0.45,
            ease: "power2.out",
          },
          headlineStartOffset + 0.15
        );
      }

      // Stage Counter Slide-up
      if (counterNumberRef.current) {
        gsap.fromTo(
          counterNumberRef.current,
          { y: 12, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.25, ease: "power2.out" }
        );
      }

      return () => {
        tl.kill();
      };
    }, [displayedStage, prefersReducedMotion, isWordmarkStage, isClipPathStage, isScaleSettleStage, easeEntrance, easeWipe]);

    const HeadlineTag = displayedStage.id === 1 ? "h1" : "h2";

    return (
      <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between">
        {/* Top Bar with Brand, Four Stage Dots, and Stage Counter ("01 / 04") */}
        <header className="w-full flex items-center justify-between px-[6vw] py-8">
          <div className="flex items-center gap-2">
            <span className="font-condensed text-2xl font-extrabold uppercase tracking-widest text-[#F5F7FA]">
              One Energy
            </span>
            <span className="inline-block w-2 h-2 rounded-full bg-[#FF5A1F]" />
          </div>

          <div className="flex items-center gap-4">
            {/* Four 8px Stage Dots */}
            <div className="flex items-center gap-2" aria-hidden="true">
              {STAGES.map((s) => {
                const isActive = s.id === displayedStage.id;
                return (
                  <span
                    key={s.id}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      isActive
                        ? "bg-[#FF5A1F] scale-100"
                        : "border border-[#F5F7FA]/40 bg-transparent scale-90"
                    }`}
                  />
                );
              })}
            </div>

            {/* Stage Counter: Barlow Regular */}
            <div
              className="font-regular text-base md:text-[18px] leading-[1.5] overflow-hidden flex items-center"
              aria-hidden="true"
            >
              <span
                ref={counterNumberRef}
                className="text-[#FF5A1F] tabular-nums inline-block font-medium"
                style={{ willChange: "transform, opacity" }}
              >
                {stageNumPadded}
              </span>
              <span className="text-[#F5F7FA]/50 font-normal ml-1"> / {totalStagesPadded}</span>
            </div>
          </div>
        </header>

        {/* Main Text Content Area */}
        <div className="flex-1 flex flex-col justify-center px-[6vw] w-full max-w-[100vw] relative">
          <div
            className="absolute -inset-x-8 -inset-y-12 bg-gradient-to-r from-[#0B1A2E]/90 via-[#0B1A2E]/60 to-transparent pointer-events-none -z-10 blur-xl"
            aria-hidden="true"
          />

          <div className="w-full lg:w-[34vw] min-w-[280px] max-w-[640px]">
            {/* Headline from array entry only */}
            <HeadlineTag
              ref={headlineWrapperRef}
              className={`font-condensed font-extrabold uppercase text-[#F5F7FA] leading-[0.95] mb-4 flex flex-wrap gap-x-3 sm:gap-x-4 ${
                isWordmarkStage
                  ? "text-[64px] lg:text-[96px]"
                  : "text-[56px] lg:text-[88px] tracking-[-0.01em]"
              }`}
              style={{ willChange: "transform, opacity, clip-path, letter-spacing" }}
            >
              {words.map((word, index) => (
                <span key={index} className="inline-block overflow-hidden py-1">
                  <span
                    ref={(el) => {
                      headlineWordsRef.current[index] = el;
                    }}
                    className="inline-block"
                    style={{ willChange: "transform, opacity" }}
                  >
                    {word}
                  </span>
                </span>
              ))}
            </HeadlineTag>

            {/* 40 px Accent line */}
            <div className="mb-5 flex items-center">
              <div
                ref={accentLineRef}
                className="w-10 h-[2px] bg-[#FF5A1F]"
                aria-hidden="true"
                style={{ willChange: "transform, opacity" }}
              />
            </div>

            {/* Subline from array entry */}
            <p
              ref={sublineRef}
              className="font-regular text-base md:text-[18px] leading-[1.5] text-[#F5F7FA]/85 font-normal max-w-md"
              style={{ willChange: "transform, opacity" }}
            >
              {displayedStage.subline}
            </p>
          </div>
        </div>

        {/* Progress Line */}
        <div className="w-full h-[2px] bg-transparent relative overflow-hidden" aria-hidden="true">
          <div
            ref={progressBarRef}
            className="h-full bg-[#FF5A1F] will-change-[width]"
            style={{ width: "0%" }}
          />
        </div>

        {/* Accessible Polite Live Region */}
        <div
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          Stage {displayedStage.id} of {TOTAL_STAGES}: {displayedStage.headline} - {displayedStage.subline}
        </div>
      </div>
    );
  }
);
