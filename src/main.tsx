import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Self-hosted font faces (latin + latin-ext subsets, display: swap). The same
// families and weights the site previously pulled from Google Fonts, without
// any third-party origin in the Content Security Policy.
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/500.css";
import "@fontsource/instrument-sans/600.css";
import "@fontsource/jetbrains-mono/300.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./index.css";
import App from "./App";

// Clickjacking backstop. Browsers ignore frame-ancestors inside a meta policy,
// and the static host cannot send an X-Frame-Options header, so deny framing at
// runtime: try to break out of the frame first, and never render inside one.
if (window.top && window.top !== window.self) {
  try {
    window.top.location.replace(window.location.href);
  } catch {
    // A cross-origin embedder may not be navigable. Still refuse to render.
  }
  document.documentElement.replaceChildren();
  throw new Error("OVER must not be framed. See frame-ancestors 'none'.");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
