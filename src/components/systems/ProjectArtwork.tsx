import { useId } from "react";
import type { System } from "@/types/content";
import { Artwork } from "@/components/ui/Artwork";

export function ProjectArtwork({ system }: { system: System }) {
  if (system.artwork) return <Artwork id={system.artwork} />;
  return <ProjectSculpture protection={system.id === "cislog"} />;
}

function ProjectSculpture({ protection }: { protection: boolean }) {
  const gradient = useId().replace(/:/g, "");
  const nodes = [[135, 112], [267, 67], [382, 128], [398, 265], [251, 321], [104, 250], [243, 192]];
  const edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6]];
  return (
    <svg viewBox="0 0 500 390" className="project-sculpture" role="img" aria-label={protection ? "Sculptural shield illustration for user protection" : "Illustrative digital-trace relationship graph, not real personal data"}>
      <defs>
        <linearGradient id={`${gradient}metal`} x1="0" y1="0" x2="1" y2=".9"><stop stopColor="#f5e6bf" /><stop offset=".27" stopColor="#9f8c61" /><stop offset=".52" stopColor="#ebd09a" /><stop offset=".73" stopColor="#544931" /><stop offset="1" stopColor="#ba9e65" /></linearGradient>
        <radialGradient id={`${gradient}dark`} cx=".3" cy=".2"><stop stopColor="#414033" /><stop offset=".6" stopColor="#20231a" /><stop offset="1" stopColor="#10130c" /></radialGradient>
      </defs>
      {protection ? <g>
        {Array.from({ length: 9 }, (_, i) => <path key={i} d="M250 60 371 109v105c0 59-55 99-121 129-66-30-121-70-121-129V109L250 60Z" transform={`translate(${i * 2} ${i * -1.3})`} fill={i === 0 ? `url(#${gradient}dark)` : "none"} stroke={`url(#${gradient}metal)`} strokeWidth={i === 8 ? 2.5 : .7} opacity={.17 + i * .08} />)}
        <path d="m205 204 34 33 64-74" fill="none" stroke={`url(#${gradient}metal)`} strokeWidth="4" />
        <path d="M75 196h35m280 0h35M250 27v19m0 303v18" stroke="#827956" strokeWidth=".7" />
      </g> : <g>
        <ellipse cx="249" cy="192" rx="196" ry="147" stroke="#b5a373" strokeWidth=".5" opacity=".2" fill="none" transform="rotate(-19 249 192)" />
        {edges.map(([a, b], i) => <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke={`url(#${gradient}metal)`} strokeWidth={i > 5 ? 1 : .7} opacity={i > 5 ? .8 : .5} />)}
        <circle cx="243" cy="192" r="56" fill={`url(#${gradient}dark)`} stroke={`url(#${gradient}metal)`} strokeWidth="1.5" />
        <ellipse cx="243" cy="192" rx="85" ry="26" fill="none" stroke={`url(#${gradient}metal)`} strokeWidth="1.4" transform="rotate(-28 243 192)" />
        <ellipse cx="243" cy="192" rx="31" ry="78" fill="none" stroke={`url(#${gradient}metal)`} strokeWidth=".8" transform="rotate(-28 243 192)" />
        {nodes.slice(0, 6).map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="10" fill={`url(#${gradient}dark)`} stroke={`url(#${gradient}metal)`} strokeWidth="1.2" /><circle cx={x} cy={y} r="3" fill="#d9bf83" /></g>)}
        <circle cx="243" cy="192" r="5" fill="#e8d9b4" />
      </g>}
    </svg>
  );
}