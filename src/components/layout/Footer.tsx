import { footerNavigation } from "@/data/navigation";
import { site } from "@/data/site";
import { Link } from "@/lib/router";
import { ArrowGlyph } from "@/components/ui/MagneticButton";
import { MotionToggle } from "@/components/ui/MotionToggle";

export function Footer({ motion, reduced, onToggleMotion }: { motion: boolean; reduced: boolean; onToggleMotion: () => void }) {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <p>Open-source Verification<br />and Evidence Recon.</p>
        <nav aria-label="Footer navigation">{footerNavigation.map((item) => <Link key={item.id} to={item.route} className="underline-link">{item.label}</Link>)}</nav>
      </div>
      <Link to="/" className="footer-wordmark" ariaLabel="OVER, back to top">OVER</Link>
      <div className="footer-bottom">
        <span>OVER &copy; {site.year}</span>
        <MotionToggle enabled={motion} onToggle={onToggleMotion} reduced={reduced} />
        <Link to="/" className="back-to-top">Back to top<ArrowGlyph direction="right" /></Link>
      </div>
    </footer>
  );
}