import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { methodology, stages } from "@/data/methodology";
import { Section } from "@/components/layout/Section";
import { Reveal } from "@/components/ui/primitives";
import { ConfidenceSection } from "@/components/methodology/ConfidenceSection";
import { sceneBus } from "@/lib/sceneBus";
import { clamp } from "@/lib/motion";
import { scrollStage, smoothStage, stageIndex } from "@/lib/methodologyMotion";

const positions = [[140, 78], [285, 62], [393, 142], [368, 274], [239, 307], [112, 256], [80, 160], [246, 181]];
const edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [0, 7], [2, 7], [3, 7], [5, 7]];
const SCRUB = { wideLayout: 800, tallLayout: 760, anchorTop: 115 } as const;

/** Original illustrative artwork: no real records, telemetry or fabricated confidence scores. */
function EvidenceFlow({ stage, selected }: { stage: number; selected: number }) {
  const spread = clamp((stage - 0.25) / 0.75);
  const validated = clamp((stage - 2.45) / 0.55);
  const reported = clamp(stage - 3);
  const points = positions.map(([x, y], i) => i === 7 ? [246, 181] : [246 + (x - 246) * spread, 181 + (y - 181) * spread]);
  return <svg className="method-graph" viewBox="0 0 500 365" role="img" aria-label={`Illustrative ${stages[selected].title.toLowerCase()} stage: ${stages[selected].output.toLowerCase()}. No real personal data.`} style={{ width: "100%", height: "auto", maxHeight: "min(38vh, 365px)", overflow: "visible" }}>
    <ellipse cx="246" cy="181" rx="195" ry="148" fill="none" stroke="#a8ac99" strokeWidth=".5" opacity=".6" />
    <ellipse cx="246" cy="181" rx={105 + spread * 67} ry={56 + spread * 54} fill="none" stroke="#a8ac99" strokeWidth=".5" transform={`rotate(${-25 + stage * 4} 246 181)`} />
    <path d="M246 12v15m0 309v15M35 181h15m393 0h15" stroke="#8b927c" strokeWidth=".8" />
    <g opacity={(1 - spread) * 0.8}>
      <circle cx="246" cy="181" r="57" fill="none" stroke="#8e825f" strokeWidth=".65" />
      <circle cx="246" cy="181" r="65" fill="none" stroke="#8e825f" strokeWidth=".6" strokeDasharray="2 8" />
      <path d="M154 128h20v-20m144 0v20h20M154 234h20v20m144 0v-20h20" fill="none" stroke="#747d5f" strokeWidth="1" />
    </g>
    {edges.map(([a, b], i) => {
      const drawn = clamp((stage - 1.05 - i * 0.035) / 0.6);
      if (!drawn) return null;
      return <line key={`edge-${i}`} x1={points[a][0]} y1={points[a][1]} x2={points[b][0]} y2={points[b][1]} pathLength={1} stroke={validated > 0 ? "#68754c" : "#8e825f"} strokeWidth={0.8 + validated * 0.5} strokeDasharray="1" strokeDashoffset={1 - drawn} opacity={drawn * (0.6 + validated * 0.4)} />;
    })}
    {points.map(([x, y], i) => {
      const core = i === 7;
      if (!core && spread <= 0) return null;
      return <g key={`node-${i}`} opacity={core ? 1 : clamp(spread * 1.5)}>
        {!core && <circle cx={x} cy={y} r={18} fill="none" stroke="#747d5f" strokeWidth=".7" opacity={validated} />}
        {core && <circle cx={x} cy={y} r={35} fill="none" stroke="#8e825f" strokeWidth=".7" />}
        <circle cx={x} cy={y} r={core ? 27 : 8 + validated * 4} fill={core ? "#333c28" : "#eae8df"} stroke="#747d5f" strokeWidth="1.1" />
        <circle cx={x} cy={y} r={core ? 4 : 2.7} fill={core ? "#d6c194" : "#8e7a4d"} />
        {!core && <path d={`M${x - 4} ${y}l3 3 6-7`} fill="none" stroke="#333c28" strokeWidth="1" opacity={validated} />}
      </g>;
    })}
    <g opacity={reported}>
      <path d="M56 65V33h32m329 0h32v32M56 298v32h32m329 0h32v-32" fill="none" stroke="#68754c" strokeWidth="1" />
      <path d="M73 51h32m-32 6h18M407 310l6 6 12-14" stroke="#68754c" strokeWidth="1.2" fill="none" />
    </g>
  </svg>;
}

