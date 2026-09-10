# OVER

An editorial portfolio for the OVER research community, its OSINT projects, and New_Over.
The existing procedural 3D artifact is retained, with a quieter interface inspired by the
spatial clarity and typography of Sharplink. No reference layout, artwork, code, or branding
has been copied.

## Setup

- React 19, TypeScript, Vite 7, Tailwind CSS 4, and Three.js.
- `npm install` installs the existing dependencies.
- `npm run dev` starts development.
- `npm run build` writes the deployment to `dist/`.
- `npm run preview` previews that deployment.
- No environment variables, Telegram credentials, or backend are required.

Deploy the **whole `dist/` directory**, not only `index.html`. The build inlines JavaScript and
CSS but leaves image assets, the sitemap, robots.txt, and header configuration as separate files.
The current Vite configuration is preserved. This is not a Next.js application.

## What Changed

- Removed the access section, clearance copy, LIMITED labels, node identifiers, fabricated
  telemetry, and the blocking introduction at the owner's request.
- Replaced small terminal-style buttons with readable capsule actions and an animated arrow.
- Added alternating graphite and warm-paper sections, a larger OVER wordmark, project artwork,
  a human-readable about section, and direct Telegram contact links.
- Preserved all four systems, their useful capabilities, the five-stage methodology, confidence
  labels, OSINT / GEOINT / HUMINT positioning, community roles, and the operator's public handles.
- Kept the original ShkoloDrive invitation as a secondary direct channel link. Its publicly
  verified `@ShkoloDrive` adapter is the main destination, without any clearance UI.
- No fake case studies, metrics, institutional affiliations, or biographies were added.
- Link review found that `@cislog` now displays a VPN service. Its original user-protection
  description and destination are preserved as an explicitly labelled archive, not presented as
  a verified active protection service. A replacement protection-project link was not invented.

## Artwork: Originals Still Required

The four images attached in chat were visible as references, but **were not available as files
in this workspace**. They have not been recreated or represented as exact local originals.

For now, `src/data/artwork.ts` uses image URLs extracted from the network's public Telegram
pages. These may differ from the attachments and Telegram CDN URLs may expire. The image
component has an in-brand fallback if a remote image fails.

To install the exact four originals:

| Chat image | Local file | Record in `src/data/artwork.ts` |
| --- | --- | --- |
| 1. OVER Adapter | `public/images/over-adapter.jpg` | `adapter` |
| 2. OVER Clan | `public/images/over-clan.jpg` | `clan` |
| 3. Personal avatar | `public/images/new-over.jpg` | `operator` |
| 4. ShkoloDrive | `public/images/shkolodrive.jpg` | `shkolodrive` |

After adding each file, set that record's `local` property to its URL, for example
`local: "/images/over-adapter.jpg"`. No layout changes are necessary. Local files take priority
over the public Telegram image. Do not import all public images into JavaScript; that would
duplicate image bytes in the single-file bundle.

`public/images/evidence-core.jpg` is a newly generated still of the abstract artifact, used only
for loading, reduced motion, disabled WebGL, and error recovery. It is not a replacement for any
of the owner's four images. `public/images/og.jpg` remains the social preview.

## Content and Routes

| Location | Purpose |
| --- | --- |
| `src/data/site.ts` | Brand, introductory text, and section copy |
| `src/data/contacts.ts` | Single source for every outbound contact destination |
| `src/data/systems.ts` | Project descriptions, capabilities, and route IDs |
| `src/data/network.ts` | Research, analysis, security, and data roles |
| `src/data/methodology.ts` | Five stages and qualitative confidence descriptions |
| `src/data/operator.ts` | Factual founder/operator information |
| `src/data/artwork.ts` | Image provenance, replacement filenames, and alt text |

The site uses hash routing so direct links work on static hosts without a rewrite rule.

| URL | Behaviour |
| --- | --- |
| `/` | Complete single-page portfolio |
| `#/network` | Scroll to the network |
| `#/systems` | Scroll to the interactive project index |
| `#/methodology` | Scroll to the methodology |
| `#/operator` | Scroll to New_Over |
| `#/contact` | Scroll to contact links |
| `#/systems/overnetting` | OverNetting detail |
| `#/systems/shkolodrive` | ShkoloDrive detail |
| `#/systems/over-adapter` | OVER Adapter detail |
| `#/systems/cislog` | CISLOG detail |
| `#/access`, `#access` | Redirect to contact; no access page remains |
| `#hero`, `#/hero` | Home |
| Unknown hash route | A usable not-found view |

