/**
 * Quality tiering + capability detection.
 * The WebGL layer must stay beautiful and cheap at every tier, and must never
 * present a broken canvas.
 */

export type Quality = "high" | "medium" | "low" | "none";

export const SCENE_PREF_KEY = "over.scene";

let webGLAvailable: boolean | undefined;

export const prefersReducedMotion = () => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

export const supportsWebGL = () => {
  if (typeof document === "undefined") return false;
  if (webGLAvailable !== undefined) return webGLAvailable;
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2");
    webGLAvailable = Boolean(context);
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return webGLAvailable;
  } catch {
    webGLAvailable = false;
    return false;
  }
};

type Signals = {
  coarse: boolean;
  cores: number;
  memory: number;
  dpr: number;
  small: boolean;
};

const readSignals = (): Signals => {
  const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };
  return {
    coarse: window.matchMedia?.("(pointer: coarse)").matches ?? false,
    cores: nav.hardwareConcurrency ?? 4,
    memory: (nav as unknown as { deviceMemory?: number }).deviceMemory ?? 4,
    dpr: window.devicePixelRatio || 1,
    small: window.innerWidth < 820,
  };
};

export const detectQuality = (): Quality => {
  if (!supportsWebGL()) return "none";
  const s = readSignals();
  if (s.memory <= 2 || s.cores <= 2) return "low";
  if (s.coarse || s.small) return "medium";
  if (s.cores >= 8 && s.dpr <= 2.5) return "high";
  return "medium";
};

export type TierProfile = {
  dpr: number;
  particles: number;
  orbitNodes: number;
  rings: number;
  /** Additive glow sprites + scanning plane. */
  glow: boolean;
  /** Procedural environment reflections on PBR materials. */
  reflections: boolean;
  /** Floating evidence fragments (instanced metal plates). */
  fragments: number;
  /** Selective bloom via a HalfFloat composer — HIGH tier only. */
  bloom: boolean;
  cameraParallax: number;
};

export const profileFor = (quality: Quality): TierProfile => {
  switch (quality) {
    case "high":
      return { dpr: 1.75, particles: 1400, orbitNodes: 26, rings: 3, glow: true, reflections: true, fragments: 14, bloom: true, cameraParallax: 1 };
    case "medium":
      return { dpr: 1.3, particles: 620, orbitNodes: 14, rings: 3, glow: true, reflections: true, fragments: 8, bloom: false, cameraParallax: 0.7 };
    case "low":
      return { dpr: 1, particles: 0, orbitNodes: 6, rings: 2, glow: false, reflections: true, fragments: 0, bloom: false, cameraParallax: 0.25 };
    default:
      return { dpr: 1, particles: 0, orbitNodes: 0, rings: 0, glow: false, reflections: false, fragments: 0, bloom: false, cameraParallax: 0 };
  }
};

/**
 * Adaptive degradation: if frames run long, step the tier down once.
 * Never steps back up, to avoid oscillation.
 */
export const shouldDowngrade = (averageFrameMs: number) => averageFrameMs > 26;

export const readScenePref = (): boolean => {
  try {
    return typeof localStorage === "undefined" || localStorage.getItem(SCENE_PREF_KEY) !== "off";
  } catch {
    return true;
  }
};

export const writeScenePref = (on: boolean) => {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(SCENE_PREF_KEY, on ? "on" : "off");
  } catch {
    /* storage unavailable — preference simply is not persisted */
  }
};
