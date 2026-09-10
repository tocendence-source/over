# OVER Security Model

## Scope

OVER is a static public portfolio. There are no accounts, forms, bot API calls, private databases,
access checks, or live operational data. Removing the access UI did not expose any private backend;
there was no authentication system behind it.

No API keys or Telegram bot tokens are needed. `.env.example` and `environment.example` contain
documentation/placeholders only. Never add credentials under a `VITE_` prefix: those values are
public in the browser bundle.

## External Resources and Storage

- Contact destinations are controlled in `src/data/contacts.ts`. They open through explicit links,
  with `rel="noopener noreferrer"` and accessible external-destination labels.
- Project/portrait images currently use the public Telegram CDN hosts `cdn4.telesco.pe` and
  `cdn5.telesco.pe`. These are not locally stored copies of the chat attachments. The `<Artwork>`
  component serves the same-origin path first and only falls back to the CDN copy; drop the
  originals into `public/images/` and those hosts disappear from requests and from `img-src`.
- Fonts are self-hosted from `@fontsource/*` packages with system fallbacks; no font or
  stylesheet request leaves this origin.
- The only third-party requests remaining are the interim Telegram CDN images. Those servers
  receive ordinary browser requests (no referrer under the site's policy). The claim
  "no analytics" no longer involves any third-party code, font, or style provider.
- The site stores only the visitor's motion preference in `localStorage` under `over.scene`.
  Storage errors are caught. There are no application cookies or analytics scripts.
- Copy buttons use the browser clipboard only after a user action and report permission failures.

## URL and Input Handling

`src/lib/security.ts` validates destination URLs using parsed HTTPS hostnames. It rejects unknown
hosts, credentials in URLs, protocol-relative destinations, control characters, and backslashes.
UI components using direct anchors draw from the same controlled destination objects.

Route fragments are compared against known routes and project IDs. They are never injected as
HTML. React renders content as text. No `dangerouslySetInnerHTML` or dynamic script execution is
used. SVG illustrations contain synthetic, non-personal data only.

If server-side forms or integrations are added later, require server-side validation, rate
limiting, appropriate CSRF protection, and minimal security logging. Client-side helpers are
not a substitute for server validation.

## Browser Policy

`index.html` carries a strict CSP meta policy. Scripts run only from the same-origin, hash-named
files the build emits (`script-src 'self'` — no `'unsafe-inline'`, no `'unsafe-eval'`, no
`data:`), objects, embeds, base URL overrides, and form submissions are disabled, framing is
denied via `frame-ancestors 'none'`, and every runtime dependency (JavaScript, CSS, fonts,
images) except the two interim Telegram image CDNs is same-origin. `style-src` keeps
`'unsafe-inline'` because React positions diagrams and reveal timings through style attributes;
that remaining allowance scores zero in current security-header graders and cannot execute
script. The JSON-LD block in `index.html` is a data block, not an executable script, so it is
unaffected by `script-src`.

`public/_headers` mirrors that policy on hosts that support the convention (Netlify, Cloudflare
Pages) and adds what a document cannot set for itself:

- `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`.
- `Referrer-Policy: no-referrer`.
- HTTPS-only HSTS with a one-year lifetime, without a preload or subdomain-wide commitment
  (the `is-a.dev` zone already ships HSTS preloading).
- Permissions Policy disabling camera, microphone, location, payment, and USB; user-triggered
  clipboard writes are permitted for the site itself.
- `Cross-Origin-Opener-Policy: same-origin` (isolated browsing context group),
  `Cross-Origin-Embedder-Policy: credentialless` (safe alongside no-cors cross-origin images;
  switch to `require-corp` once the artwork originals are local), and
  `Cross-Origin-Resource-Policy: same-origin`.
- Immutable one-year caching for hash-named `/assets/*` builds, one-day caching for images,
  and revalidation for the entry document.

The `_headers` file is **not** respected by Vite or GitHub Pages. GitHub Pages therefore cannot
send `X-Content-Type-Options`, `X-Frame-Options`, `Permissions-Policy`, or the COOP/COEP/CORP
headers at all; serving the identical `dist/` from Netlify or Cloudflare Pages closes that gap
with no code changes. Two mitigations apply on GitHub Pages meanwhile: scanners (including the
MDN HTTP Observatory) honor the meta `frame-ancestors 'none'` for clickjacking scoring, and
`src/main.tsx` refuses to render inside any frame as a runtime backstop, before React mounts.
Check actual response headers after deployment.

### Remaining Tradeoffs

- The four artwork originals still arrive from `cdn4/cdn5.telesco.pe` until the owner adds the
  files to `public/images/` (paths are pre-wired; see README). Their hosts then leave `img-src`.
- `require-trusted-types-for 'script'` was evaluated and deliberately deferred: a single
  violation would blank the page, and the current sinks (React text rendering, no
  `dangerouslySetInnerHTML`, no dynamic script execution) keep that risk low. Revisit with a
  real-browser pass before enabling.
- `style-src 'unsafe-inline'` stays for React style attributes as documented above.

## Caching

The provided header file revalidates the entry document and gives public image files a one-day
cache lifetime. Images have stable filenames, so they are deliberately not marked immutable.
No private or authenticated responses exist. Future private responses must never use these
public cache rules.

## Review Status

The application builds, and source review found no credentials introduced by this revision.
`npm audit` reports zero vulnerabilities after pinning `vite` 7.3.6 and `esbuild` 0.28.1
(the previous advisories concerned the development server only, but the toolchain is kept
clean). `npm run verify` now enforces the security policy in CI: it fails on any regression of
`script-src 'self'`, missing `frame-ancestors/object-src/base-uri/form-action` restrictions,
third-party font or script origins, or inline scripts in the document. Dependabot watches npm
and GitHub Actions weekly. No penetration test, browser accessibility suite, or live-header
verification was run in this environment; the renderer, fallback paths, image host requests,
and dialogs benefit from a real-browser pass.

For security reports, use the public New_Over contact in the site's contact section or
`/.well-known/security.txt`. Do not send passwords, private Telegram content, or access tokens.