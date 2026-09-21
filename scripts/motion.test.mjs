import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Script, createContext } from "node:vm";
import ts from "typescript";

// Deterministic adapters execute the real TS/TSX modules, not copied algorithms.
// These tests do not replace React DOM, browser layout or accessibility tests.
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const compile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const compiled = compile(read("src/hooks/useScrollProgress.ts"));

function harness() {
  const effects = [];
  const listeners = new Map();
  const frames = new Map();
  let nextId = 0;
  const sceneBus = { scroll: 0, scrollPx: 0, viewport: {}, pointer: { tx: 0, ty: 0 }, reduced: false };
  const window = {
    innerWidth: 1000, innerHeight: 800, scrollY: 0,
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
    },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
  };
  const document = { documentElement: { scrollHeight: 2400 } };
  const exports = {};
  const context = createContext({
    exports, window, document,
    requestAnimationFrame(callback) { const id = ++nextId; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    require(name) {
      if (name === "react") return { useEffect: (effect) => effects.push(effect) };
      if (name === "@/lib/sceneBus") return { sceneBus };
      if (name === "@/lib/motion") return { clamp: (value, min = 0, max = 1) => Math.min(max, Math.max(min, value)) };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  new Script(compiled, { filename: "useScrollProgress.test-adapter.cjs" }).runInContext(context);
  return {
    window, document, sceneBus, frames, listeners,
    mount(name) {
      exports[name]();
      const effect = effects.shift();
      assert.equal(typeof effect, "function");
      return effect();
    },
    emit(type, event = {}) { for (const callback of listeners.get(type) ?? []) callback(event); },
    flush() {
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback(16);
    },
  };
}

test("scroll tracking measures immediately and coalesces scroll/resize into one frame", () => {
  const h = harness();
  h.window.scrollY = 400;
  const cleanup = h.mount("useScrollTracking");
  assert.equal(h.sceneBus.scroll, 0.25);
  assert.equal(h.sceneBus.viewport.w, 1000);
  h.window.scrollY = 800;
  h.emit("scroll"); h.emit("scroll"); h.emit("resize");
  assert.equal(h.frames.size, 1);
  assert.equal(h.sceneBus.scrollPx, 400);
  h.flush();
  assert.equal(h.sceneBus.scroll, 0.5);
  h.emit("scroll");
  assert.equal(h.frames.size, 1, "a completed frame must allow scheduling again");
  h.flush(); cleanup();
});

test("short documents and overscroll stay within the progress range", () => {
  const h = harness();
  const cleanup = h.mount("useScrollTracking");
  h.document.documentElement.scrollHeight = 400;
  h.window.scrollY = 40; h.emit("resize"); h.flush();
  assert.equal(h.sceneBus.scroll, 0);
  h.document.documentElement.scrollHeight = 2400;
  h.window.scrollY = -100; h.emit("scroll"); h.flush();
  assert.equal(h.sceneBus.scroll, 0);
  h.window.scrollY = 9000; h.emit("scroll"); h.flush();
  assert.equal(h.sceneBus.scroll, 1);
  cleanup();
});

test("unmount cancels a pending scroll frame and removes both listeners", () => {
  const h = harness();
  const cleanup = h.mount("useScrollTracking");
  h.window.scrollY = 800; h.emit("scroll");
  cleanup();
  assert.equal(h.frames.size, 0, "pending work must not outlive the effect");
  assert.equal(h.listeners.get("scroll").size, 0);
  assert.equal(h.listeners.get("resize").size, 0);
  h.flush();
  assert.equal(h.sceneBus.scrollPx, 0);
});

test("effect remount does not leave duplicate listeners or stale frames", () => {
  const h = harness();
  const first = h.mount("useScrollTracking");
  h.emit("scroll"); first();
  const second = h.mount("useScrollTracking");
  assert.equal(h.frames.size, 0);
  assert.equal(h.listeners.get("scroll").size, 1);
  h.emit("scroll"); assert.equal(h.frames.size, 1);
  second(); assert.equal(h.frames.size, 0);
});

test("pointer tracking ignores touch and reduced motion, and resets on blur", () => {
  const h = harness();
  const cleanup = h.mount("usePointerTracking");
  h.emit("pointermove", { pointerType: "mouse", clientX: 1000, clientY: 0 });
  assert.equal(h.sceneBus.pointer.tx, 1);
  assert.equal(h.sceneBus.pointer.ty, 1);
  h.emit("pointermove", { pointerType: "touch", clientX: 0, clientY: 800 });
  assert.equal(h.sceneBus.pointer.tx, 1);
  h.sceneBus.reduced = true;
  h.emit("pointermove", { pointerType: "mouse", clientX: 0, clientY: 800 });
  assert.equal(h.sceneBus.pointer.tx, 1);
  h.emit("blur");
  assert.equal(h.sceneBus.pointer.tx, 0);
  assert.equal(h.sceneBus.pointer.ty, 0);
  cleanup();
  for (const type of ["pointermove", "pointerleave", "blur"]) assert.equal(h.listeners.get(type).size, 0);
});

function methodologyHarness({ width = 1280, reduced = false } = {}) {
  const slots = [];
  const effects = [];
  const frames = new Map();
  const intersections = new Set();
  const mutations = new Set();
  let cursor = 0;
  let dirty = true;
  let tree;
  let nextFrame = 0;
  function eventTarget(extra = {}) {
    const listeners = new Map();
    return Object.assign(extra, {
      addEventListener(type, callback) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(callback);
      },
      removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
      emit(type, event = {}) { for (const callback of [...(listeners.get(type) ?? [])]) callback(event); },
    });
  }
  const rect = { top: 115, bottom: 2515, height: 2400, left: 0, width: 500 };
  const properties = new Map();
  const style = { setProperty: (key, value) => properties.set(key, value), removeProperty: (key) => properties.delete(key) };
  const node = () => eventTarget({ style, offsetHeight: 600, getBoundingClientRect: () => ({ ...rect }) });
  const track = node();
  const sticky = node();
  const visual = node();
  const document = { documentElement: { dataset: { motion: reduced ? "reduced" : "full" } }, activeElement: null, hidden: false };
  track.contains = (element) => element?.inside === true;
  const media = new Map();
  const window = eventTarget({
    innerWidth: width, innerHeight: 900,
    getComputedStyle: () => ({ top: "115px" }),
    matchMedia(query) {
      if (!media.has(query)) media.set(query, eventTarget({ matches: query.includes("prefers-reduced-motion") ? reduced : query.includes("pointer: fine") }));
      return media.get(query);
    },
  });
  const sceneBus = { stageIndex: 0, stageProgress: 0 };
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: typeof initial === "function" ? initial() : initial };
      return [slots[index].value, (next) => {
        const value = typeof next === "function" ? next(slots[index].value) : next;
        if (!Object.is(value, slots[index].value)) { slots[index].value = value; dirty = true; }
      }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect(effect, deps) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || !deps || deps.some((value, i) => !Object.is(value, previous.deps?.[i]))) {
        effects.push(() => {
          previous?.cleanup?.();
          slots[index] = { deps, cleanup: effect() };
        });
      }
    },
  };
  const context = createContext({
    window, document,
    requestAnimationFrame(callback) { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback; }
      observe() { intersections.add(this); }
      disconnect() { intersections.delete(this); }
    },
    MutationObserver: class {
      constructor(callback) { this.callback = callback; }
      observe() { mutations.add(this); }
      disconnect() { mutations.delete(this); }
    },
  });
  const load = (path, require) => {
    const exports = {};
    context.exports = exports; context.require = require;
    new Script(compile(read(path)), { filename: path }).runInContext(context);
    return exports;
  };
  const data = load("src/data/methodology.ts", () => { throw new Error("Unexpected data dependency"); });
  const module = load("src/components/methodology/MethodologyNarrative.tsx", (name) => {
    if (name === "react") return react;
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (name === "@/data/methodology") return data;
    if (name === "@/lib/sceneBus") return { sceneBus };
    if (name === "@/lib/motion") return { clamp: (value, min = 0, max = 1) => Math.min(max, Math.max(min, value)) };
    if (name === "@/components/layout/Section") return { Section: "Section" };
    if (name === "@/components/ui/primitives") return { Reveal: "Reveal" };
    if (name === "@/components/methodology/ConfidenceSection") return { ConfidenceSection: "ConfidenceSection" };
    throw new Error(`Unexpected component dependency: ${name}`);
  });
  const walk = (value, visit) => {
    if (Array.isArray(value)) { value.forEach((child) => walk(child, visit)); return; }
    if (!value || typeof value !== "object" || !value.props) return;
    visit(value);
    walk(value.props.children, visit);
  };
  const render = () => {
    for (let count = 0; dirty; count++) {
      assert(count < 30, "component must settle without an effect loop");
      dirty = false; cursor = 0;
      tree = module.MethodologyNarrative();
      walk(tree, ({ props }) => {
        if (!props.ref) return;
        const element = props.className === "method-track" ? track : props.className === "method-sticky" ? sticky : props.className === "method-visual" ? visual : { focus() {}, inside: true };
        if (typeof props.ref === "function") props.ref(element); else props.ref.current = element;
      });
      for (const effect of effects.splice(0)) effect();
    }
  };
  render();
  return {
    sceneBus, window, document, frames, visual, properties,
    move(top) { rect.top = top; rect.bottom = top + rect.height; window.emit("scroll"); },
    flush() {
      const pending = [...frames.values()]; frames.clear();
      pending.forEach((callback) => callback(16)); render();
    },
    click(className, index = 0) {
      const matches = [];
      walk(tree, (entry) => { if (entry.props.className === className) matches.push(entry); });
      assert(matches[index], `${className} must exist`);
      matches[index].props.onClick(); render();
    },
    intersect(visible) {
      for (const observer of [...intersections]) observer.callback([{ isIntersecting: visible, target: track }]);
      render();
    },
    pause() {
      document.documentElement.dataset.motion = "reduced";
      for (const observer of mutations) observer.callback([]);
      render();
    },
    unmount() { slots.forEach((slot) => slot?.cleanup?.()); },
  };
}

