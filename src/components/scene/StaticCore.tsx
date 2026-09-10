import { cn } from "@/utils/cn";

const TICKS = Array.from({ length: 72 }, (_, i) => i);

/**
 * Static evidence core — the no-WebGL / low-power composition.
 * Same instrument language as the 3D scene: segmented dark shell with gold
 * seams, graduated armillary rings, gimbal pivots, capsules and sparse nodes.
 * Pure SVG, no scripts, no assets.
 */
export function StaticCore({ className, dim = false }: { className?: string; dim?: boolean }) {
  return (
    <svg
      viewBox="0 0 600 600"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label="Abstract evidence core: a segmented dark metallic sphere with gold seams inside graduated gold armillary rings, with sparse connection nodes and glass capsules."
    >
      <defs>
        <radialGradient id="sc-core" cx="36%" cy="32%" r="74%">
          <stop offset="0%" stopColor="#2c261c" />
          <stop offset="48%" stopColor="#14120e" />
          <stop offset="100%" stopColor="#080807" />
        </radialGradient>
        <radialGradient id="sc-kernel" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff0cd" />
          <stop offset="45%" stopColor="#e2c77a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#c8a65a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sc-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(226,199,122,0.32)" />
          <stop offset="55%" stopColor="rgba(200,166,90,0.07)" />
          <stop offset="100%" stopColor="rgba(200,166,90,0)" />
        </radialGradient>
        <linearGradient id="sc-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(226,199,122,0.9)" />
          <stop offset="55%" stopColor="rgba(200,166,90,0.4)" />
          <stop offset="100%" stopColor="rgba(114,93,50,0.18)" />
        </linearGradient>
        <linearGradient id="sc-glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(241,235,221,0.05)" />
          <stop offset="50%" stopColor="rgba(241,235,221,0.22)" />
          <stop offset="100%" stopColor="rgba(241,235,221,0.05)" />
        </linearGradient>
      </defs>

      <circle cx="300" cy="300" r="280" fill="url(#sc-glow)" />

      {/* outer graduated ring */}
      <g className={dim ? "" : "origin-center animate-[rot-cw_240s_linear_infinite]"} style={{ transformBox: "fill-box" }}>
        <circle cx="300" cy="300" r="262" fill="none" stroke="url(#sc-ring)" strokeWidth="1.2" />
        {TICKS.map((i) => {
          const a = (i / TICKS.length) * Math.PI * 2;
          const major = i % 6 === 0;
          const r0 = 266;
          const r1 = r0 + (major ? 14 : 6);
          return (
            <line
              key={i}
              x1={300 + Math.cos(a) * r0}
              y1={300 + Math.sin(a) * r0}
              x2={300 + Math.cos(a) * r1}
              y2={300 + Math.sin(a) * r1}
              stroke={major ? "rgba(226,199,122,0.7)" : "rgba(200,166,90,0.35)"}
              strokeWidth="0.9"
            />
          );
        })}
      </g>

      {/* tilted band ring with dial face */}
      <g className={dim ? "" : "origin-center animate-[rot-ccw_300s_linear_infinite]"} style={{ transformBox: "fill-box" }}>
        <ellipse cx="300" cy="300" rx="226" ry="82" fill="none" stroke="rgba(226,199,122,0.55)" strokeWidth="1" transform="rotate(-26 300 300)" />
        <ellipse cx="300" cy="300" rx="216" ry="76" fill="none" stroke="rgba(226,199,122,0.16)" strokeWidth="9" transform="rotate(-26 300 300)" />
      </g>

      {/* inner gimbal ring with pivots */}
      <g className={dim ? "" : "origin-center animate-[rot-cw_180s_linear_infinite]"} style={{ transformBox: "fill-box" }}>
        <ellipse cx="300" cy="300" rx="178" ry="172" fill="none" stroke="rgba(200,166,90,0.42)" strokeWidth="1" transform="rotate(38 300 300)" />
        <circle cx="122" cy="300" r="4" fill="#e2c77a" />
        <circle cx="478" cy="300" r="4" fill="#e2c77a" />
      </g>

      {/* segmented shell */}
      <circle cx="300" cy="300" r="146" fill="url(#sc-core)" />
      <g stroke="rgba(226,199,122,0.34)" fill="none" strokeWidth="0.9">
        <polygon points="300,154 426,226 426,374 300,446 174,374 174,226" />
        <path d="M300 154v292M174 226l252 148M426 226L174 374" />
        <path d="M300 154 237 300 300 446M300 154 363 300 300 446" opacity="0.6" />
        <path d="M174 226 300 300 426 226M174 374 300 300 426 374" opacity="0.6" />
      </g>
      <circle cx="300" cy="300" r="46" fill="url(#sc-kernel)" />
      <circle cx="300" cy="300" r="18" fill="#f2dfa8" />

      {/* glass capsules on the band track */}
      <g transform="rotate(-26 300 300)">
        <rect x="486" y="291" width="58" height="18" rx="9" fill="url(#sc-glass)" stroke="rgba(226,199,122,0.5)" strokeWidth="0.8" />
        <rect x="498" y="298" width="34" height="4" rx="2" fill="#e2c77a" />
        <rect x="56" y="291" width="58" height="18" rx="9" fill="url(#sc-glass)" stroke="rgba(226,199,122,0.35)" strokeWidth="0.8" />
        <rect x="68" y="298" width="34" height="4" rx="2" fill="#c8a65a" opacity="0.7" />
      </g>

      {/* sparse nodes + edges */}
      <g stroke="rgba(226,199,122,0.35)" strokeWidth="0.7">
        <path d="M466 222 512 178M126 356 92 402M300 154 300 96" />
      </g>
      <g fill="#e2c77a">
        <circle cx="512" cy="178" r="2.6" opacity="0.9" />
        <circle cx="92" cy="402" r="2.2" opacity="0.7" />
        <circle cx="300" cy="96" r="2.4" opacity="0.8" />
        <circle cx="466" cy="222" r="1.8" opacity="0.6" />
        <circle cx="126" cy="356" r="1.8" opacity="0.6" />
      </g>
    </svg>
  );
}
