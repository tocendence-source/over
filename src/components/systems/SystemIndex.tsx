import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { systems } from "@/data/systems";
import { site } from "@/data/site";
import { Section } from "@/components/layout/Section";
import { Reveal } from "@/components/ui/primitives";
import { Action, ArrowGlyph } from "@/components/ui/MagneticButton";
import { ProjectArtwork } from "@/components/systems/ProjectArtwork";
import { Link } from "@/lib/router";
import { sceneBus, setSceneFocus } from "@/lib/sceneBus";

export function SystemsSection() {
  return <Section id="systems" index="02" name="Selected systems" className="systems-section">
    <div className="section-intro"><Reveal><h2 id="systems-heading" className="section-heading">Built for<br /><em>the research.</em></h2></Reveal><Reveal delay={90}><p className="lede">{site.projects.description}</p></Reveal></div>
    <SystemIndex />
  </Section>;
}

export function SystemIndex() {
  const [selected, setSelected] = useState(2);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    sceneBus.selectedSystem = selected;
    setSceneFocus(selected);
    return () => setSceneFocus(-1);
  }, [selected]);

  const keySelect = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % systems.length;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index + systems.length - 1) % systems.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = systems.length - 1;
    else return;
    event.preventDefault(); setSelected(next); tabs.current[next]?.focus();
  };

  return <div className="project-index">
    <Reveal>
      <div className="project-tabs" role="tablist" aria-label="OVER projects" onPointerLeave={() => setSceneFocus(selected)}>
        {systems.map((system, index) => <button key={system.id} ref={(node) => { tabs.current[index] = node; }} type="button" role="tab" id={`${id}-tab-${index}`} aria-selected={selected === index} aria-controls={`${id}-panel-${index}`} tabIndex={selected === index ? 0 : -1} className="project-tab" onClick={() => setSelected(index)} onPointerEnter={() => setSceneFocus(index)} onKeyDown={(event) => keySelect(event, index)}>
          <span className="project-tab__num">{system.number}</span>
          <span className="project-tab__text"><span className="project-tab__name">{system.name}</span><span className="project-tab__type">{system.category}{system.status === "archive" ? " / Archive" : ""}</span></span>
          <ArrowGlyph />
        </button>)}
      </div>
      <p className="project-tabs-note">Select a project to explore what it does.<br />All project links open directly in Telegram.</p>
    </Reveal>
    <div className="project-panel">
      {systems.map((system, index) => <div key={system.id} id={`${id}-panel-${index}`} role="tabpanel" aria-labelledby={`${id}-tab-${index}`} hidden={selected !== index} tabIndex={0}>
        {selected === index && <div className="project-panel-inner">
          <Link to={system.href} className="project-art" ariaLabel={`Learn more about ${system.name}`}><ProjectArtwork system={system} /><span className="project-art__link"><ArrowGlyph /></span></Link>
          <h3>{system.description}</h3>
          <p>{system.detail}</p>
          {system.linkNote && <p className="link-note">{system.linkNote}</p>}
          <div className="project-panel__actions"><Action to={system.href} variant="outline">About the project</Action><a className="text-link" href={system.external.url} target="_blank" rel="noopener noreferrer">{system.external.handle}<ArrowGlyph /><span className="sr-only"> on Telegram, opens in a new tab</span></a></div>
        </div>}
      </div>)}
    </div>
  </div>;
}