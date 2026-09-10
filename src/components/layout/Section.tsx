import type { ReactNode } from "react";
import { SectionMarker } from "@/components/ui/primitives";
import { cn } from "@/utils/cn";

export function Section({ id, index, name, children, className, paper = false }: {
  id: string; index: string; name: string; children: ReactNode; className?: string; paper?: boolean;
}) {
  return <section id={id} aria-labelledby={`${id}-heading`} className={cn("section", paper ? "section-paper" : "section-dark", className)}>
    <div className="wrap"><SectionMarker index={index} name={name} />{children}</div>
  </section>;
}