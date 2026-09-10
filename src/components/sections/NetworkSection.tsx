import { useState } from "react";
import { network, roles } from "@/data/network";
import { Section } from "@/components/layout/Section";
import { Reveal } from "@/components/ui/primitives";
import { Action } from "@/components/ui/MagneticButton";
import { Artwork } from "@/components/ui/Artwork";

export function NetworkSection() {
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const lit = hovered ?? selected;
  return (
    <Section id="network" index="01" name="The network" paper>
      <div className="section-intro">
        <Reveal><h2 id="network-heading" className="section-heading">Research is better<br /><em>when it's connected.</em></h2></Reveal>
        <Reveal delay={100}><p className="lede">{network.description}</p></Reveal>
      </div>
      <div className="network-body">
        <Reveal className="network-image">
          <figure><Artwork id="clan" interactive /><figcaption className="image-caption"><span>OVER Clan</span><span>Research community</span></figcaption></figure>
          <p className="network-followup">{network.detail}</p>
          <Action href={network.clan.url} variant="ghost">Find the community</Action>
        </Reveal>
        <Reveal delay={150}>
          <div className="network-diagram" onPointerLeave={() => setHovered(null)}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <ellipse cx="50" cy="50" rx="37" ry="34" fill="none" stroke="#adb09f" strokeWidth=".12" />
              <ellipse cx="50" cy="50" rx="21" ry="27" fill="none" stroke="#b3b6a7" strokeWidth=".1" transform="rotate(31 50 50)" />
              {roles.map((role, i) => <g key={role.id}>
                <line x1={role.x} y1={role.y} x2="50" y2="50" stroke={lit === i ? "#8f7748" : "#acae9e"} strokeWidth={lit === i ? .35 : .15} style={{ transition: "stroke .5s, stroke-width .5s" }} />
                <line x1={role.x} y1={role.y} x2={roles[(i + 1) % 4].x} y2={roles[(i + 1) % 4].y} stroke="#adb09f" strokeWidth=".12" strokeDasharray=".5 1.2" />
              </g>)}
              <circle cx="50" cy="50" r="11" fill="#eae8df" stroke="#b3b6a7" strokeWidth=".14" />
            </svg>
            <span className="network-center" aria-hidden="true">OVER</span>
            {roles.map((role, i) => <button key={role.id} type="button" className={`network-role ${lit === i ? "is-active" : ""}`} style={{ left: `${role.x}%`, top: `${role.y}%` }} aria-pressed={selected === i} aria-controls="role-description" onPointerEnter={() => setHovered(i)} onFocus={() => setHovered(i)} onBlur={() => setHovered(null)} onClick={() => setSelected(i)}><span className="network-role__node" />{role.title}</button>)}
          </div>
          <div id="role-description" className="role-description" aria-live="polite">
            <div className="role-description__title"><h3>{roles[selected].title}</h3><span className="label muted">{roles[selected].code}</span></div>
            <p>{roles[selected].summary}</p>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}