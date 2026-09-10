/**
 * Security helpers. The site is untrusted-facing and fully static:
 * every rendered string is plain data, every external destination is validated.
 */

const ALLOWED_HOSTS = new Set(["t.me", "over.is-a.dev"]);

/** Strips control characters and angle brackets from data-bound text. */
export const sanitizeText = (value: string, maxLength = 400) =>
  value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[<>]/g, "")
    .slice(0, maxLength);

/** Rejects anything that is not an internal path or an allow-listed https host. */
export const safeHref = (href: string): string => {
  if (/[\u0000-\u0020\\]/.test(href)) return "/";
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  try {
    const url = new URL(href);
    return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname) && !url.username && !url.password && !url.port ? href : "/";
  } catch {
    return "/";
  }
};

/** External links must never leak the referring page or open a handle to this window. */
export const EXTERNAL_REL = "noopener noreferrer";

export const externalLinkProps = (href: string) => ({
  href: safeHref(href),
  target: "_blank",
  rel: EXTERNAL_REL,
});

export const isExternal = (href: string) => href.startsWith("http");

/** Length limits used for any future form input — enforced server-side too. */
export const INPUT_LIMITS = { name: 80, message: 1200 } as const;
