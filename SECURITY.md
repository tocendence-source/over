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
  `cdn5.telesco.pe`. These are not locally stored copies of the chat attachments. Replace them with
  the originals before a final production release where possible.
- Fonts are loaded from Google Fonts with system fallbacks.
- These providers receive ordinary browser requests, which may include IP addresses. The claim
  "no analytics" does not mean no third party ever receives a network request.
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

`index.html` contains a CSP meta policy. `public/_headers` adds the following on hosts that support
that convention, such as Netlify and Cloudflare Pages:

- CSP with `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`, and `frame-ancestors 'none'`.
- `X-Content-Type-Options: nosniff`.
- `X-Frame-Options: DENY`.
- `Referrer-Policy: no-referrer`.
- HTTPS-only HSTS with a one-year lifetime, without a preload or subdomain-wide commitment.
- Permissions Policy disabling camera, microphone, location, payment, and USB; user-triggered
  clipboard writes are permitted for the site itself.
- `Cross-Origin-Opener-Policy: same-origin`.

The `_headers` file is **not** automatically respected by Vite, GitHub Pages, nginx, or every CDN.
Configure equivalent response headers on those hosts. `frame-ancestors`, HSTS, and frame denial
cannot be enforced by a CSP meta tag. Check actual response headers after deployment.

### Current CSP Tradeoffs

The preserved single-file build emits inline scripts and styles. Its current policy consequently
allows `script-src 'unsafe-inline'` and `style-src 'unsafe-inline'`. No `unsafe-eval` is used.
React also writes inline styles for diagram positions and reveal timings.

For a more restrictive deployment, serve separate hashed JavaScript/CSS assets or generate
build-specific script hashes. Self-host the fonts and owner-supplied artwork, then remove Google
Fonts and Telegram CDN origins from the policy. Do not enable strict cross-origin embedder
isolation without checking the external image providers' CORP/CORS behaviour.

## Caching

The provided header file revalidates the entry document and gives public image files a one-day
cache lifetime. Images have stable filenames, so they are deliberately not marked immutable.
No private or authenticated responses exist. Future private responses must never use these
public cache rules.

## Review Status

The application builds, and source review found no credentials introduced by this revision.
No dependency audit, penetration test, browser accessibility suite, or live-header verification
was run in this environment. A prior package installation reported dependency advisories;
do not assume these have been resolved. Run `npm audit` and review the current dependency tree
before publishing. The renderer, fallback paths, image host requests, and dialogs also need
real-browser testing.

For security reports, use the public New_Over contact in the site's contact section. Do not send
passwords, private Telegram content, or access tokens.