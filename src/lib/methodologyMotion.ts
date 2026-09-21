/** Continuous visual progress is separate from the selected text/tab index. */
const bounded = (value: number, maximum: number) => Number.isFinite(value) ? Math.min(maximum, Math.max(0, value)) : 0;
export const stageIndex = (value: number) => Math.round(bounded(value, 4));

/** Use the actual sticky travel, not the full section height. Hold the report for the final 18%. */
export function scrollStage(top: number, trackHeight: number, panelHeight: number, anchorTop: number): number {
  if (![top, trackHeight, panelHeight, anchorTop].every(Number.isFinite)) return 0;
  const travel = Math.max(1, trackHeight - panelHeight);
  return bounded((anchorTop - top) / (travel * 0.82), 1) * 4;
}

/** Frame-rate-independent, bounded damping. Snap on settling so the animation can sleep. */
export function smoothStage(current: number, target: number, deltaSeconds: number): number {
  const from = bounded(current, 4);
  const to = bounded(target, 4);
  const dt = bounded(deltaSeconds, 0.064);
  const next = from + (to - from) * (1 - Math.exp(-14 * dt));
  return Math.abs(to - next) < 0.001 ? to : next;
}
