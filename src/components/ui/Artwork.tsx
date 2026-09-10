import { useEffect, useRef, useState } from "react";
import { artwork, type ArtworkId } from "@/data/artwork";
import { OverMark } from "@/components/ui/primitives";
import { ArrowGlyph } from "@/components/ui/MagneticButton";
import { cn } from "@/utils/cn";

export function Artwork({ id, interactive = false, className }: { id: ArtworkId; interactive?: boolean; className?: string }) {
  const item = artwork[id];
  const src = item.local ?? item.remote;
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => setFailed(false), [src]);
  useEffect(() => {
    if (!open) return;
    document.body.dataset.scrollLock = "true";
    return () => { document.body.dataset.scrollLock = "false"; };
  }, [open]);

  const image = failed ? (
    <div className="artwork-fallback" role="img" aria-label={`${item.alt}. Image is currently unavailable.`}>
      <OverMark /><span>{item.caption.split(" / ")[0]}</span>
    </div>
  ) : <img src={src} alt={item.alt} width="640" height="640" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;

  if (!interactive || failed) return <div className={cn("artwork", className)}>{image}</div>;
  return (
    <>
      <button type="button" ref={trigger} className={cn("artwork artwork-button", className)} aria-label={`View ${item.alt}`} onClick={() => { dialog.current?.showModal(); setOpen(true); }}>
        {image}<span className="image-view"><ArrowGlyph /></span>
      </button>
      <dialog ref={dialog} className="lightbox" aria-label={item.alt} onClose={() => { setOpen(false); trigger.current?.focus({ preventScroll: true }); }} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
        {open && <img src={src} alt={item.alt} width="640" height="640" referrerPolicy="no-referrer" onError={() => { setOpen(false); dialog.current?.close(); setFailed(true); }} />}
        <div className="lightbox-bar"><p>{item.caption}</p><button type="button" className="icon-button" onClick={() => dialog.current?.close()} aria-label="Close image"><svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.4" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></div>
      </dialog>
    </>
  );
}