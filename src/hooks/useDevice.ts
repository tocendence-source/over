import { useCallback, useEffect, useMemo, useState } from "react";
import {
  detectQuality,
  prefersReducedMotion,
  profileFor,
  readScenePref,
  writeScenePref,
  type Quality,
  type TierProfile,
} from "@/lib/performance";
import { sceneBus } from "@/lib/sceneBus";

/** Device capability + user scene preference, mirrored into the scene bus. */
export function useDevice() {
  const [quality, setQuality] = useState<Quality>(() => detectQuality());
  const [sceneOn, setSceneOn] = useState<boolean>(() => readScenePref());
  const [reduced, setReduced] = useState<boolean>(() => prefersReducedMotion());
  const [width, setWidth] = useState<number>(() => (typeof window === "undefined" ? 1440 : window.innerWidth));
  const [finePointer, setFinePointer] = useState<boolean>(
    () => typeof window !== "undefined" && (window.matchMedia?.("(pointer: fine)").matches ?? false),
  );

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => setReduced(mq.matches);
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(pointer: fine)");
    const onMq = () => setFinePointer(mq.matches);
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const effective = useMemo<Quality>(() => {
    if (!sceneOn || reduced || quality === "none") return "none";
    if (width < 700) return "low";
    if (width < 1024 && quality === "high") return "medium";
    return quality;
  }, [quality, reduced, sceneOn, width]);

  const profile = useMemo<TierProfile>(() => profileFor(effective), [effective]);

  useEffect(() => {
    sceneBus.quality = effective;
    sceneBus.enabled = effective !== "none";
    sceneBus.reduced = reduced;
    document.documentElement.dataset.motion = reduced || !sceneOn ? "reduced" : "full";
  }, [effective, reduced, sceneOn]);

  const toggleScene = useCallback(() => {
    setSceneOn((prev) => {
      const next = !prev;
      writeScenePref(next);
      return next;
    });
  }, []);

  /** Called by the render loop when frame times consistently exceed budget. */
  const degrade = useCallback(() => {
    setQuality((prev) => (prev === "high" ? "medium" : prev === "medium" ? "low" : prev));
  }, []);

  return { quality: effective, baseQuality: quality, profile, sceneOn, reduced, width, finePointer, toggleScene, degrade };
}
