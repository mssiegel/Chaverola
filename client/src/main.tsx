import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// Fredoka (primary) + Nunito (fallback). Self-hosted via @fontsource — no CDN.
import "@fontsource/fredoka/400.css";
import "@fontsource/fredoka/500.css";
import "@fontsource/fredoka/600.css";
import "@fontsource/fredoka/700.css";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/700.css";

import { PageErrorBoundary } from "@/components/layout/PageErrorBoundary";

import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* Outside the router: a page chunk that never arrives would otherwise
        take the whole screen down with it, and so would any render crash. */}
    <PageErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PageErrorBoundary>
  </StrictMode>
);
