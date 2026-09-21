import { useEffect, useRef, useState } from "react";
import { clamp } from "@/lib/motion";
import { sceneBus } from "@/lib/sceneBus";

/** Global pointer tracking in normalised device space, written to the scene bus. */
export function usePointerTracking() {
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || sceneBus.reduced) return;
      sceneBus.pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
      sceneBus.pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
    };
    const onLeave = () => {
      sceneBus.pointer.tx = 0;
      sceneBus.pointer.ty = 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, []);
}

/** Document scroll progress, mirrored into the scene bus. */
export function useScrollTracking() {
  useEffect(() => {
    let frame: number | null = null;
    const update = () => {
      frame = null;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      sceneBus.scrollPx = window.scrollY;
      sceneBus.scroll = max > 0 ? clamp(window.scrollY / max) : 0;
      sceneBus.viewport.w = window.innerWidth;
      sceneBus.viewport.h = window.innerHeight;
    };
    const onScroll = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
}

/** Progress from entry at the viewport bottom to exit at the viewport top. */
export function useSectionProgress<T extends HTMLElement = HTMLDivElement>(
  onProgress?: (progress: number) => void,
) {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const span = rect.height + window.innerHeight;
      const next = clamp((window.innerHeight - rect.top) / span);
      setProgress((prev) => (Math.abs(prev - next) > 0.003 ? next : prev));
      onProgress?.(next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [onProgress]);
  return { ref, progress };
}
