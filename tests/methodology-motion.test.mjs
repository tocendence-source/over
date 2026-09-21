import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Bundle the actual TypeScript modules, without changing the application's dependencies.
async function loadModule(entry) {
  const directory = await mkdtemp(resolve(".over-test-"));
  const outfile = join(directory, "module.mjs");
  try {
    await build({ entryPoints: [entry], outfile, bundle: true, platform: "node", format: "esm", packages: "external", jsx: "automatic", logLevel: "silent" });
    return await import(pathToFileURL(outfile).href);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("characterization: methodology retains five tabs, output panels, and accessible graph", async () => {
  const { MethodologyNarrative } = await loadModule("src/components/methodology/MethodologyNarrative.tsx");
  const html = renderToStaticMarkup(createElement(MethodologyNarrative));
  assert.equal((html.match(/role="tab"/g) ?? []).length, 5);
  assert.equal((html.match(/role="tabpanel"/g) ?? []).length, 5);
  assert.equal((html.match(/aria-selected="true"/g) ?? []).length, 1);
  for (const label of ["Input", "Extraction", "Correlation", "Validation", "Evidence", "Initial trace"]) assert.ok(html.includes(label), label);
  assert.match(html, /role="img"/);
  assert.match(html, /No real personal data/);
  assert.match(html, /id="methodology"/);
});

test("characterization: scroll hooks initialize and remove their listeners", async () => {
  const cleanups = [];
  const listeners = new Map();
  const frames = new Map();
  let sequence = 0;
  const previous = new Map();
  for (const key of ["window", "document", "requestAnimationFrame", "cancelAnimationFrame", "__overEffect"]) previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  const set = (key, value) => Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  set("window", { innerWidth: 1440, innerHeight: 900, scrollY: 250, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: (name) => listeners.delete(name) });
  set("document", { documentElement: { scrollHeight: 1900 } });
  set("requestAnimationFrame", (callback) => { frames.set(++sequence, callback); return sequence; });
  set("cancelAnimationFrame", (id) => frames.delete(id));
  set("__overEffect", (callback) => cleanups.push(callback()));
  try {
    const result = await build({ stdin: { contents: 'export { useScrollTracking } from "./src/hooks/useScrollProgress.ts"; export { sceneBus } from "./src/lib/sceneBus.ts";', resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, platform: "node", format: "esm", plugins: [{ name: "effect-harness", setup(builder) { builder.onResolve({ filter: /^react$/ }, () => ({ path: "react", namespace: "harness" })); builder.onLoad({ filter: /.*/, namespace: "harness" }, () => ({ contents: "export const useEffect = globalThis.__overEffect; export const useRef = () => ({}); export const useState = () => [];" })); } }] });
    const hooks = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
    hooks.useScrollTracking();
    assert.equal(hooks.sceneBus.scroll, 0.25);
    listeners.get("scroll")();
    listeners.get("scroll")();
    assert.equal(frames.size, 1, "scroll events must coalesce into one frame");
    for (const cleanup of cleanups) cleanup?.();
    assert.equal(listeners.size, 0);
    assert.equal(frames.size, 0, "regression: unmount must cancel the pending frame");
  } finally {
    for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});

test("regression: stage geometry preserves fractional progress and reaches the final hold", async () => {
  const motion = await loadModule("src/lib/methodologyMotion.ts");
  assert.equal(motion.stageIndex(1.49), 1);
  assert.equal(motion.stageIndex(1.5), 2);
  assert.equal(motion.stageIndex(NaN), 0);
  assert.equal(motion.scrollStage(115, 2400, 700, 115), 0);
  const middle = motion.scrollStage(-400, 2400, 700, 115);
  assert.ok(middle > 0 && middle < 4 && !Number.isInteger(middle));
  assert.equal(motion.scrollStage(-2000, 2400, 700, 115), 4);
  assert.equal(motion.scrollStage(NaN, 2400, 700, 115), 0);
  let previous = 0;
  for (let top = 115; top >= -2400; top -= 10) {
    const stage = motion.scrollStage(top, 2400, 700, 115);
    assert.ok(stage >= previous && stage <= 4);
    previous = stage;
  }
  assert.equal(motion.smoothStage(1, 3, 0), 1);
  assert.ok(motion.smoothStage(1, 3, 1 / 60) > 1);
  assert.ok(motion.smoothStage(1, 3, 1 / 60) < 3);
  assert.equal(motion.smoothStage(2.9999, 3, 1 / 60), 3);
});

test("regression: local dev and preview do not accept arbitrary Host headers", async () => {
  const config = await readFile("vite.config.ts", "utf8");
  assert.doesNotMatch(config, /allowedHosts\s*:\s*true/);
});

// Opt-in real-browser checks: npm install --no-save --package-lock=false playwright
// then OVER_BROWSER_TESTS=1 node --test tests/methodology-motion.test.mjs
// Start the production preview on http://127.0.0.1:4173 beforehand.
test("browser: tabs, resume, scrolling, narrow layout and reduced motion", { skip: process.env.OVER_BROWSER_TESTS !== "1", timeout: 120000 }, async () => {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
    const section = page.locator("#methodology");
    await section.scrollIntoViewIfNeeded();
    const tabs = section.getByRole("tablist", { name: "The five stages of the methodology" }).getByRole("tab");
    assert.equal(await tabs.count(), 5);
    await tabs.nth(0).click();
    await page.keyboard.press("End");
    assert.equal(await tabs.nth(4).getAttribute("aria-selected"), "true");
    await page.keyboard.press("Home");
    assert.equal(await tabs.nth(0).getAttribute("aria-selected"), "true");
    await section.getByRole("button", { name: "Resume scroll sequence" }).click();
    assert.equal(await section.getByRole("button", { name: "Resume scroll sequence" }).count(), 0);
    await page.evaluate(() => {
      const track = document.querySelector(".method-track");
      const panel = document.querySelector(".method-sticky");
      const top = track.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top - 115 + (track.offsetHeight - panel.offsetHeight) * 0.35, behavior: "instant" });
    });
    await page.waitForTimeout(500);
    const progress = Number(await section.locator("[data-stage-progress]").getAttribute("data-stage-progress"));
    assert.ok(progress > 0 && progress < 4 && !Number.isInteger(progress), `fractional progress: ${progress}`);
    await tabs.nth(2).click();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(200);
    assert.equal(await section.getByRole("button", { name: "Resume scroll sequence" }).count(), 0);
    await page.setViewportSize({ width: 390, height: 844 });
    await section.scrollIntoViewIfNeeded();
    await tabs.nth(4).click();
    assert.equal(await tabs.nth(4).getAttribute("aria-selected"), "true");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await tabs.nth(0).click();
    await page.waitForTimeout(100);
    assert.equal(Number(await section.locator("[data-stage-progress]").getAttribute("data-stage-progress")), 0);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
