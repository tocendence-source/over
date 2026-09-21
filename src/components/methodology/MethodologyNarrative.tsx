import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { methodology, stages } from "@/data/methodology";
import { Section } from "@/components/layout/Section";
import { Reveal } from "@/components/ui/primitives";
import { ConfidenceSection } from "@/components/methodology/ConfidenceSection";
import { sceneBus } from "@/lib/sceneBus";
import { clamp } from "@/lib/motion";

const positions = [[140, 78], [285, 62], [393, 142], [368, 274], [239, 307], [112, 256], [80, 160], [246, 181]];
const edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [0, 7], [2, 7], [3, 7], [5, 7]];
const edgeLength = (a: number, b: number) => Math.hypot(positions[a][0] - positions[b][0], positions[a][1] - positions[b][1]);

/** Evidence flow, scrubbed by a continuous stage value 0..4: edges self-draw, nodes spread, validation deepens. */
function EvidenceFlow({ stage }: { stage: number }) {
  const stageInt = Math.round(clamp(stage, 0, 4));
  const validated = clamp(stage - 2.6);
  const reported = clamp(stage - 3.6);
  const coreSpread = clamp((stage - 0.25) / 0.75);
  return <svg className="method-graph" viewBox="0 0 500 365" role="img" aria-label={`Illustrative ${stages[stageInt].title.toLowerCase()} stage: ${stages[stageInt].output.toLowerCase()}. No real personal data.`}>
    <ellipse cx="246" cy="181" rx="195" ry="148" fill="none" stroke="#a8ac99" strokeWidth=".45" />
    <ellipse cx="246" cy="181" rx="172" ry="110" fill="none" stroke="#b0b2a3" strokeWidth=".45" transform="rotate(-25 246 181)" />
    <path d="M246 12v21m0 297v21M35 181h20m383 0h22" stroke="#8b927c" strokeWidth=".7" />
    {edges.map(([a, b], i) => {
      const len = edgeLength(a, b);
      const drawn = clamp((stage - 1.55 - i * 0.045) / 1.15);
      if (drawn <= 0) return null;
      return <line key={`e${i}`} className="method-edge" x1={positions[a][0]} y1={positions[a][1]} x2={positions[b][0]} y2={positions[b][1]} opacity={clamp(drawn * 1.25)} stroke={validated > 0 ? "#68754c" : "#8e825f"} strokeWidth={0.8 + validated * 0.5} strokeDasharray={len} strokeDashoffset={len * (1 - drawn)} />;
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
    <text x="246" y="359" textAnchor="middle" fill="#737a64" fontFamily="monospace" fontSize="8" letterSpacing="2">{stages[stageInt].output.toUpperCase()}</text>
  </svg>;
}

export function MethodologyNarrative() {
  const [autoStage, setAutoStage] = useState(0);
  const [manualStage, setManualStage] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const autoRef = useRef(0);
  const