import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import ts from "typescript";

// Run lifecycle regression tests against the actual transpiled hook module.
const motionTests = spawnSync(process.execPath, ["--test", "scripts/motion.test.mjs"], { stdio: "inherit" });
if (motionTests.error) throw motionTests.error;
assert.equal(motionTests.status, 0, "Motion lifecycle tests must pass");

const configPath = ts.findConfigFile(".", ts.sys.fileExists, "tsconfig.json");
assert(configPath, "tsconfig.json is required");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ".");
const program = ts.createProgram(parsed.fileNames, parsed.options);
const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (file) => file,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => "\n",
  }));
  process.exitCode = 1;
} else {
  console.log("TypeScript: no diagnostics.");
}

const read = (file) => readFileSync(file, "utf8");
const systems = read("src/data/systems.ts");
for (const id of ["overnetting", "shkolodrive", "over-adapter", "cislog"]) {
  assert(systems.includes(`id: "${id}"`), `Missing project ${id}`);
  assert(systems.includes(`href: "/systems/${id}"`), `Missing route ${id}`);
}

const contacts = read("src/data/contacts.ts");
for (const destination of ["https://t.me/over_adpt", "https://t.me/overnetting_bot", "https://t.me/+OI5UGXchMRg1NDY6", "https://t.me/ShkoloDrive", "https://t.me/cislog", "https://t.me/New_Over", "https://t.me/cisinter_4"]) {
  assert(contacts.includes(destination), `Missing public destination ${destination}`);
}

const methodology = read("src/data/methodology.ts");
for (const id of ["input", "extraction", "correlation", "validation", "evidence"]) assert(methodology.includes(`id: "${id}"`));
for (const state of ["LOW", "MED", "HIGH", "CONFIRMED"]) assert(methodology.includes(`label: "${state}"`));

function files(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(join(path, entry.name)) : [join(path, entry.name)]);
}
for (const file of [...files("src/components"), ...files("src/pages"), ...files("src/data")].filter((file) => /\.(ts|tsx)$/.test(file))) {
  assert(!/CLEARANCE REQUIRED|Access level|REQUEST ACCESS|Contact operator|OVER-771X|"LIMITED"/i.test(read(file)), `Old access copy in ${file}`);
}
assert(read("src/lib/router.tsx").includes('path === "/access"'));
console.log("Content: four projects, seven controlled destinations, five methodology stages, four confidence states, and no old access UI.");

// --- Browser security policy -------------------------------------------------
const html = read("index.html");

// Exactly one CSP meta policy, and it must stay parsable by strict CSP parsers
// (the HTTP Observatory rejects policies with duplicated directives).
const cspTags = html.match(/<meta\s+http-equiv="Content-Security-Policy"[^>]*>/g) ?? [];
assert.equal(cspTags.length, 1, "index.html must declare exactly one CSP meta policy");
const policy = cspTags[0].match(/content="([^"]+)"/)?.[1] ?? "";
const directives = Object.fromEntries(policy.split(";").map((part) => part.trim().split(/\s+/)).filter(([name]) => name).map(([name, ...sources]) => [name, sources]));

assert.equal(directives["script-src"]?.join(" "), "'self'", "script-src must be exactly 'self' (no inline bundle, nonces, or broad sources)");
assert(!policy.includes("unsafe-eval"), "CSP must never allow unsafe-eval");
assert(!directives["script-src"]?.some((source) => source.includes("unsafe-inline") || source === "data:" || source === "https:" || source === "*"), "script-src must not allow unsafe-inline, data:, https:, or *");
assert.equal(directives["object-src"]?.join(" "), "'none'", "object-src must be 'none'");
assert.equal(directives["base-uri"]?.join(" "), "'none'", "base-uri must be 'none'");
assert.equal(directives["form-action"]?.join(" "), "'none'", "form-action must be 'none'");
assert.equal(directives["frame-ancestors"]?.join(" "), "'none'", "frame-ancestors must be 'none' (denies framing where no XFO header exists)");
assert.equal(directives["font-src"]?.join(" "), "'self'", "font-src must be 'self' (fonts are self-hosted)");
assert(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(policy), "no third-party font origins belong in the CSP");
assert(directives["upgrade-insecure-requests"], "upgrade-insecure-requests must stay enabled");

// No third-party stylesheets, scripts, or preconnects may creep back into the
// document — every runtime dependency must ship from this repository.
assert(!/fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr|unpkg\.com/.test(html), "third-party CDN references are not allowed in index.html");
assert(!/<script(?![^>]*\bsrc=)/.test(html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, "")), "index.html must not contain inline scripts (the JSON-LD data block is exempt)");

// Fonts are bundled from @fontsource packages at build time.
const entry = read("src/main.tsx");
for (const face of ["instrument-serif/400", "instrument-serif/400-italic", "instrument-sans/400", "instrument-sans/500", "instrument-sans/600", "jetbrains-mono/300", "jetbrains-mono/400", "jetbrains-mono/500"]) {
  assert(entry.includes(`@fontsource/${face}.css`), `Missing self-hosted font import ${face}`);
}
console.log("Policy: strict CSP verified (script-src 'self', frame-ancestors 'none', no third-party origins), fonts self-hosted, no inline scripts.");

// --- Deployment header parity --------------------------------------------------
// public/_headers is what Netlify/Cloudflare Pages (or any future host that
// honors the convention) will send; it must mirror — and may exceed — the meta CSP.
const headers = read("public/_headers");
assert(headers.includes("X-Content-Type-Options: nosniff"), "_headers must set X-Content-Type-Options: nosniff");
assert(headers.includes("X-Frame-Options: DENY"), "_headers must set X-Frame-Options: DENY");
assert(headers.includes("frame-ancestors 'none'"), "_headers CSP must set frame-ancestors 'none'");
assert(headers.includes("script-src 'self'") && !headers.match(/script-src[^;]*unsafe-inline/), "_headers script-src must be 'self' without unsafe-inline");
assert(headers.includes("Cross-Origin-Opener-Policy: same-origin"), "_headers must isolate the browsing context group (COOP)");
assert(headers.includes("Cross-Origin-Embedder-Policy: credentialless"), "_headers must set COEP credentialless (safe with no-cors cross-origin images)");
assert(headers.includes("Cross-Origin-Resource-Policy: same-origin"), "_headers must set CORP same-origin");
console.log("Deployment: _headers mirror the strict policy (nosniff, XFO, COOP/COEP/CORP).");

// --- Artwork originals ---------------------------------------------------------
// Local originals take priority once present; until then the interim CDN copy is
// used. Missing files are a checklist, not a build failure.
const artwork = read("src/data/artwork.ts");
const missing = [];
for (const id of ["adapter", "clan", "operator", "shkolodrive"]) {
  const record = new RegExp(`${id}:\\s*\\{[\\s\\S]*?local:\\s*"(/images/[^"]+)"`).exec(artwork);
  assert(record, `artwork record ${id} must declare its local /images URL`);
  if (!existsSync(join("public", record[1]))) missing.push(`public${record[1]}`);
}
if (missing.length) {
  console.warn(`Artwork: awaiting owner-supplied originals (serving CDN fallback meanwhile):\n  - ${missing.join("\n  - ")}`);
} else {
  console.log("Artwork: all four originals are local; the telesco.pe hosts can leave img-src.");
}
console.log("Browser, deployment-header, and dependency-audit checks remain separate.");
