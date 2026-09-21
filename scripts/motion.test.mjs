import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Script, createContext } from "node:vm";
import ts from "typescript";

// Execute the real hook module with deterministic effect/event/frame adapters.
// This checks scheduling behaviour, not browser layout or React rendering.
const source = readFileSync(new URL("../src/hooks/useScrollProgress.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

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
