import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { methodology, stages } from "@/data/methodology";
import { Section } from "@/components/layout/Section";
import { Reveal } from "@/components/ui/primitives";
import { ConfidenceSection } from "@/components/methodology/ConfidenceSection";
import { sceneBus } from "@/lib/sceneBus";
import { clamp } from "@/lib/motion";

/** Node positions of the illustrative evidence graph, in 500x365 viewBox units. */
const positions = [[140, 78], [285, 62], [393, 142], [368, 274], [239, 307], [112, 256], [80, 160], [246, 181]];
const edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [0, 7], [2, 7], [3, 7], [5, 7]];
/** Total SVG length of each edge — used for the self-draw dash animation. */
const edgeLength = (a: number, b: number) =>
  Math.hypot(positions[a][0] - positions[b][0], positions[a][1] - positions[b][1]);

/** Scroll scrub constants, documented once instead of magic numbers. */
const SCRUB = {
  /** The sticky stage panel is considered "arrived" once its top passes this offset. */
  anchorTop: 115,
  /** Stage 5 (report) holds while the panel leaves the viewport, so the last step breathes. */
  holdFraction: 0.82,
  /** Below this the whole track length, the denominator falls back to keep the math stable. */
  minSpan: 260,
  /** Viewport widths at or under this fall back to tab-driven mode (matches the CSS breakpoint). */
  wideLayout: 800,
  /** Viewport heights under this collapse the sticky layout (see the 759px media query). */
  tallLayout: 760,
  /** Two consecutive frames without a meaningful change stop the manual-override clock. */
  settleEpsilon: 0.0015,
} as const;

/**
 * Illustrative evidence flow, scrubbed by continuous stage progress (0..4) so
 * edges self-draw and nodes spread instead of snapping between five states.
 */
function EvidenceFlow({ stage }: { stage: number }) {
  // Per-edge draw progress, eased from the shared stage value with a stagger.
  const edgeDraw = edges.map(([a, b], i) => clamp((stage - 1.55 - i * 0.045) / 1.15));
  const stageInt = Math.round(clamp(stage, 0, 4));
  const validated = clamp(stage - 2.6);
  const reported = clamp(stage - 3.6);
  const coreSpread = clamp((stage - 0.25) / 0.75);
  const output = stages[stageInt].output.toUpperCase();
  return <svg className="method-graph" viewBox="0 0 500 365" role="img" aria-label={`Illustrative ${stages[stageInt].title.toLowerCase()} stage: ${stages[stageInt].output.toLowerCase()}. No real personal data.`}>
    <ellipse cx="246" cy="181" rx="195" ry="148" fill="none" stroke="#a8ac99" strokeWidth=".45" />
    <ellipse cx="246" cy="181" rx="172" ry="110" fill="none" stroke="#b0b2a3" strokeWidth=".45" transform="rotate(-25 246 181)" />
    <path d="M246 12v21m0 297v21M35 181h20m383 0h22" stroke="#8b927c" strokeWidth=".7" />
    {/* Correlation edges self-draw, one after another; validation deepens them. */}
    {edges.map(([a, b], i) => {
      const len = edgeLength(a, b);
      const drawn = edgeDraw[i];
      if (drawn <= 0) return null;
      return <line key={`e${i}`} className="method-edge" x1={positions[a][0]} y1={positions[a][1]} x2={positions[b][0]} y2={positions[b][1]} opacity={clamp(drawn * 1.25)} stroke={validated > 0 ? "#68754c" : "#8e825f"} strokeWidth={0.8 + validated * 0.5} strokeDasharray={len} strokeDashoffset={len * (1 - drawn)} style={{ transitionDelay: `${i * 30}ms` }} />;
    })}
    {positions.map(([x, y], i) => {
      const sx = 246 + (x - 246) * coreSpread;
      const sy = 181 + (y - 181) * coreSpread;
      const ring = clamp((validated - 0.15) * 2);
      if (i !== 7 && coreSpread <= 0) return null;
      return <g key={`n${i}`} opacity={i === 7 ? 1 : clamp(coreSpread * 1.6)}>
        {ring > 0 && i !== 7 && <circle className="method-validate-ring" cx={sx} cy={sy} r={18} fill="none" stroke="#939c7d" strokeWidth=".7" opacity={ring} style={{ animationDelay: `${i * 120}ms` }} />}
        <circle cx={sx} cy={sy} r={i === 7 ? 27 : 8 + validated * 4} fill={i === 7 ? "#333c28" : "#eae8df"} stroke="#747d5f" strokeWidth="1.1" />
        <circle cx={sx} cy={sy} r={i === 7 ? 4 : 2.7} fill={i === 7 ? "#d6c194" : "#8e7a4d"} />
      </g>;
    })}
    <g className="method-report" opacity={reported}>
      <rect x="56" y="33" width="393" height="297" rx="1" fill="none" stroke="#788063" strokeWidth=".8" />
      <path d="M72 52h32M72 57h18M406 310l6 6 12-14" stroke="#6f7957" strokeWidth="1.1" fill="none" />
    </g>
    <text x="246" y="359" textAnchor="middle" fill="#737a64" fontFamily="monospace" fontSize="8" letterSpacing="2">{output}</text>
  </svg>;
}

