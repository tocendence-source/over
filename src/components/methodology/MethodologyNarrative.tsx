import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { methodology, stages } from "@/data/methodology";
import { Section } from "@/components/layout/Section";
import { Reveal } from "@/components/ui/primitives";
import { ConfidenceSection } from "@/components/methodology/ConfidenceSection";
import { sceneBus } from "@/lib/sceneBus";
import { clamp } from "@/lib/motion";
import { scrollStage, smoothStage, stageIndex } from "@/lib/methodologyMotion";

const SCRUB = { wideLayout: 800, tallLayout: 760, anchorTop: 115 } as const;
const STUDY_LABELS = ["Source fragment", "Separate the entities", "Reveal the connections", "Cross-check the structure", "A reviewable finding"];
const CORNERS = Array.from({ length: 8 }, (_, i) => [i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1]);
const CONNECTIONS = CORNERS.flatMap((_, i) => [1, 2, 4].filter((mask) => (i ^ mask) > i).map((mask) => [i, i ^ mask]));

/** Inline illustration remains available before loading, with reduced motion, and after WebGL failure. */
function StudyFallback({ stage }: { stage: number }) {
  const id = useId().replace(/:/g, "");
  const spread = Math.sin(clamp(stage / 4) * Math.PI) * 22;
  return <svg data-study-fallback="true" viewBox="0 0 600 360" aria-hidden="true" style={{ width: "100%", height: "100%" }}>
    <defs>
      <linearGradient id={`${id}-top`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a8aca0" /><stop offset="1" stopColor="#454b40" /></linearGradient>
      <linearGradient id={`${id}-side`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#363e32" /><stop offset="1" stopColor="#11180f" /></linearGradient>
      <radialGradient id={`${id}-shadow`}><stop stopColor="#333b2b" stopOpacity=".23" /><stop offset="1" stopColor="#333b2b" stopOpacity="0" /></radialGradient>
    </defs>
    <ellipse cx="300" cy="307" rx="158" ry="29" fill={`url(#${id}-shadow)`} />
    <ellipse cx="300" cy="183" rx="220" ry="99" fill="none" stroke="#8e825f" strokeWidth=".8" transform="rotate(-18 300 183)" opacity=".5" />
    {[0, 1, 2].map((level) => <g key={level} transform={`translate(300 ${222 - level * (51 + spread)})`}>
      <path d="M-84 0L0-44 84 0 0 44Z" fill={`url(#${id}-top)`} stroke="#b6b497" strokeWidth=".8" />
      <path d="M-84 0L0 44V83L-84 39Z" fill={`url(#${id}-side)`} stroke="#6c745e" strokeWidth=".7" />
      <path d="M0 44L84 0V39L0 83Z" fill="#20291d" stroke="#6c745e" strokeWidth=".7" />
      <path d="M-77 4L0 44 77 4M0 44V76" fill="none" stroke="#c4ad75" strokeWidth="1.1" />
      <path d="M-23-12L0-24 23-12 0 0Z" fill="#d1b887" opacity={0.35 + level * 0.2} />
    </g>)}
    <path d="M74 97h55l30 22M437 241l30 23h58" fill="none" stroke="#8c7956" strokeWidth=".7" />
    <circle cx="159" cy="119" r="3" fill="#8c7956" /><circle cx="437" cy="241" r="3" fill="#8c7956" />
  </svg>;
}

/** Local, event-driven WebGL study. It never replaces or edits the global hero renderer. */
function EvidenceFlow({ stage, selected }: { stage: number; selected: number }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const progress = useRef(stage);
  const redraw = useRef<() => void>(() => {});
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { progress.current = stage; redraw.current(); }, [stage]);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let visible = false;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setActive(visible && !document.hidden && !mq.matches && document.documentElement.dataset.motion !== "reduced");
    const observer = typeof IntersectionObserver === "undefined" ? undefined : new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting); sync();
    }, { rootMargin: "120px" });
    observer?.observe(node);
    if (!observer) { visible = true; sync(); }
    const preference = new MutationObserver(sync);
    preference.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    mq.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => { observer?.disconnect(); preference.disconnect(); mq.removeEventListener("change", sync); document.removeEventListener("visibilitychange", sync); };
  }, []);

  useEffect(() => {
    setReady(false);
    const element = canvas.current;
    const node = host.current;
    if (!active || failed || !element || !node) return;
    let cancelled = false;
    let frame = 0;
    let release = () => {};
    let resizeObserver: ResizeObserver | undefined;
    const fail = () => { if (!cancelled) { setReady(false); setFailed(true); } };
    const lost = (event: Event) => { event.preventDefault(); fail(); };
    element.addEventListener("webglcontextlost", lost);

    // No model, font, texture or HDR request; Three.js is already a locked dependency.
    void Promise.all([import("three"), import("three/examples/jsm/environments/RoomEnvironment.js")]).then(([T, { RoomEnvironment }]) => {
      if (cancelled) return;
      const disposers: (() => void)[] = [];
      release = () => { for (const dispose of disposers.reverse()) { try { dispose(); } catch { /* Continue releasing the other GPU resources. */ } } disposers.length = 0; };
      try {
        const renderer = new T.WebGLRenderer({ canvas: element, alpha: true, antialias: window.devicePixelRatio < 2, powerPreference: "low-power" });
        disposers.push(() => renderer.dispose());
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1 : 1.5));
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.25;
        renderer.debug.onShaderError = fail;
        const scene = new T.Scene();
        const camera = new T.PerspectiveCamera(34, 1, 0.1, 40);
        camera.position.set(4.2, 3.1, 6.8);
        camera.lookAt(0, 0, 0);
        const environmentScene = new RoomEnvironment();
        const generator = new T.PMREMGenerator(renderer);
        try {
          const environment = generator.fromScene(environmentScene, 0.04);
          scene.environment = environment.texture;
          disposers.push(() => environment.dispose());
        } finally { environmentScene.dispose(); generator.dispose(); }
        const resource = <U extends { dispose: () => void }>(value: U): U => { disposers.push(() => value.dispose()); return value; };
        const key = new T.DirectionalLight(0xffedc9, 4); key.position.set(-3, 6, 4); scene.add(key);
        const rim = new T.DirectionalLight(0xe5edf1, 3); rim.position.set(4, 1, -3); scene.add(rim);
        scene.add(new T.HemisphereLight(0xffffff, 0x323d29, 2));
        const sculpture = new T.Group(); scene.add(sculpture);
        const shape = new T.Shape();
        shape.moveTo(-0.32, -0.32); shape.lineTo(0.32, -0.32); shape.lineTo(0.32, 0.32); shape.lineTo(-0.32, 0.32); shape.closePath();
        const blockGeometry = resource(new T.ExtrudeGeometry(shape, { depth: 0.64, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.055, bevelThickness: 0.055, curveSegments: 1 }));
        blockGeometry.center();
        const metal = resource(new T.MeshPhysicalMaterial({ color: 0x414b39, metalness: 0.83, roughness: 0.26, clearcoat: 0.35, clearcoatRoughness: 0.23 }));
        const brass = resource(new T.MeshStandardMaterial({ color: 0xc4a974, metalness: 0.8, roughness: 0.29 }));
        const blocks = new T.InstancedMesh(blockGeometry, metal, 8); blocks.instanceMatrix.setUsage(T.DynamicDrawUsage); blocks.frustumCulled = false; sculpture.add(blocks);
        disposers.push(() => blocks.dispose());
        const pinGeometry = resource(new T.IcosahedronGeometry(0.066, 1));
        const pins = new T.InstancedMesh(pinGeometry, brass, 8); pins.instanceMatrix.setUsage(T.DynamicDrawUsage); pins.frustumCulled = false; sculpture.add(pins);
        disposers.push(() => pins.dispose());
        const core = new T.Mesh(resource(new T.IcosahedronGeometry(0.36, 1)), brass); sculpture.add(core);
        const ring = new T.Mesh(resource(new T.TorusGeometry(1.74, 0.009, 5, 100)), brass); ring.rotation.set(1.15, 0.3, -0.2); sculpture.add(ring);
        const lineGeometry = resource(new T.BufferGeometry());
        const lineArray = new Float32Array(CONNECTIONS.length * 6);
        const lineAttribute = new T.BufferAttribute(lineArray, 3); lineAttribute.setUsage(T.DynamicDrawUsage); lineGeometry.setAttribute("position", lineAttribute);
        const lineMaterial = resource(new T.LineBasicMaterial({ color: 0x887044, transparent: true, opacity: 0 }));
        const lines = new T.LineSegments(lineGeometry, lineMaterial); lines.frustumCulled = false; sculpture.add(lines);
        const reportMaterial = resource(new T.LineBasicMaterial({ color: 0x536047, transparent: true, opacity: 0 }));
        const reportBox = resource(new T.BoxGeometry(2.2, 2.2, 2.2));
        const report = new T.LineSegments(resource(new T.EdgesGeometry(reportBox)), reportMaterial); sculpture.add(report);
        const dummy = new T.Object3D();
        const coordinates = CORNERS.map(() => new T.Vector3());
        const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
        let last = 0;
        let sizeDirty = true;
        const render = (time: number) => {
          frame = 0;
          if (cancelled) return;
          try {
            if (sizeDirty) {
              const bounds = node.getBoundingClientRect();
              const width = Math.max(1, bounds.width); const height = Math.max(1, bounds.height);
              renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); sizeDirty = false;
            }
            const dt = last ? Math.min((time - last) / 1000, 0.05) : 1 / 60; last = time;
            const damping = 1 - Math.exp(-12 * dt);
            pointer.x += (pointer.targetX - pointer.x) * damping; pointer.y += (pointer.targetY - pointer.y) * damping;
            const p = clamp(progress.current, 0, 4);
            const opening = Math.sin(p / 4 * Math.PI);
            const validation = clamp(p - 2);
            const completion = clamp(p - 3);
            sculpture.rotation.set(-0.12 + pointer.y * 0.12, -0.25 + p * 0.36 + pointer.x * 0.16, 0.05 * opening);
            sculpture.scale.setScalar(1 - opening * 0.08);
            for (let i = 0; i < 8; i++) {
              const [x, y, z] = CORNERS[i];
              const radius = 0.405 + opening * 0.5;
              const location = coordinates[i].set(x * radius, y * radius, z * radius);
              dummy.position.copy(location); dummy.rotation.set(y * opening * 0.22, x * opening * 0.32, z * opening * 0.12); dummy.scale.setScalar(1 - opening * 0.3); dummy.updateMatrix(); blocks.setMatrixAt(i, dummy.matrix);
              dummy.position.copy(location).multiplyScalar(1.38); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(0.65 + validation * 0.5); dummy.updateMatrix(); pins.setMatrixAt(i, dummy.matrix);
            }
            blocks.instanceMatrix.needsUpdate = true; pins.instanceMatrix.needsUpdate = true;
            for (let i = 0; i < CONNECTIONS.length; i++) {
              const [a, b] = CONNECTIONS[i];
              const amount = clamp((p - 1.05 - i * 0.035) / 0.6);
              const start = coordinates[a]; const end = coordinates[b];
              lineArray.set([start.x, start.y, start.z, start.x + (end.x - start.x) * amount, start.y + (end.y - start.y) * amount, start.z + (end.z - start.z) * amount], i * 6);
            }
            lineAttribute.needsUpdate = true;
            lineMaterial.opacity = clamp(p - 1) * (1 - completion * 0.65);
            reportMaterial.opacity = completion * 0.55;
            core.rotation.set(p * 0.7, p * 0.9, 0); core.scale.setScalar(0.9 + opening * 0.35);
            ring.rotation.z = -0.2 + p * 0.2; ring.scale.setScalar(1 + opening * 0.1);
            renderer.render(scene, camera); setReady(true);
            if (Math.abs(pointer.targetX - pointer.x) + Math.abs(pointer.targetY - pointer.y) > 0.001) frame = requestAnimationFrame(render);
            else last = 0;
          } catch { fail(); }
        };
        const schedule = () => { if (!cancelled && !frame) frame = requestAnimationFrame(render); };
        const onResize = () => { sizeDirty = true; schedule(); };
        const onMove = (event: PointerEvent) => {
          if (event.pointerType !== "mouse") return;
          const bounds = node.getBoundingClientRect();
          pointer.targetX = clamp((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1;
          pointer.targetY = clamp((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 2 - 1; schedule();
        };
        const onLeave = () => { pointer.targetX = 0; pointer.targetY = 0; schedule(); };
        node.addEventListener("pointermove", onMove, { passive: true }); node.addEventListener("pointerleave", onLeave); window.addEventListener("resize", onResize);
        disposers.push(() => { node.removeEventListener("pointermove", onMove); node.removeEventListener("pointerleave", onLeave); window.removeEventListener("resize", onResize); });
        if (typeof ResizeObserver !== "undefined") { resizeObserver = new ResizeObserver(onResize); resizeObserver.observe(node); }
        redraw.current = schedule; schedule();
      } catch { release(); fail(); }
    }).catch(fail);
    return () => { cancelled = true; redraw.current = () => {}; cancelAnimationFrame(frame); resizeObserver?.disconnect(); element.removeEventListener("webglcontextlost", lost); release(); };
  }, [active, failed]);

  return <div data-study="sculptural-v2" data-renderer={ready && active && !failed ? "webgl" : "fallback"} style={{ width: "100%", minWidth: 0 }}>
    <div ref={host} role="img" aria-label={`Evidence sculpture. Illustrative ${stages[selected].title.toLowerCase()} stage. No real personal data.`} style={{ position: "relative", width: "100%", height: "clamp(210px, 29vw, 350px)", isolation: "isolate" }}>
      <div style={{ position: "absolute", inset: 0, opacity: ready && active && !failed ? 0 : 1 }}><StudyFallback stage={stage} /></div>
      <div aria-hidden="true" style={{ position: "absolute", width: "52%", height: "12%", left: "24%", bottom: "8%", background: "radial-gradient(ellipse, rgba(45,55,35,.17), transparent 68%)", opacity: ready && active && !failed ? 1 : 0 }} />
      {active && !failed && <canvas ref={canvas} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: ready ? 1 : 0, pointerEvents: "none" }} />}
      <span aria-hidden="true" style={{ position: "absolute", left: 0, top: "13%", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".1em", color: "#626853", writingMode: "vertical-rl" }}>TRACE / STRUCTURE</span>
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, paddingTop: 8, color: "#626853" }}><span className="label-sm">{STUDY_LABELS[selected]}</span><span aria-hidden="true" style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>↗</span></div>
  </div>;
}

