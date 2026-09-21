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
  /** Sub-stage scroll deltas below this do not re-render — the scrub settles quietly. */
  settleEpsilon: 0.002,
} as const;

/**
 * Illustrative evidence flow, scrubbed by continuous stage progress (0..4) so
 * edges self-draw and nodes spread instead of snapping between five states.
 */
function EvidenceFlow({ stage }: { stage: number }) {
  // Per-edge draw progress, eased from the shared stage value with a stagger.
  const edgeDraw = edges.map((_, i) => clamp((stage - 1.55 - i * 0.045) / 1.15));
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
    <text x="246" y="359" textAnchor="middle" fill="#737a64" fontFamily="monospace" fontSize="8" letterSpacing="2">{output}</text>
  </svg>;
}

export function MethodologyNarrative() {
  /** Continuous stage value 0..4 — the float drives the SVG scrub. */
  const [autoStage, setAutoStage] = useState(0);
  const [manualStage, setManualStage] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const autoStageRef = useRef(0);
  const selected = manualStage ?? autoStage;
  /** The integer stage drives copy, panels and tabs. */
  const stageIndex = Math.round(clamp(selected, 0, 4));

  const setScrolledStage = (next: number) => {
    const value = Math.min(4, Math.max(0, next));
    if (Math.abs(value - autoStageRef.current) < SCRUB.settleEpsilon) return;
    autoStageRef.current = value;
    setAutoStage(value);
  };

  useEffect(() => {
    const node = track.current;
    if (!node) return;
    let frame = 0;

    const reduced