export function MethodologyNarrative() {
  const [autoStage, setAutoStage] = useState(0);
  const [manualStage, setManualStage] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const autoStageRef = useRef(0);
  const selected = manualStage ?? autoStage;

  // Continuous scrub: stage float drives the SVG; the integer drives copy + tabs.
  const setScrolledStage = (next: number) => {
    const index = Math.min(4, Math.max(0, Math.round(next)));
    if (index !== autoStageRef.current) {
      autoStageRef.current = index;
      setAutoStage(index);
    }
  };

  useEffect(() => {
    const node = track.current;
    if (!node) return;
    let frame = 0;
    let inView = true;

    const reducedMotion = () =>
      document.documentElement.dataset.motion === "reduced" ||
      (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    const measure = () => {
      frame = 0;
      if (!track.current || window.innerWidth <= SCRUB.wideLayout || window.innerHeight < SCRUB.tallLayout || reducedMotion()) return;
      // While the visitor drives the tabs, scroll does not fight the selection —
      // but as soon as the block leaves the viewport, manual mode expires so the
      // scroll sequence resumes on the next entry.
      if (manualStage !== null) {
        const rect = track.current.getBoundingClientRect();
        const visible = rect.top < window.innerHeight && rect.bottom > 0;
        if (visible) return;
      }
      if (document.activeElement && track.current.contains(document.activeElement)) return;
      const rect = track.current.getBoundingClientRect();
      const span = Math.max(rect.height - window.innerHeight * (1 - SCRUB.holdFraction), SCRUB.minSpan);
      const progress = clamp((SCRUB.anchorTop - rect.top) / span);
      setScrolledStage(progress * 4);
    };

    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };

    // Gate the global scroll listener on intersection: no work while off-screen.
    const observer = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((entries) => { inView = entries.some((entry) => entry.isIntersecting); if (inView) schedule(); }, { rootMargin: "20% 0px" })
      : undefined;
    observer?.observe(node);

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [manualStage]);

  useEffect(() => {
    const stageIndex = Math.round(clamp(selected, 0, 4));
    sceneBus.stageIndex = stageIndex;
    sceneBus.stageProgress = clamp(selected / 4);
  }, [selected]);

  // Cursor tilt on the visual — a quiet parallax layer, disabled for coarse pointers.
  useEffect(() => {
    const visual = visualRef.current;
    if (!visual || typeof window.matchMedia !== "function" || window.matchMedia("(pointer: coarse)").matches) return;
    const reduced = () => document.documentElement.dataset.motion === "reduced" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const apply = (tx: number, ty: number) => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        visual.style.setProperty("--tilt-x", tx.toFixed(3));
        visual.style.setProperty("--tilt-y", ty.toFixed(3));
      });
    };
    const onMove = (event: PointerEvent) => {
      if (reduced()) return;
      const rect = visual.getBoundingClientRect();
      const nx = clamp((event.clientX - rect.left) / Math.max(rect.width, 1));
      const ny = clamp((event.clientY - rect.top) / Math.max(rect.height, 1));
      apply((nx - 0.5) * 6, (0.5 - ny) * 5);
    };
    const onLeave = () => apply(0, 0);
    visual.addEventListener("pointermove", onMove, { passive: true });
    visual.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      visual.removeEventListener("pointermove", onMove);
      visual.removeEventListener("pointerleave", onLeave);
      apply(0, 0);
    };
  }, []);

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === "ArrowRight" ? (index + 1) % 5 : event.key === "ArrowLeft" ? (index + 4) % 5 : event.key === "Home" ? 0 : event.key === "End" ? 4 : -1;
    if (next < 0) return;
    event.preventDefault(); setManualStage(next); tabs.current[next]?.focus();
  };

  return <Section id="methodology" index="03" name="The methodology" paper className="method-section">
    <div ref={track} className="method-track">
      <div className="method-sticky">
        <div className="section-intro"><Reveal><h2 className="section-heading" id="methodology-heading">From a trace<br /><em>to a finding.</em></h2></Reveal><Reveal delay={90}><p className="lede">{methodology.intro}</p></Reveal></div>
        <div className="method-layout">
          <div className="method-info">
            <div className="method-count"><strong>{stages[Math.round(clamp(selected, 0, 4))].index}</strong> / 05</div>
            {stages.map((stage, index) => <div key={stage.id} id={`method-panel-${index}`} role="tabpanel" aria-labelledby={`method-tab-${index}`} hidden={Math.round(clamp(selected, 0, 4)) !== index}>
              <h3>{stage.body}</h3><p>{stage.detail}</p>
              <div className="method-output"><span>Output</span><span>{stage.output}</span></div>
            </div>)}
          </div>
          <div ref={visualRef} className="method-visual"><EvidenceFlow stage={selected} /></div>
        </div>
        <div className="method-tabs" role="tablist" aria-label="The five stages of the methodology">
          {stages.map((stage, index) => <button key={stage.id} id={`method-tab-${index}`} ref={(node) => { tabs.current[index] = node; }} type="button" role="tab" className="method-tab" aria-controls={`method-panel-${index}`} aria-selected={Math.round(clamp(selected, 0, 4)) === index} tabIndex={Math.round(clamp(selected, 0, 4)) === index ? 0 : -1} onClick={() => setManualStage(index)} onKeyDown={(event) => onKey(event, index)}><span>{stage.index}</span>{stage.title}</button>)}
        </div>
        <div className="method-note"><span>{methodology.corePhrase}</span>{manualStage !== null ? <button type="button" className="method-reset" onClick={() => setManualStage(null)}>Resume scroll sequence</button> : <span className="scroll-method-hint">Scroll to follow, or select a step</span>}</div>
      </div>
    </div>
    <ConfidenceSection />
  </Section>;
}
