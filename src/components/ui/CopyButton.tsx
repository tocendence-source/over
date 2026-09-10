import { useEffect, useRef, useState } from "react";

export function CopyButton({ value }: { value: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timeout.current), []);

  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setStatus("idle"), 2600);
  };
  const label = status === "copied" ? `Copied ${value}` : status === "error" ? `Copy unavailable. Select ${value} to copy it manually.` : `Copy ${value}`;
  return (
    <>
      <button type="button" className={`icon-button copy-button ${status === "copied" ? "is-copied" : ""}`} onClick={copy} aria-label={label} title={label}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" aria-hidden="true">
          {status === "copied" ? <path d="m5 12 4 4L19 6" /> : <><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" /></>}
        </svg>
      </button>
      <span className="sr-only" role="status">{status !== "idle" ? label : ""}</span>
    </>
  );
}