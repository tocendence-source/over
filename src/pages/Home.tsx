import { useEffect } from "react";
import { Hero } from "@/components/hero/Hero";
import { NetworkSection } from "@/components/sections/NetworkSection";
import { SystemsSection } from "@/components/systems/SystemIndex";
import { MethodologyNarrative } from "@/components/methodology/MethodologyNarrative";
import { OperatorPanel } from "@/components/operator/OperatorPanel";
import { ContactPanel } from "@/components/sections/ContactPanel";

export function Home({ focus, motion, reduced, onToggleMotion }: { focus?: string; motion: boolean; reduced: boolean; onToggleMotion: () => void }) {
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(focus ?? "entry");
      target?.scrollIntoView({ behavior: document.documentElement.dataset.motion === "reduced" || !focus ? "instant" : "smooth", block: "start" });
      if (focus && target) {
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [focus]);
  return <>
    <Hero motion={motion} reduced={reduced} onToggleMotion={onToggleMotion} />
    <NetworkSection />
    <SystemsSection />
    <MethodologyNarrative />
    <OperatorPanel />
    <ContactPanel />
  </>;
}