export function MethodologyNarrative() {
  const [displayStage, setDisplayStage] = useState(0);
  const [manualStage, setManualStage] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const manual = useRef<number | null>(null);
  const target = useRef(0);
  const current = useRef(0);
  const wake = useRef<() => void>(() => {});
  const selected = manualStage ?? stageIndex(displayStage);

  useEffect(() => {
    const node = track.current;
    const panel = sticky.current;
    if (!node || !panel) return;
    let frame = 0;
    let previousTime = 0;
    let inView = true;
    let dirty = true;
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduced = () => document.documentElement.dataset.motion === "reduced" || reducedQuery.matches;
    const wide = () => window.innerWidth > SCRUB.wideLayout && window.innerHeight >= SCRUB.tallLayout;
    const publish = (value: number) => {
      current.current = value;
      setDisplayStage(value);
      sceneBus.stageProgress = value / 4;
      sceneBus.stageIndex = manual.current ?? stageIndex(value);
    };
    const measure = () => {
      const rect = node.getBoundingClientRect();
      const visible = rect.top < window.innerHeight && rect.bottom > 0;
      // Manual control is never stolen while the panel is on screen.
      if (manual.current !== null && !visible && wide() && !reduced()) {
        manual.current = null;
        setManualStage(null);
      }
      if (manual.current !== null) { target.current = manual.current; return; }
      if (!wide() || reduced()) { target.current = stageIndex(current.current); return; }
      // Keep an actively operated tab stable for keyboard users.
      if (visible && tabs.current.some((tab) => tab === document.activeElement)) return;
      const computedTop = Number.parseFloat(getComputedStyle(panel).top);
      const anchor = Number.isFinite(computedTop) ? computedTop : SCRUB.anchorTop;
      target.current = scrollStage(rect.top, rect.height, panel.offsetHeight, anchor);
    };
    const tick = (time: number) => {
      frame = 0;
      if (document.hidden) { previousTime = 0; return; }
      if (dirty) { dirty = false; measure(); }
      const dt = previousTime ? (time - previousTime) / 1000 : 1 / 60;
      previousTime = time;
      const value = reduced() || !inView ? target.current : smoothStage(current.current, target.current, dt);
      if (value !== current.current) publish(value);
      if (value !== target.current && inView && !reduced()) frame = requestAnimationFrame(tick);
      else previousTime = 0;
    };
    const schedule = () => {
      dirty = true;
      if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const onScroll = () => { if (inView || manual.current !== null) schedule(); };
    const onVisibility = () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
      else schedule();
    };
    wake.current = schedule;
    const intersection = typeof IntersectionObserver === "undefined" ? undefined : new IntersectionObserver((entries) => {
      inView = entries.some((entry) => entry.isIntersecting);
      schedule();
    });
    intersection?.observe(node);
    const resize = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(schedule);
    resize?.observe(node);
    resize?.observe(panel);
    const preference = new MutationObserver(schedule);
    preference.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    reducedQuery.addEventListener("change", schedule);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    node.addEventListener("focusout", schedule);
    document.addEventListener("visibilitychange", onVisibility);
    schedule();
    return () => {
      wake.current = () => {};
      cancelAnimationFrame(frame);
      intersection?.disconnect();
      resize?.disconnect();
      preference.disconnect();
      reducedQuery.removeEventListener("change", schedule);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", schedule);
      node.removeEventListener("focusout", schedule);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    const visual = visualRef.current;
    if (!visual) return;
    const pointerQuery = window.matchMedia("(pointer: fine)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const clear = () => {
      cancelAnimationFrame(frame); frame = 0;
      visual.style.setProperty("--tilt-x", "0");
      visual.style.setProperty("--tilt-y", "0");
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !pointerQuery.matches || motionQuery.matches || document.documentElement.dataset.motion === "reduced") { clear(); return; }
      const rect = visual.getBoundingClientRect();
      const x = (clamp((event.clientX - rect.left) / Math.max(rect.width, 1)) - 0.5) * 3;
      const y = (0.5 - clamp((event.clientY - rect.top) / Math.max(rect.height, 1))) * 2;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        visual.style.setProperty("--tilt-x", x.toFixed(3));
        visual.style.setProperty("--tilt-y", y.toFixed(3));
      });
    };
    const preference = new MutationObserver(clear);
    preference.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    pointerQuery.addEventListener("change", clear);
    motionQuery.addEventListener("change", clear);
    visual.addEventListener("pointermove", onMove, { passive: true });
    visual.addEventListener("pointerleave", clear);
    window.addEventListener("blur", clear);
    return () => {
      clear(); preference.disconnect();
      pointerQuery.removeEventListener("change", clear);
      motionQuery.removeEventListener("change", clear);
      visual.removeEventListener("pointermove", onMove);
      visual.removeEventListener("pointerleave", clear);
      window.removeEventListener("blur", clear);
    };
  }, []);

  const select = (index: number | null) => {
    manual.current = index;
    setManualStage(index);
    if (index !== null) { target.current = index; sceneBus.stageIndex = index; }
    wake.current();
  };
  const onKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === "ArrowRight" ? (index + 1) % 5 : event.key === "ArrowLeft" ? (index + 4) % 5 : event.key === "Home" ? 0 : event.key === "End" ? 4 : -1;
    if (next < 0) return;
    event.preventDefault(); select(next); tabs.current[next]?.focus();
  };

  return <Section id="methodology" index="03" name="The methodology" paper className="method-section">
    <div ref={track} className="method-track">
      <div ref={sticky} className="method-sticky">
        <div className="section-intro"><Reveal><h2 className="section-heading" id="methodology-heading">From a trace<br /><em>to a finding.</em></h2></Reveal><Reveal delay={90}><p className="lede">{methodology.intro}</p></Reveal></div>
        <div className="method-layout">
          <div className="method-info">
            <div className="method-count"><strong>{stages[selected].index}</strong> / 05</div>
            {stages.map((stage, index) => <div key={stage.id} id={`method-panel-${index}`} role="tabpanel" aria-labelledby={`method-tab-${index}`} hidden={selected !== index} tabIndex={0}>
              <h3>{stage.body}</h3><p>{stage.detail}</p>
              <div className="method-output"><span>Output</span><span>{stage.output}</span></div>
            </div>)}
          </div>
          <div ref={visualRef} className="method-visual" data-stage-progress={displayStage.toFixed(4)} style={{ minWidth: 0, background: "transparent", boxShadow: "none", borderRadius: 0 }}>
            <figure style={{ margin: 0, width: "100%", padding: "clamp(12px, 2vw, 24px)", borderBlock: "1px solid var(--line)" }}>
              <div className="label-sm" aria-hidden="true" style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "var(--muted)", marginBottom: 8 }}><span>Evidence study</span><span>{stages[selected].index} / 05</span></div>
              <EvidenceFlow stage={displayStage} selected={selected} />
              <figcaption style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: "8px 16px", paddingTop: 12 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px, 2.4vw, 34px)", lineHeight: 1.15, color: "var(--ink)" }}>{stages[selected].output}</span>
                <span className="label-sm" style={{ color: "var(--muted)" }}>Illustrative process</span>
              </figcaption>
              <div aria-hidden="true" style={{ height: 1, background: "var(--line)", marginTop: 16, overflow: "hidden" }}><div style={{ height: "100%", background: "var(--gold)", transformOrigin: "left", transform: `scaleX(${0.08 + displayStage / 4 * 0.92})` }} /></div>
            </figure>
          </div>
        </div>
        <div className="method-tabs" role="tablist" aria-label="The five stages of the methodology">
          {stages.map((stage, index) => <button key={stage.id} id={`method-tab-${index}`} ref={(node) => { tabs.current[index] = node; }} type="button" role="tab" className="method-tab" aria-controls={`method-panel-${index}`} aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} onClick={() => select(index)} onKeyDown={(event) => onKey(event, index)}><span>{stage.index}</span>{stage.title}</button>)}
        </div>
        <div className="method-note"><span>{methodology.corePhrase}</span>{manualStage !== null ? <button type="button" className="method-reset" onClick={() => select(null)}>Resume scroll sequence</button> : <span className="scroll-method-hint">Scroll to follow, or select a step</span>}</div>
      </div>
    </div>
    <ConfidenceSection />
  </Section>;
}
