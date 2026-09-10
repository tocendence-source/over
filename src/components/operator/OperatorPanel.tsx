import { operator } from "@/data/operator";
import { Section } from "@/components/layout/Section";
import { Artwork } from "@/components/ui/Artwork";
import { Action, ArrowGlyph } from "@/components/ui/MagneticButton";
import { Reveal } from "@/components/ui/primitives";

export function OperatorPanel() {
  return (
    <Section id="operator" index="04" name="The person behind OVER" className="operator-section">
      <div className="operator-layout">
        <Reveal className="operator-art"><figure><Artwork id="operator" interactive /><figcaption className="image-caption"><span>New_Over</span><span>Personal avatar</span></figcaption></figure></Reveal>
        <Reveal delay={130} className="operator-info">
          <span className="label">{operator.role}</span>
          <h2 id="operator-heading" className="operator-name">{operator.name}</h2>
          {operator.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <div className="operator-actions">
            <Action href={operator.handles[0].url} variant="solid">Say hello</Action>
            <a href={operator.handles[1].url} target="_blank" rel="noopener noreferrer" className="text-link">{operator.handles[1].handle}<ArrowGlyph /><span className="sr-only"> on Telegram, opens in a new tab</span></a>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}