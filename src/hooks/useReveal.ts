import { useEffect, useRef, useState } from "react";

/**
 * Reveal-on-scroll. Adds `in` once, then stops observing — cheap, and it never
 * re-triggers while scrolling back up.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(options?: {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            if (options?.once !== false) observer.unobserve(entry.target);
          } else if (options?.once === false) {
            setInView(false);
          }
        });
      },
      { threshold: options?.threshold ?? 0.18, rootMargin: options?.rootMargin ?? "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [options?.once, options?.rootMargin, options?.threshold]);

  return { ref, inView };
}

/** Tracks the active section inside a container of stacked sections. */
export function useActiveSection(ids: string[], enabled = true) {
  const [active, setActive] = useState<string>(ids[0] ?? "");

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === "undefined") return;
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((n): n is HTMLElement => !!n);
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { threshold: [0.28, 0.55], rootMargin: "-18% 0px -18% 0px" },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [enabled, ids.join("|")]);

  return active;
}
