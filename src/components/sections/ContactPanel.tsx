import { contacts, destinations } from "@/data/contacts";
import { site } from "@/data/site";
import { Section } from "@/components/layout/Section";
import { Reveal } from "@/components/ui/primitives";
import { CopyButton } from "@/components/ui/CopyButton";
import { ArrowGlyph } from "@/components/ui/MagneticButton";

export function ContactPanel() {
  return (
    <Section id="contact" index="05" name="Contact" paper className="contact-section">
      <div className="contact-intro">
        <Reveal><h2 id="contact-heading" className="contact-heading">{site.contact.title}</h2></Reveal>
        <Reveal delay={100}>
          <p>{site.contact.description}</p>
          <div className="contact-main">
            <a href={destinations.operator.url} target="_blank" rel="noopener noreferrer">{destinations.operator.handle}<ArrowGlyph /><span className="sr-only"> on Telegram, opens in a new tab</span></a>
            <CopyButton value={destinations.operator.handle} />
          </div>
        </Reveal>
      </div>
      <ul className="contact-list">
        {contacts.filter((contact) => contact.id !== "operator").map((contact, index) => <Reveal as="li" className="contact-row" key={contact.id} delay={index * 45}>
          <a href={contact.url} target="_blank" rel="noopener noreferrer"><span><strong>{contact.label}</strong><small>{contact.purpose}</small></span><span className="contact-handle">{contact.handle}</span><span className="sr-only"> on Telegram, opens in a new tab</span></a>
          <CopyButton value={contact.handle} />
        </Reveal>)}
      </ul>
    </Section>
  );
}