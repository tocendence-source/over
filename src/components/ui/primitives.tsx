import type { ReactNode } from "react";
import { useReveal } from "@/hooks/useReveal";
import { cn } from "@/utils/cn";

export function TechnicalLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("label", className)}>{children}</span>;
}

export function Reveal({ children, delay = 0, mask = false, className, as: Tag = "div" }: {
  children: ReactNode;
  delay?: number;
  mask?: boolean;
  className?: string;
  as?: "div" | "li" | "section" | "span" | "p";
}) {
  const { ref, inView } = useReveal<HTMLElement>({ threshold: 0.08 });
  return (
    <Tag ref={ref as never} className={cn(mask ? "mask-reveal" : "reveal", inView && "in", className)}
      style={{ ["--reveal-delay" as string]: `${delay}ms` }}>
      {children}
    </Tag>
  );
}

export function SectionMarker({ index, name, className }: { index: string; name: string; className?: string }) {
  return (
    <div className={cn("section-marker", className)}>
      <span className="section-marker__number">{index} /</span>
      <span className="section-marker__name">{name}</span>
    </div>
  );
}

export function OverMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <ellipse cx="16" cy="16" rx="8.5" ry="13" transform="rotate(38 16 16)" stroke="currentColor" strokeWidth="1.65" />
      <ellipse cx="16" cy="16" rx="13" ry="5.5" transform="rotate(-28 16 16)" stroke="currentColor" strokeWidth="1.15" />
      <circle cx="16" cy="16" r="2.5" fill="currentColor" />
    </svg>
  );
}