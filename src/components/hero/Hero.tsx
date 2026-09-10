import { site } from "@/data/site";
import { Action, ArrowGlyph } from "@/components/ui/MagneticButton";
import { MotionToggle } from "@/components/ui/MotionToggle";
import { Link } from "@/lib/router";

export function Hero({ motion, reduced, onToggleMotion }: { motion: boolean; reduced: boolean; onToggleMotion: () => void }) {
  return (
    <section id="entry" className="hero" aria-labelledby="entry-heading">
      <div className="hero-content">
        <p className="hero-kicker">{site.hero.eyebrow}</p>
        <h1 className="hero-wordmark" id="entry-heading" aria-label="OVER">
          {site.brand.split("").map((letter, index) => <span key={index} aria-hidden="true">{letter}</span>)}
        </h1>
        <p className="hero-name">Open-source Verification<br />and Evidence Recon.</p>
        <p className="hero-tagline">{site.tagline}</p>
        <div className="hero-spatial-gap" aria-hidden="true" />
        <div className="hero-actions">
          <Action to="/systems" variant="solid">{site.hero.primary}</Action>
          <Action to="/network" variant="ghost">{site.hero.secondary}</Action>
        </div>
      </div>
      <div className="hero-bottom">
        <div className="hero-bottom__left">
          <Link to="/network" className="scroll-cue" ariaLabel="Scroll to the OVER network"><ArrowGlyph direction="down" /><span>Scroll to explore</span></Link>
          <p className="hero-disciplines">{site.disciplines.join(" / ")}</p>
        </div>
        <MotionToggle enabled={motion} reduced={reduced} onToggle={onToggleMotion} />
      </div>
    </section>
  );
}