Legacy `#network` and `#contact` anchors still work. Only the root is listed in the sitemap
because fragment routes are parts of the same indexable document. A semantic no-JavaScript
content summary with real project/contact links is included in `index.html`.

## Interactions

- A pointer instrument layer (`src/lib/traceOverlay.ts`) turns the cursor into a scanner: a reticle
  trails it, detection frames lock onto the path it travels, dashed lines correlate them, and
  corner brackets snap to whichever control is hovered. Clicking empty space commits one frame.
  Labels show the pointer's real screen coordinates and ambient words only — never invented
  confidence scores. Ink flips between ivory and graphite so it stays readable on light sections.
  It is mouse-only, decorative, `aria-hidden`, disabled by the motion toggle and by reduced motion,
  and its loop sleeps while the pointer is idle.
- The project index supports clicks, pointer feedback, arrow keys, Home, and End. A project
  selection updates the related capsule in the 3D scene. Detail pages include previous/next links.
- The network diagram lets visitors select a role and read its description.
- On desktop, scrolling moves through the methodology. Selecting a stage switches to manual
  control until "Resume scroll sequence" is chosen. Mobile uses the same fully keyboard-operable
  stage controls without a long sticky scroll area.
- Confidence labels are qualitative. No invented percentages or live data appear in the diagrams.
- The avatar/community artwork can be enlarged in native HTML dialogs. Escape closes them,
  focus returns to the trigger, and the background cannot receive focus while the dialog is open.
- Contact handles can be copied. The UI reports actual clipboard success or failure.
- "Motion paused" replaces WebGL with the static image and stops CSS motion. The preference is
  stored locally. System reduced-motion preferences take priority.

## 3D and Performance

The existing segmented metal shell, inner kernel, gyroscope, engraved rings, four glass capsules,
and procedural studio environment remain in `src/webgl/EvidenceCoreScene.ts`.

- Desktop: full artifact with limited bloom only when floating-point render targets are supported.
- Mid-range: fewer particles and fragments, lower DPR, no bloom.
- Narrow mobile: simplified artifact, fewer rings, no particles or fragments, DPR 1.
- Reduced motion / no WebGL / renderer or context error: still image; SVG is a second fallback.
- The fixed canvas stops rendering behind opaque sections and while the document is hidden.
- Shader errors are routed to the image fallback instead of leaving an empty canvas.
- Renderer resources, post-processing passes, and textures are disposed on teardown.

The module is dynamically imported after the first paint, but the existing `vite-plugin-singlefile`
configuration inlines its code. This defers execution, **not the download of Three.js**. True
network code-splitting is a future hosting/build change, not a property of the current bundle.

## Verification

The production build has been run successfully during this revision. The editing tools report
no remaining TypeScript diagnostics, and source searches confirmed removal of the old access
copy and centralisation of contact links. All seven public Telegram destination pages were
retrieved; this checks the public page, not bot functionality, channel admission, or ownership.

`node scripts/verify.mjs` provides a repeatable TypeScript and content-integrity check for local
development. This script is supplied but has not been executed in this tool environment.

The environment does not expose a browser or a general-purpose test runner. Do not interpret
the build as a visual, accessibility, performance, or dependency-security certification.

Before release, check:

- Layout at 360, 390, 430, 768, 1024, 1280, 1440, and 1920px.
- Keyboard navigation, dialog closing and focus return, project/method tabs, and clipboard errors.
- System reduced motion, motion toggle persistence, unavailable local storage, and blocked WebGL.
- A simulated WebGL context loss and blocked Telegram image requests.
- All public Telegram destinations, the original ShkoloDrive invitation, and the four exact images.
- Production response headers and social preview URLs on the deployed host.
- `npm audit`, Lighthouse, and an accessibility scanner. These have not been run in this revision.

Security and hosting details are in `SECURITY.md`.