export function MotionToggle({ enabled, onToggle, reduced = false }: { enabled: boolean; onToggle: () => void; reduced?: boolean }) {
  return (
    <button type="button" className="motion-toggle" onClick={onToggle} aria-pressed={enabled} aria-label={reduced ? "Reduced motion follows your device preference" : enabled ? "Pause motion and show the static artwork" : "Enable animated 3D artwork"} disabled={reduced}>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
        {enabled ? <><path d="M5 3v10M11 3v10" /></> : <path d="m5 3 7 5-7 5V3Z" />}
      </svg>
      {reduced ? "Reduced motion" : enabled ? "Motion on" : "Motion paused"}
    </button>
  );
}