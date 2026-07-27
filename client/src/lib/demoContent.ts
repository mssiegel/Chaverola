import { useLocale } from "@/lib/locale";
import { DEMO_CONTENT, type DemoContent } from "@/mockData";

/**
 * The demo cast for the language on screen. `/activity/host/1234` and
 * `/activity/join/1234` run Rome on the Ides of March; `/he/...` runs Tel Aviv
 * in the hours before the Declaration. Two productions, not one translated
 * twice — a Hebrew visitor's demo should be a classroom they recognize.
 *
 * A hook because the locale comes from the URL, and it lives in `lib/`
 * rather than `mockData/` because that folder holds data and nothing else.
 * Anything too pure to call a hook takes the pieces as parameters instead —
 * `seedWorld` is the worked example.
 */
export function useDemoContent(): DemoContent {
  return DEMO_CONTENT[useLocale()];
}
