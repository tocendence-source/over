import { useEffect, useRef } from "react";

/**
 * Host for the pointer instrument layer. Purely decorative and
 * `aria-hidden`: it never carries information that isn't already in the DOM,
 * and it is only mounted for mouse users who have motion enabled.
 */
export function TraceOverlay({ enabled }: { enabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!enabled || !canvas) return;
    let overlay: { dispose: () => void } | undefined;
    let cancelled = false;

    void import("@/lib/traceOverlay")
      .then(({ TraceOverlay: Engine }) => {
        if (cancelled) return;
        overlay = new Engine(canvas);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      overlay?.dispose();
    };
  }, [enabled]);

  if (!enabled) return null;
  return <canvas ref={canvasRef} className="trace-overlay" aria-hidden="true" />;
}
