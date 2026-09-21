import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { methodology, stages } from "@/data/methodology";
import { Section } from "@/components/layout/Section";
import { Reveal } from "@/components/ui/primitives";
import { ConfidenceSection } from "@/components/methodology/ConfidenceSection";
import { sceneBus } from "@/lib/sceneBus";
import { clamp } from "@/lib/motion";

/** Illustrative positions, not real entities or confidence measurements. */
const positions = [[140, 78], [285, 62], [393, 142], [368, 274], [239, 307], [112, 256], [80, 160], [246, 181]];
const edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [0, 7], [2, 7], [3, 7], [5, 7]];
const lastStage = stages.length - 1;
const SCRUB = { anchorTop: 115, holdFraction: 0.82, minSpan: 260, wideLayout: 800, tallLayout: 760 } as const;
const captions = [
  "Preserve the source before following the lead.",
  "Separate the entities. Keep their source references.",
  "Connections are leads, not conclusions.",
  "Test each relationship against independent sources.",
  "Keep the evidence and reasoning open to review.",
];

function EvidenceFlow({ stage }: { stage: number }) {
  const stageInt = Math.round(clamp(stage, 0, lastStage));
  const validated = clamp(stage - 2.6);
  const reported = clamp((stage - 3.6) / 0.4);
  const spread = clamp((stage - 0.25) / 0.75);
  return <svg className="method-graph" viewBox="0 0 500 365" role="img" aria-label={`Illustrative ${stages[stageInt].title.toLowerCase()} stage: ${stages[stageInt].output.toLowerCase()}. No real personal data.`} style={{ width: "100%", height: "auto", maxHeight: "min(33vh, 330px)", transform: "none", animation: "none" }}>
    <ellipse cx="246" cy="181" rx="195" ry="148" fill="none" stroke="#a8ac99" strokeWidth=".45" />
    <ellipse cx="246" cy="181" rx="172" ry="110" fill="none" stroke="#b0b2a3" strokeWidth=".45" transform="rotate(-25 246 181)" />
    <path d="M246 12v21m0 297v21M35 181h20m383 0h22" stroke="#8b927c" strokeWidth=".7" />
    <circle cx="246" cy="181" r={42 + spread * 12} fill="none" stroke="#a89571" strokeWidth=".6" opacity={(1 - spread) * 0.65} />
    {edges.map(([a, b], i) => {
      const drawn = clamp((stage - 1.55 - i * 0.045) / 1.15);
      if (drawn <= 0) return null;
      const length = Math.hypot(positions[a][0] - positions[b][0], positions[a][1] - positions[b][1]);
      return <line key={`e${i}`} className="method-edge" x1={positions[a][0]} y1={positions[a][1]} x2={positions[b][0]} y2={positions[b][1]} opacity={clamp(drawn * 1.25)} stroke={validated > 0 ? "#68754c" : "#8e825f"} strokeWidth={0.8 + validated * 0.5} strokeDasharray={length} strokeDashoffset={length * (1 - drawn)} style={{ transition: "none", animation: "none" }} />;
    })}
    {positions.map(([x, y], i) => {
      const sx = 246 + (x - 246) * spread;
      const sy = 181 + (y - 181) * spread;
      const ring = clamp((validated - 0.15) * 2);
      if (i !== 7 && spread <= 0) return null;
      return <g key={`n${i}`} opacity={i === 7 ? 1 : clamp(spread * 1.6)}>
        {ring > 0 && i !== 7 && <circle cx={sx} cy={sy} r={18} fill="none" stroke="#939c7d" strokeWidth=".7" opacity={ring} />}
        <circle cx={sx} cy={sy} r={i === 7 ? 27 : 8 + validated * 4} fill={i === 7 ? "#333c28" : "#eae8df"} stroke="#747d5f" strokeWidth="1.1" />
        <circle cx={sx} cy={sy} r={i === 7 ? 4 : 2.7} fill={i === 7 ? "#d6c194" : "#8e7a4d"} />
      </g>;
    })}
    <g className="method-report" opacity={reported} style={{ transition: "none", animation: "none" }}>
      <rect x="56" y="33" width="393" height="297" rx="1" fill="none" stroke="#788063" strokeWidth=".8" />
      <path d="M72 52h32M72 57h18M406 310l6 6 12-14" stroke="#6f7957" strokeWidth="1.1" fill="none" />
    </g>
  </svg>;
}

