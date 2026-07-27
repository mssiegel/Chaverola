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
// Rubik for Hebrew — the hebrew-* subset files only. Fredoka owns Latin in
// both locales (and does ship Hebrew glyphs), so Rubik's Latin would be dead
// weight. Rubik is here for quality, not rescue: it's drawn for Hebrew UI
// text, where Fredoka's Hebrew is a bolt-on to a Latin display face.
import "@fontsource/rubik/hebrew-400.css";
import "@fontsource/rubik/hebrew-500.css";
import "@fontsource/rubik/hebrew-600.css";
import "@fontsource/rubik/hebrew-700.css";

import { PageErrorBoundary } from "@/components/layout/PageErrorBoundary";
import { initI18n } from "@/i18n";
import { applyBootLocale, applyDocumentLocale } from "@/lib/localeBoot";

import "./index.css";
import App from "./App.tsx";

/*
  Locale is settled before React exists, in this order: rewrite the URL if the
  visitor's preference says so, boot i18next in that language, stamp
  <html lang/dir>. BrowserRouter then reads an already-correct URL, so frame 1
  of a Hebrew load is Hebrew and RTL rather than flipping a frame later.
  `LocaleEffects` keeps all three in sync from then on.
*/
const bootLocale = applyBootLocale();
initI18n(bootLocale);
applyDocumentLocale(bootLocale);

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
