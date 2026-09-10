import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { methodology, stages } from "@/data/methodology";
import { Section } from "@/components/layout/Section";
import { Reveal } from "@/components/ui/primitives";
import { ConfidenceSection } from "@/components/methodology/ConfidenceSection";
import { sceneBus } from "@/lib/sceneBus";
import { clamp } from "@/lib/motion";

const positions = [[140, 78], [285, 62], [393, 142], [368, 274], [239, 307], [112, 256], [80, 160], [246, 181]];
const edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [0, 7], [2, 7], [3, 7], [5, 7]];

function EvidenceFlow({ stage }: { stage: number }) {
  const spread = stage > 0;
  return <svg className="method-graph" viewBox="0 0 500 365" role="img" aria-label={`Illustrative ${stages[stage].title.toLowerCase()} stage: ${stages[stage].output.toLowerCase()}. No real personal data.`}>
    <ellipse cx="246" cy="181" rx="195" ry="148" fill="none" stroke="#a8ac99" strokeWidth=".45" />
    <ellipse cx="246" cy="181" rx="172" ry="110" fill="none" stroke="#b0b2a3" strokeWidth=".45" transform="rotate(-25 246 181)" />
    <path d="M246 12v21m0 297v21M35 181h20m383 0h22" stroke="#8b927c" strokeWidth=".7" />
    {edges.map(([a, b], i) => <line key={i} x1={spread ? positions[a][0] : 246} y1={spread ? positions[a][1] : 181} x2={spread ? positions[b][0] : 246} y2={spread ? positions[b][1] : 181} opacity={stage >= 2 ? 1 : 0} stroke={stage >= 3 ? "#68754c" : "#8e825f"} strokeWidth={stage >= 3 ? 1.3 : .8} strokeDasharray={stage === 2 ? "4 4" : undefined} />)}
    {positions.map(([x, y], i) => <g key={i} opacity={spread || i === 7 ? 1 : 0}>
      <circle cx={spread ? x : 246} cy={spread ? y : 181} r={i === 7 ? 27 : stage >= 3 ? 12 : 8} fill={i === 7 ? "#333c28" : "#eae8df"} stroke="#747d5f" strokeWidth="1.1" />
      <circle cx={spread ? x : 246} cy={spread ? y : 181} r={i === 7 ? 4 : 2.7} fill={i === 7 ? "#d6c194" : "#8e7a4d"} />
      {stage >= 3 && i !== 7 && <circle cx={x} cy={y} r="18" fill="none" stroke="#939c7d" strokeWidth=".7" />}
    </g>)}
    <g opacity={stage === 4 ? 1 : 0}>
      <rect x="56" y="33" width="393" height="297" rx="1" fill="none" stroke="#788063" strokeWidth=".8" />
      <path d="M72 52h32M72 57h18M406 310l6 6 12-14" stroke="#6f7957" strokeWidth="1.1" fill="none" />
    </g>
    <text x="246" y="359" textAnchor="middle" fill="#737a64" fontFamily="monospace" fontSize="8" letterSpacing="2">{stages[stage].output.toUpperCase()}</text>
  </svg>;
}

export function MethodologyNarrative() {
  const [autoStage, setAutoStage] = useState(0);
  const [manualStage, setManualStage] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = manualStage ?? autoStage;

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      if (!track.current || window.innerWidth <= 800 || window.innerHeight < 760 || document.documentElement.dataset.motion === "reduced") return;
      if (document.activeElement && track.current.contains(document.activeElement)) return;
      const rect = track.current.getBoundingClientRect();
      const progress = clamp((115 - rect.top) / Math.max(rect.height - window.innerHeight * .75, 260));
      setAutoStage(Math.min(4, Math.floor(progress * 5)));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, []);
  useEffect(() => {
    sceneBus.stageIndex = selected;
    sceneBus.stageProgress = selected / 4;
  }, [selected]);

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
            <div className="method-count"><strong>{stages[selected].index}</strong> / 05</div>
            {stages.map((stage, index) => <div key={stage.id} id={`method-panel-${index}`} role="tabpanel" aria-labelledby={`method-tab-${index}`} hidden={selected !== index} tabIndex={0}>
              <h3>{stage.body}</h3><p>{stage.detail}</p>
              <div className="method-output"><span>Output</span><span>{stage.output}</span></div>
            </div>)}
          </div>
          <div className="method-visual"><EvidenceFlow stage={selected} /></div>
        </div>
        <div className="method-tabs" role="tablist" aria-label="The five stages of the methodology">
          {stages.map((stage, index) => <button key={stage.id} id={`method-tab-${index}`} ref={(node) => { tabs.current[index] = node; }} type="button" role="tab" className="method-tab" aria-controls={`method-panel-${index}`} aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} onClick={() => setManualStage(index)} onKeyDown={(event) => onKey(event, index)}><span>{stage.index}</span>{stage.title}</button>)}
        </div>
        <div className="method-note"><span>{methodology.corePhrase}</span>{manualStage !== null ? <button type="button" className="method-reset" onClick={() => setManualStage(null)}>Resume scroll sequence</button> : <span className="scroll-method-hint">Scroll to follow, or select a step</span>}</div>
      </div>
    </div>
    <ConfidenceSection />
  </Section>;
}