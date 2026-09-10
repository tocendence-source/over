import { useEffect, useRef, useState } from "react";
import { StaticCore } from "@/components/scene/StaticCore";
import type { Quality } from "@/lib/performance";

export function SceneLayer({ quality, onDegrade }: { quality: Quality; onDegrade: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const enabled = quality !== "none" && !failed;

  useEffect(() => {
    setReady(false);
    if (!enabled) return;
    let instance: { dispose: () => void } | undefined;
    let cancelled = false;
    let startFrame = 0;
    let readyFrame = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fail = () => { if (!cancelled) { setFailed(true); setReady(false); } };
    const lost = (event: Event) => { event.preventDefault(); fail(); };
    canvas.addEventListener("webglcontextlost", lost);

    // Wait for the document's first paint. The existing single-file bundler
    // defers execution here, but does not produce a separate network chunk.
    startFrame = requestAnimationFrame(() => {
      void import("@/webgl/EvidenceCoreScene").then(({ EvidenceCoreScene }) => {
        if (cancelled) return;
        instance = new EvidenceCoreScene(canvas, quality, onDegrade, fail);
        readyFrame = requestAnimationFrame(() => { if (!cancelled) setReady(true); });
      }).catch(fail);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(startFrame);
      cancelAnimationFrame(readyFrame);
      canvas.removeEventListener("webglcontextlost", lost);
      instance?.dispose();
    };
  }, [enabled, quality, onDegrade]);

  return <div className="scene-layer" data-ready={ready && enabled ? "true" : "false"} aria-hidden="true">
    <div className="scene-fallback">
      {posterFailed ? <div className="fallback-art"><StaticCore dim /></div> : <img className="scene-poster" src="/images/evidence-core.jpg" alt="" fetchPriority="high" onError={() => setPosterFailed(true)} />}
    </div>
    {enabled && <canvas ref={canvasRef} />}
  </div>;
}