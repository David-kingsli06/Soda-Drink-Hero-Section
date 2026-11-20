# Prompt to Build "One Energy" Interactive Stage-by-Stage Hero

This document contains the complete, production-ready master prompt to generate this exact project from scratch.

---

```markdown
Build a full-screen, stage-by-stage hero for "One Energy", an energy drink, using an image sequence of 192 WebP frames (numbered frame_000.webp to frame_191.webp, 1920x1080) extracted from an 8-second video at 24 fps. Each scroll gesture advances exactly one stage, like slides, rather than continuous scrubbing. Keep the energy high but controlled: sharp, clean, cinematic, with no bouncing, overshoot, or playful motion.

DESIGN & PALETTE
- Taste: Palette: background #0B1A2E (deep navy), text #F5F7FA (off-white), accent #FF5A1F (ember orange) for progress line, counter, and active dots. Mood is bold, athletic, and energetic. A soft navy radial/linear gradient sits behind text to guarantee WCAG AA contrast (>4.5:1). Do not use text-shadow.
- Typography: Headlines in Barlow Condensed ExtraBold, uppercase, letter spacing -0.01em, line height 0.95 (88px desktop, 56px mobile; wordmark at 96px desktop, 64px mobile). Sublines and stage counter in Barlow Regular, 18px on desktop, 16px on mobile, line height 1.5.
- Layout: Desktop (1024px+): text in left column (left 6vw, width 34vw, vertically centered), leaving the right 60% for the can. Mobile (<768px): text in top 35% of viewport. 8px spacing increments, side margins >= 6vw.

STAGE MODEL (lib/stages.ts)
The hero opens at frame 191 at Stage 1, and down-scroll gestures advance in reverse frame order:
1. Stage 1 (Index 0): name "One Energy.", entryFrame 191, exitFrame 152, restFrame 191, subline "One can. Full power." (Wordmark stage)
2. Stage 2 (Index 1): name "Break the seal.", entryFrame 151, exitFrame 56, restFrame 56, subline "Pop it open and feel the rush." (Opening, pour, and rotation)
3. Stage 3 (Index 2): name "Up close.", entryFrame 55, exitFrame 24, restFrame 24, subline "Every detail built for the moment." (Close-up detail)
4. Stage 4 (Index 3): name "Charged.", entryFrame 23, exitFrame 0, restFrame 0, subline "Full energy, ready to launch." (Floating unbranded can rest position)
- Counter displays array index + 1 ("01 / 04" up to "04 / 04"), with four 8px indicator dots (active dot #FF5A1F, inactive outlined in #F5F7FA at 40% opacity).
- No stage names or copy should be hardcoded in UI components; all labels come directly from the stage array.

HERO CONTAINER & SCROLL LOCK
- The hero is fixed (top: 0, left: 0, width: 100vw, height: 100dvh/100vh fallback, overflow: hidden, z-index: 10).
- The body has overflow: hidden during stages 1 to 4. Native page scrolling is prevented with preventDefault on wheel, touchmove, and keyboard navigation (ArrowDown, PageDown, Space, ArrowUp, PageUp).
- One wheel gesture or swipe advances exactly one stage. Upward gestures go back one stage. Upward gesture at stage 1 does nothing.
- Input is ignored until the transition finishes plus 150 ms.
- At Stage 4 (frame 0), an additional downward gesture releases the lock, restores body overflow, and smoothly scrolls to an empty 100vh spacer section below. Scrolling back up to the top re-locks the hero at frame 0.

SMOOTH 24 FPS PLAYBACK (Zero-Hitch Architecture)
- Decode all 192 frames once into ImageBitmap objects before playback (frame 191 first for instant initial paint, followed by frames 190 down to 0 in background batches). Do not decode or create Image elements during playback.
- Play at the native 24 fps: transition duration is exactly (abs(endFrame - startFrame) / 24) seconds.
- Single requestAnimationFrame loop tracking elapsed time with monotonic smoothstep ease (3*t^2 - 2*t^3), ensuring no micro-stutter or backtracking.
- Draw to canvas with cover-fit logic, imageSmoothingQuality = "high", and DPR capped at [1, 2]. Set canvas backing store once on mount and window resize.
- Decouple high-frequency frame ticks from React state: update the bottom 2px progress bar (#FF5A1F) and wordmark tightening checks directly via an imperative DOM ref (useImperativeHandle). Only trigger React re-renders when crossing an actual stage boundary.

TYPOGRAPHY & ANIMATION CHOREOGRAPHY (GSAP)
- Headline Word-Mask Rise: Each word sits in an overflow-hidden span and rises from translateY 110% to 0 over 550 ms with cubic-bezier(0.22, 1, 0.36, 1), staggered by 60 ms. On exit, words drop back down in reverse order over 200 ms.
- Accent Rule: A 40px #FF5A1F line under each headline scales from scaleX 0 to 1 over 350 ms (transform-origin: left), and scales back to 0 over 200 ms on exit.
- Subline: Fades from opacity 0 and translateY 12px to 0 over 450 ms, starting 150 ms after headline begins.
- Stage 2 Clip-Path Wipe ("Break the seal."): Diagonal clip-path wipe from polygon(0 0, 0 0, 0 100%, 0 100%) to polygon(0 0, 100% 0, 100% 100%, 0 100%) over 450 ms with cubic-bezier(0.65, 0, 0.35, 1) before word-mask rise; reverses on exit over 300 ms.
- Stage 3 Scale Settle ("Up close."): Starts at scale 1.06 and eases to 1 over 650 ms with cubic-bezier(0.22, 1, 0.36, 1).
- Stage 1 Wordmark ("One Energy."): Starts wide at letter-spacing 0.4em and tightens to -0.01em with opacity 1 over 900 ms when frame reaches 176.
- Stage Counter: Active number slides up with a 250 ms fade while "/ 04" remains fixed.
- Accessibility: prefers-reduced-motion skips frame playback and transforms, crossfading text with opacity only while keeping progress line and dots. aria-live="polite" announces each stage change.

TECHNICAL STACK
- Next.js 15+ (App Router), TypeScript (strict mode), Tailwind CSS v4.
- GSAP + @gsap/react for typography choreography.
- Next Google Fonts: Barlow Condensed & Barlow.
- WebP sequence located in /public/frames/frame_000.webp through frame_191.webp.
```