export function MethodologyNarrative() {
  const [autoStage, setAutoStage] = useState(0);
  const [manualStage, setManualStage] = useState<number | null>(null);
  const [scrollMode, setScrollMode] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = manualStage ?? autoStage;
  const selectedIndex = Math.round(clamp(selected, 0, lastStage));
  const current = stages[selectedIndex];

  useEffect(() => {
    const node = track.current;
    const panel = sticky.current;
    if (!node || !panel) return;
    let frame: number | null = null;
    let inView = true;
    let automatic = false;
    let anchorTop: number = SCRUB.anchorTop;
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const cancel = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    };
    const measure = (force = false) => {
      frame = null;
      if (!automatic) return;
      const rect = node.getBoundingClientRect();
      const visible = rect.top < window.innerHeight && rect.bottom > 0;
      if (manualStage !== null) {
        if (visible) return;
        setManualStage(null);
      }
      if (!inView) return;
      if (!force && document.activeElement && node.contains(document.activeElement)) return;
      // The sticky child can travel only track height minus its own height.
      // Hold the final report for the remaining 18% of that travel.
      const travel = Math.max(rect.height - panel.offsetHeight, SCRUB.minSpan);
      const progress = clamp((anchorTop - rect.top) / (travel * SCRUB.holdFraction));
      setAutoStage(progress * lastStage);
    };
    const schedule = () => {
      if (automatic && inView && frame === null) frame = requestAnimationFrame(() => measure());
    };
    const configure = () => {
      cancel();
      automatic = window.innerWidth > SCRUB.wideLayout && window.innerHeight >= SCRUB.tallLayout &&
        document.documentElement.dataset.motion !== "reduced" && !media?.matches;
      setScrollMode(automatic);
      const top = Number.parseFloat(window.getComputedStyle(panel).top);
      anchorTop = Number.isFinite(top) ? top : SCRUB.anchorTop;
      measure(true);
    };
    const observer = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((entries) => {
      inView = entries.some((entry) => entry.isIntersecting);
      if (inView) schedule();
      else {
        cancel();
        if (automatic) setManualStage(null);
      }
    }) : undefined;
    observer?.observe(node);
    const motionObserver = typeof MutationObserver !== "undefined" ? new MutationObserver(configure) : undefined;
    motionObserver?.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    configure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", configure, { passive: true });
    node.addEventListener("focusout", schedule);
    media?.addEventListener("change", configure);
    return () => {
      cancel();
      observer?.disconnect();
      motionObserver?.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", configure);
      node.removeEventListener("focusout", schedule);
      media?.removeEventListener("change", configure);
    };
  }, [manualStage]);

  useEffect(() => {
    sceneBus.stageIndex = selectedIndex;
    sceneBus.stageProgress = clamp(selected / lastStage);
  }, [selected, selectedIndex]);

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === "ArrowRight" ? (index + 1) % stages.length : event.key === "ArrowLeft" ? (index + lastStage) % stages.length : event.key === "Home" ? 0 : event.key === "End" ? lastStage : -1;
    if (next < 0) return;
    event.preventDefault();
    setManualStage(next);
    tabs.current[next]?.focus();
  };

  return <Section id="methodology" index="03" name="The methodology" paper className="method-section">
    <div ref={track} className="method-track">
      <div ref={sticky} className="method-sticky">
        <div className="section-intro"><Reveal><h2 className="section-heading" id="methodology-heading">From a trace<br /><em>to a finding.</em></h2></Reveal><Reveal delay={90}><p className="lede">{methodology.intro}</p></Reveal></div>
        <div className="method-layout">
          <div className="method-info">
            <div className="method-count"><strong>{current.index}</strong> / 05</div>
            {stages.map((stage, index) => <div key={stage.id} id={`method-panel-${index}`} role="tabpanel" aria-labelledby={`method-tab-${index}`} tabIndex={0} hidden={selectedIndex !== index}>
              <h3>{stage.body}</h3><p>{stage.detail}</p>
              <div className="method-output"><span>Output</span><span>{stage.output}</span></div>
            </div>)}
          </div>
          <div className="method-visual" style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0, gap: "clamp(12px, 1.6vw, 24px)", padding: "clamp(18px, 2.4vw, 36px)", transform: "none" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: "8px 20px", width: "100%", borderBottom: "1px solid var(--line)", paddingBottom: "14px" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px, 2.4vw, 36px)", lineHeight: 1.15 }}>{current.output}</h3>
              <span className="label" style={{ color: "var(--muted)" }}>{current.index} / 05</span>
            </div>
            <EvidenceFlow stage={selected} />
            <div style={{ width: "100%", borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
              <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--muted)", maxWidth: "42ch" }}>{captions[selectedIndex]}</p>
              <span className="label-sm" style={{ display: "block", marginTop: "8px", color: "var(--muted)" }}>Illustrative sequence · not live data</span>
            </div>
          </div>
        </div>
        <div className="method-tabs" role="tablist" aria-label="The five stages of the methodology">
          {stages.map((stage, index) => <button key={stage.id} id={`method-tab-${index}`} ref={(node) => { tabs.current[index] = node; }} type="button" role="tab" className="method-tab" aria-controls={`method-panel-${index}`} aria-selected={selectedIndex === index} tabIndex={selectedIndex === index ? 0 : -1} onClick={() => setManualStage(index)} onKeyDown={(event) => onKey(event, index)}><span>{stage.index}</span>{stage.title}</button>)}
        </div>
        <div className="method-note"><span>{methodology.corePhrase}</span>{scrollMode && manualStage !== null ? <button type="button" className="method-reset" onClick={() => setManualStage(null)}>Resume scroll sequence</button> : <span className="scroll-method-hint">{scrollMode ? "Scroll to follow, or select a step" : "Select a step to explore"}</span>}</div>
      </div>
    </div>
    <ConfidenceSection />
  </Section>;
}
