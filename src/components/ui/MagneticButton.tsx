import type { MouseEvent, ReactNode } from "react";
import { navigate } from "@/lib/router";
import { EXTERNAL_REL, safeHref } from "@/lib/security";
import { cn } from "@/utils/cn";

type ActionProps = {
  children: ReactNode;
  className?: string;
  variant?: "solid" | "outline" | "ghost";
  ariaLabel?: string;
  to?: string;
  href?: string;
  onClick?: () => void;
  pressed?: boolean;
};

export function Action({ children, className, variant = "outline", ariaLabel, to, href, onClick, pressed }: ActionProps) {
  const external = Boolean(href);
  const content = <><span className="btn-label">{children}</span><span className="btn-icon"><ArrowGlyph direction={external ? "up-right" : "right"} /></span></>;
  const shared = { className: cn("btn", `btn-${variant}`, className), "aria-label": ariaLabel };
  if (onClick) return <button type="button" onClick={onClick} aria-pressed={pressed} {...shared}>{content}</button>;
  if (href) return <a href={safeHref(href)} target="_blank" rel={EXTERNAL_REL} {...shared}>{content}<span className="sr-only"> (Telegram, opens in a new tab)</span></a>;
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    navigate(to ?? "/");
  };
  return <a href={`#${to ?? "/"}`} onClick={handleClick} {...shared}>{content}</a>;
}

export function ArrowGlyph({ direction = "up-right" }: { direction?: "right" | "up-right" | "down" | "left" }) {
  const path = direction === "up-right" ? "M5 19 19 5M5 5h14v14"
    : direction === "down" ? "M12 4v16M5 13l7 7 7-7"
    : direction === "left" ? "M20 12H4m7-7-7 7 7 7"
    : "M4 12h16m-7-7 7 7-7 7";
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>;
}