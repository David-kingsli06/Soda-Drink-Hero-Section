"use client";

import { useState } from "react";
import { Hero } from "@/components/Hero";

export default function Home() {
  const [showSpacer, setShowSpacer] = useState<boolean>(false);

  return (
    <main className="w-full bg-[#0B1A2E] text-[#F5F7FA]">
      {/* 
        Hero fixed to viewport. Re-locks at frame 191 when scrolled back up from spacer.
      */}
      <Hero
        onHeroComplete={() => setShowSpacer(true)}
        isSpacerVisible={showSpacer}
      />

      {/* 
        Single empty spacer section below the hero with height 100vh.
        Rendered only after stage 5 finishes and lock is released on further downward gesture.
      */}
      {showSpacer && (
        <div className="relative">
          {/* Top placeholder offset so page content starts below the fixed hero */}
          <div className="w-full h-screen" aria-hidden="true" />
          {/* The 100vh spacer section scrolled into view */}
          <section
            id="spacer-section"
            className="w-full h-screen bg-[#07111E]"
            aria-label="Next content section"
          />
        </div>
      )}
    </main>
  );
}
