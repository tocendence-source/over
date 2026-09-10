import type { Quality } from "@/lib/performance";

/**
 * Mutable frame-loop state shared between React (events, scroll, sections)
 * and the WebGL scene. The scene reads this object once per frame — React
 * never re-renders because of it.
 */

export type SceneStateName =
  | "entry"
  | "network"
  | "systems"
  | "methodology"
  | "confidence"
  | "operator"
  | "contact"
  | "detail";

export const sceneBus = {
  /** Pointer in normalised device space, target vs damped. */
  pointer: { tx: 0, ty: 0, x: 0, y: 0 },
  /** Document scroll progress 0..1 and raw pixel offset. */
  scroll: 0,
  scrollPx: 0,
  viewport: { w: 1, h: 1 },
  /** Methodology narrative progress 0..1 across the five stages. */
  stageProgress: 0,
  stageIndex: 0,
  /** Which system module currently holds focus (-1 = none). */
  focus: -1,
  selectedSystem: 2,
  state: "entry" as SceneStateName,
  enabled: true,
  visible: true,
  quality: "high" as Quality,
  reduced: false,
};

export const setSceneState = (state: SceneStateName) => {
  sceneBus.state = state;
  if (typeof document !== "undefined") document.documentElement.dataset.scene = state;
};

export const setSceneFocus = (focus: number) => {
  sceneBus.focus = focus;
};
