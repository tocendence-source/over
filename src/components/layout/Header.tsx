import { useEffect, useRef, useState } from "react";
import { navigation, footerNavigation } from "@/data/navigation";
import { destinations } from "@/data/contacts";
import { Link } from "@/lib/router";
import { Action } from "@/components/ui/MagneticButton";
import { OverMark } from "@/components/ui/primitives";
import { MotionToggle } from "@/components/ui/MotionToggle";

type Props = { active: string; path: string; motion: boolean; reduced: boolean; onToggleMotion: () => void };

export function Header({ active, path, motion, reduced, onToggleMotion }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 28);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  useEffect(() => { dialog.current?.close(); }, [path]);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 801px)");
    const closeWide = () => { if (mq.matches) dialog.current?.close(); };
    mq.addEventListener("change", closeWide);
    return () => mq.removeEventListener("change", closeWide);
  }, []);
  useEffect(() => {
    if (!open) return;
    document.body.dataset.scrollLock = "true";
    return () => { document.body.dataset.scrollLock = "false"; };
  }, [open]);

  const closeMenu = () => dialog.current?.close();
  return (
    <>
      <a href="#main" className="skip-link" onClick={(event) => { event.preventDefault(); document.getElementById("main")?.focus(); }}>Skip to content</a>
      <header className={`site-header ${scrolled || path.startsWith("/systems/") ? "is-scrolled" : ""}`}>
        <div className="wrap header-inner">
          <Link to="/" className="brand" ariaLabel="OVER home"><OverMark /><span>OVER</span></Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {navigation.map((item) => <Link key={item.id} to={item.route} current={active === item.id}>{item.label}</Link>)}
          </nav>
          <div className="header-cta"><Action to="/contact" variant="solid">Get in touch</Action></div>
          <button ref={trigger} type="button" className="menu-toggle" aria-label="Open navigation" aria-expanded={open} aria-controls="mobile-menu" onClick={() => { dialog.current?.showModal(); setOpen(true); }}><span /><span /></button>
        </div>
      </header>
      <dialog id="mobile-menu" ref={dialog} className="mobile-menu" aria-label="Site navigation" onClose={() => { setOpen(false); trigger.current?.focus({ preventScroll: true }); }}>
        <div className="mobile-menu__head">
          <Link to="/" className="brand" onNavigate={closeMenu}><OverMark /><span>OVER</span></Link>
          <button type="button" className="icon-button" aria-label="Close navigation" onClick={closeMenu}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
        </div>
        <nav aria-label="Mobile navigation">{footerNavigation.map((item) => <Link key={item.id} to={item.route} onNavigate={closeMenu}>{item.label}<span>{item.index}</span></Link>)}</nav>
        <div className="mobile-menu__foot">
          <a className="text-link" href={destinations.operator.url} target="_blank" rel="noopener noreferrer">{destinations.operator.handle}<span className="sr-only"> on Telegram, opens in a new tab</span></a>
          <MotionToggle enabled={motion} onToggle={onToggleMotion} reduced={reduced} />
        </div>
      </dialog>
    </>
  );
}