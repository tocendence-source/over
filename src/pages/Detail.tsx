import { getSystem, systemNeighbours } from "@/data/systems";
import { destinations } from "@/data/contacts";
import { Link } from "@/lib/router";
import { Action, ArrowGlyph } from "@/components/ui/MagneticButton";
import { ProjectArtwork } from "@/components/systems/ProjectArtwork";

export function SystemDetailPage({ id }: { id: string }) {
  const system = getSystem(id);
  if (!system) return <NotFoundPage />;
  const { prev, next } = systemNeighbours(id);
  return <article className="detail-page page-enter" aria-labelledby="project-heading">
    <div className="wrap">
      <div className="detail-breadcrumb"><Link to="/systems">All projects</Link><span>/</span><span>{system.category}</span></div>
      <h1 id="project-heading" className="detail-title">{system.name}</h1>
      <div className="detail-layout">
        <div className="detail-copy">
          <span className="label muted">{system.category} / {system.status === "active" ? "Active project" : "Archive"}</span>
          <h2>{system.description}</h2>
          <p>{system.detail}</p>
          {system.linkNote && <p className="link-note">{system.linkNote}</p>}
          <ul className="capabilities" aria-label={`${system.name} capabilities`}>{system.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
          <div className="detail-actions"><Action href={system.external.url} variant="solid">{system.status === "archive" ? "Original Telegram link" : "Open in Telegram"}</Action><Action href={destinations.operator.url} variant="ghost">Ask a question</Action></div>
          {system.secondary && <a href={system.secondary.url} target="_blank" rel="noopener noreferrer" className="text-link muted">Go directly to the channel<ArrowGlyph /><span className="sr-only"> on Telegram, opens in a new tab</span></a>}
        </div>
        <figure className="detail-media"><div className="project-art"><ProjectArtwork system={system} /></div><figcaption className="image-caption"><span>{system.name}</span><span>{system.artwork ? "Project artwork" : "Project illustration"}</span></figcaption></figure>
      </div>
      <nav className="detail-nav" aria-label="Other OVER projects">
        {prev && <Link to={prev.href}><ArrowGlyph direction="left" /><span><small>Previous project</small>{prev.name}</span></Link>}
        {next && <Link to={next.href}><span><small>Next project</small>{next.name}</span><ArrowGlyph direction="right" /></Link>}
      </nav>
    </div>
  </article>;
}

export function NotFoundPage() {
  return <div className="detail-page"><div className="wrap not-found"><span className="label muted">404 / Page not found</span><h1>This page isn't here.</h1><p className="lede">You can still explore the projects or get in touch.</p><Action to="/systems" variant="solid">Back to the projects</Action></div></div>;
}