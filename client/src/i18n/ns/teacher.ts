import { registerBundle } from "@/i18n";
import { teacher as en } from "../locales/en/teacher";
import { teacher as he } from "../locales/he/teacher";

/*
  Side-effect module: importing it registers the `teacher` namespace for every
  locale. Imported at the top of the lazy page module(s) for the teacher pages, so
  the strings ride that page chunk instead of costing a request of their own.

  Both locales are bundled together on purpose. A per-locale chunk would be a
  second request keyed on something the page chunk does not know — a waterfall
  on the join screen, which is the exact cost the page splitting exists to
  avoid (thirty phones on one school AP). The price is a couple of KB of the
  other language, which is far cheaper than a round trip.
*/
registerBundle("teacher", { en, he });
