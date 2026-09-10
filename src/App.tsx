import { Component, useEffect, type ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SceneLayer } from "@/components/scene/SceneLayer";
import { TraceOverlay } from "@/components/scene/TraceOverlay";
import { Home } from "@/pages/Home";
import { NotFoundPage, SystemDetailPage } from "@/pages/Detail";
import { useRoute, navigate } from "@/lib/router";
import { useDevice } from "@/hooks/useDevice";
import { usePointerTracking, useScrollTracking } from "@/hooks/useScrollProgress";
import { useSceneController } from "@/hooks/useSceneController";
import { getSystem } from "@/data/systems";
import { site } from "@/data/site";

const sectionNames: Record<string, string> = { "/": "", "/network": "Network", "/systems": "Systems", "/methodology": "Methodology", "/operator": "About", "/contact": "Contact" };

class PageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="error-boundary"><h1>The page couldn't load.</h1><p>Please try loading it again.</p><button type="button" className="btn btn-solid" onClick={() => window.location.reload()}>Reload page</button></div>;
    return this.props.children;
  }
}

export default function App() {
  const path = useRoute();
  const { quality, sceneOn, reduced, finePointer, toggleScene, degrade } = useDevice();
  const home = Object.prototype.hasOwnProperty.call(sectionNames, path);
  const active = useSceneController(home, path);
  usePointerTracking();
  useScrollTracking();

  useEffect(() => {
    const system = getSystem(path.split("/")[2]);
    const title = system?.name ?? sectionNames[path];
    document.title = title ? `${title} - OVER` : `OVER - ${site.fullName}`;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = system?.detail ?? site.description;
    if (!home) {
      window.scrollTo({ top: 0, behavior: "instant" });
      document.getElementById("main")?.focus({ preventScroll: true });
    }
    if (/^#\/?access\/?$/.test(window.location.hash)) navigate("/contact", { replace: true });
  }, [home, path]);

  const motion = sceneOn && !reduced;
  return <PageBoundary>
    <SceneLayer quality={quality} onDegrade={degrade} />
    <TraceOverlay enabled={motion && finePointer} />
    <Header active={active} path={path} motion={motion} reduced={reduced} onToggleMotion={toggleScene} />
    <main id="main" tabIndex={-1}>
      {home ? <Home focus={path === "/" ? undefined : path.slice(1)} motion={motion} reduced={reduced} onToggleMotion={toggleScene} /> : path.startsWith("/systems/") && path.split("/").length === 3 ? <SystemDetailPage key={path} id={path.split("/")[2]} /> : <NotFoundPage />}
    </main>
    <Footer motion={motion} reduced={reduced} onToggleMotion={toggleScene} />
    <div className="grain" aria-hidden="true" />
  </PageBoundary>;
}