import { useCallback, useEffect, useState } from "react";
import { EXTERNAL_REL, safeHref } from "@/lib/security";

/**
 * Hash router. The build is a single static document, so routes are expressed
 * as hash paths — deep links and back/forward still behave like real routes.
 */

const readHash = () => {
  if (typeof window === "undefined") return "/";
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return "/";
  const path = (raw.startsWith("/") ? raw : `/${raw}`).replace(/\/$/, "") || "/";
  if (path === "/access") return "/contact";
  if (path === "/hero" || path === "/main") return "/";
  if (path === "/about") return "/operator";
  return path;
};

export const useRoute = () => {
  const [path, setPath] = useState(readHash);

  useEffect(() => {
    const onChange = () => setPath(readHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return path;
};

export const navigate = (to: string, opts: { replace?: boolean } = {}) => {
  const next = to.startsWith("/") ? to : `/${to}`;
  if (opts.replace) {
    const url = `${window.location.href.split("#")[0]}#${next}`;
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  if (window.location.hash !== `#${next}`) {
    window.location.hash = next;
  } else {
    const target = document.getElementById(next === "/" ? "entry" : next.slice(1));
    target?.scrollIntoView({ behavior: document.documentElement.dataset.motion === "reduced" ? "instant" : "smooth", block: "start" });
    if (target) {
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  }
};

type LinkProps = {
  to: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
  onNavigate?: () => void;
  tabIndex?: number;
  current?: boolean;
};

export function Link({ to, children, className, ariaLabel, onNavigate, tabIndex, current }: LinkProps) {
  const external = /^https?:\/\//i.test(to);
  const href = external ? safeHref(to) : `#${to.startsWith("/") ? to : `/${to}`}`;

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (external || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      onNavigate?.();
      navigate(to);
    },
    [external, onNavigate, to],
  );

  return (
    <a
      href={href}
      className={className}
      aria-label={ariaLabel}
      aria-current={current ? "location" : undefined}
      tabIndex={tabIndex}
      onClick={handleClick}
      {...(external ? { target: "_blank", rel: EXTERNAL_REL } : {})}
    >
      {children}
    </a>
  );
}

export const segments = (path: string) => path.split("/").filter(Boolean);