export function MethodologyNarrative() {
  const [displayStage, setDisplayStage] = useState(0);
  const [manualStage, setManualStage] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const manual = useRef<number | null>(null);
  const target = useRef(0);
  const current = useRef(0);
  const wake = useRef<() => void>(() => {});
  const selected = manualStage ?? stageIndex(displayStage);

  useEffect(() => {
    const node = track.current; const panel = sticky.current;
    if (!node || !panel) return;
    let frame = 0; let previousTime = 0; let inView = true; let dirty = true;
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduced = () => document.documentElement.dataset.motion === "reduced" || reducedQuery.matches;
    const wide = () => window.innerWidth > SCRUB.wideLayout && window.innerHeight >= SCRUB.tallLayout;
    const publish = (value: number) => { current.current = value; setDisplayStage(value); sceneBus.stageProgress = value / 4; sceneBus.stageIndex = manual.current ?? stageIndex(value); };
    const measure = () => {
      const rect = node.getBoundingClientRect(); const visible = rect.top < window.innerHeight && rect.bottom > 0;
      if (manual.current !== null && !visible && wide() && !reduced()) { manual.current = null; setManualStage(null); }
      if (manual.current !== null) { target.current = manual.current; return; }
      if (!wide() || reduced()) { target.current = stageIndex(current.current); return; }
      if (visible && tabs.current.some((tab) => tab === document.activeElement)) return;
      const computedTop = Number.parseFloat(getComputedStyle(panel).top);
      target.current = scrollStage(rect.top, rect.height, panel.offsetHeight, Number.isFinite(computedTop) ? computedTop : SCRUB.anchorTop);
    };
    const tick = (time: number) => {
      frame = 0;
      if (document.hidden) { previousTime = 0; return; }
      if (dirty) { dirty = false; measure(); }
      const dt = previousTime ? (time - previousTime) / 1000 : 1 / 60; previousTime = time;
      const value = reduced() || !inView ? target.current : smoothStage(current.current, target.current, dt);
      if (value !== current.current) publish(value);
      if (value !== target.current && inView && !reduced()) frame = requestAnimationFrame(tick); else previousTime = 0;
    };
    const schedule = () => { dirty = true; if (!frame && !document.hidden) frame = requestAnimationFrame(tick); };
    const onScroll = () => { if (inView || manual.current !== null) schedule(); };
    const onVisibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; } else schedule(); };
    wake.current = schedule;
    const intersection = typeof IntersectionObserver === "undefined" ? undefined : new IntersectionObserver((entries) => { inView = entries.some((entry) => entry.isIntersecting); schedule(); });
    intersection?.observe(node);
    const resize = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(schedule); resize?.observe(node); resize?.observe(panel);
    const preference = new MutationObserver(schedule); preference.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    reducedQuery.addEventListener("change", schedule); window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", schedule, { passive: true }); node.addEventListener("focusout", schedule); document.addEventListener("visibilitychange", onVisibility); schedule();
    return () => { wake.current = () => {}; cancelAnimationFrame(frame); intersection?.disconnect(); resize?.disconnect(); preference.disconnect(); reducedQuery.removeEventListener("change", schedule); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", schedule); node.removeEventListener("focusout", schedule); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  const select = (index: number | null) => { manual.current = index; setManualStage(index); if (index !== null) { target.current = index; sceneBus.stageIndex = index; } wake.current(); };
  const onKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === "ArrowRight" ? (index + 1) % 5 : event.key === "ArrowLeft" ? (index + 4) % 5 : event.key === "Home" ? 0 : event.key === "End" ? 4 : -1;
    if (next < 0) return; event.preventDefault(); select(next); tabs.current[next]?.focus();
  };

  return <Section id="methodology" index="03" name="The methodology" paper className="method-section">
    <div ref={track} className="method-track"><div ref={sticky} className="method-sticky">
      <div className="section-intro"><Reveal><h2 className="section-heading" id="methodology-heading">From a trace<br /><em>to a finding.</em></h2></Reveal><Reveal delay={90}><p className="lede">{methodology.intro}</p></Reveal></div>
      <div className="method-layout">
        <div className="method-info"><div className="method-count"><strong>{stages[selected].index}</strong> / 05</div>
          {stages.map((stage, index) => <div key={stage.id} id={`method-panel-${index}`} role="tabpanel" aria-labelledby={`method-tab-${index}`} hidden={selected !== index} tabIndex={0}><h3>{stage.body}</h3><p>{stage.detail}</p><div className="method-output"><span>Output</span><span>{stage.output}</span></div></div>)}
        </div>
        {/* A new class prevents the old radar's aspect ratio, pseudo-elements and tilt from constraining the sculpture. */}
        <div className="method-sculpture" data-stage-progress={displayStage.toFixed(4)} style={{ minWidth: 0, width: "100%", alignSelf: "center", position: "relative" }}>
          <figure style={{ margin: 0, padding: "clamp(16px, 2.4vw, 30px)", background: "linear-gradient(145deg, rgba(255,255,255,.37), rgba(195,195,172,.19))", borderTop: "1px solid rgba(83,90,63,.28)", borderBottom: "1px solid rgba(83,90,63,.28)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}><span className="label-sm" style={{ color: "#626853" }}>Evidence study / OVER</span><span aria-hidden="true" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 4vw, 54px)", lineHeight: 1, color: "#8b907b" }}>{stages[selected].index}</span></div>
            <EvidenceFlow stage={displayStage} selected={selected} />
            <figcaption style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: "8px 16px", paddingTop: 15, marginTop: 8, borderTop: "1px solid rgba(83,90,63,.18)" }}><span style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 3vw, 44px)", lineHeight: 1.08, letterSpacing: "-.035em", color: "#30392a" }}>{stages[selected].output}</span><span className="label-sm" style={{ color: "#626853" }}>Illustrative process</span></figcaption>
            <div aria-hidden="true" style={{ display: "flex", gap: 5, marginTop: 18 }}>{stages.map((item, index) => <span key={item.id} style={{ flex: 1, height: 2, background: "rgba(83,90,63,.16)", overflow: "hidden" }}><span style={{ display: "block", width: "100%", height: "100%", background: "#82704a", transformOrigin: "left", transform: `scaleX(${clamp(displayStage - index + 1)})` }} /></span>)}</div>
          </figure>
        </div>
      </div>
      <div className="method-tabs" role="tablist" aria-label="The five stages of the methodology">{stages.map((stage, index) => <button key={stage.id} id={`method-tab-${index}`} ref={(node) => { tabs.current[index] = node; }} type="button" role="tab" className="method-tab" aria-controls={`method-panel-${index}`} aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} onClick={() => select(index)} onKeyDown={(event) => onKey(event, index)}><span>{stage.index}</span>{stage.title}</button>)}</div>
      <div className="method-note"><span>{methodology.corePhrase}</span>{manualStage !== null ? <button type="button" className="method-reset" onClick={() => select(null)}>Resume scroll sequence</button> : <span className="scroll-method-hint">Scroll to follow, or select a step</span>}</div>
    </div></div><ConfidenceSection />
  </Section>;
}
