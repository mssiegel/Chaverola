import { registerBundle } from "@/i18n";
import { chat as en } from "../locales/en/chat";
import { chat as he } from "../locales/he/chat";

/*
  Side-effect module: importing it registers the `chat` namespace for every
  locale. Imported at the top of FOUR lazy page modules, not one — the chat
  pieces are mounted by the homepage hero, both teacher pages (transcript
  lines, emoji pickers) and the student join flow — so the strings ride
  whichever of those chunks the visitor actually loads, instead of costing a
  request of their own or bloating the eagerly-loaded `common`.

  A fifth page that renders a chat piece and forgets this import shows up
  immediately in DEV: i18n/index.ts logs `[i18n] missing chat:<key>`.

  Both locales are bundled together on purpose. A per-locale chunk would be a
  second request keyed on something the page chunk does not know — a waterfall
  on the join screen, which is the exact cost the page splitting exists to
  avoid (thirty phones on one school AP). The price is a couple of KB of the
  other language, which is far cheaper than a round trip.
*/
registerBundle("chat", { en, he });