test("methodology preserves fractional progress and reaches the report before sticky release", () => {
  const h = methodologyHarness();
  h.move(-400); h.flush();
  const stage = h.sceneBus.stageProgress * 4;
  assert(stage > 0 && stage < 4);
  assert(Math.abs(stage - Math.round(stage)) > 0.001, "SVG progress must not be rounded to the copy index");
  h.move(-1500); h.flush();
  assert.equal(h.sceneBus.stageIndex, 4);
  assert.equal(h.sceneBus.stageProgress, 1);
  h.unmount();
});

test("methodology manual selection survives scrolling while visible and expires on exit", () => {
  const h = methodologyHarness();
  h.click("method-tab", 2);
  h.move(-400); h.flush();
  assert.equal(h.sceneBus.stageIndex, 2);
  h.move(-2500); h.intersect(false); h.flush();
  h.move(115); h.intersect(true); h.flush();
  assert.equal(h.sceneBus.stageIndex, 0);
  h.unmount();
});

test("methodology resume returns to the current scroll position", () => {
  const h = methodologyHarness();
  h.click("method-tab", 3);
  h.move(115); h.flush();
  h.click("method-reset"); h.flush();
  assert.equal(h.sceneBus.stageIndex, 0);
  h.unmount();
});

test("methodology sleeps outside the viewport and leaves no pending frames on unmount", () => {
  const h = methodologyHarness();
  h.move(-2500); h.intersect(false); h.flush();
  h.move(-2600);
  assert.equal(h.frames.size, 0);
  h.intersect(true); h.flush();
  h.visual.emit("pointermove", { pointerType: "mouse", clientX: 300, clientY: 120 });
  h.unmount();
  assert.equal(h.frames.size, 0);
});

test("mobile and system reduced motion keep tab-driven methodology", () => {
  for (const options of [{ width: 390 }, { reduced: true }]) {
    const h = methodologyHarness(options);
    h.click("method-tab", 3);
    h.move(-1500); h.flush();
    assert.equal(h.sceneBus.stageIndex, 3);
    h.unmount();
  }
});

test("pausing motion stops automatic methodology updates immediately", () => {
  const h = methodologyHarness();
  h.move(-400); h.flush();
  h.pause(); h.flush();
  const progress = h.sceneBus.stageProgress;
  h.move(-1500); h.flush();
  assert.equal(h.sceneBus.stageProgress, progress);
  h.unmount();
});
