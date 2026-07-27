import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { pageMeta } from "./pageMeta";

/**
 * Sets `<title>` and `<meta name="description">` for the current page, and
 * restores the bare brand and the shell's own description on unmount, so
 * routes that don't set their own fall back cleanly.
 *
 * Callers pass already-resolved strings (`t("meta.title")`), not keys, so the
 * typed `t()` at the call site does the key checking — a `ns: string`
 * parameter here would erase it. The prerender pass uses `PAGE_META` plus a
 * `getFixedT` to reach the same two strings.
 */
export function usePageMeta(pageTitle: string, description: string) {
  const { t } = useTranslation();
  const meta = pageMeta(t, pageTitle, description);

  useEffect(() => {
    document.title = meta.title;
    const tag = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    );
    const previous = tag?.content ?? null;
    if (tag) tag.content = meta.description;

    return () => {
      document.title = t("brand.name");
      if (tag && previous !== null) tag.content = previous;
    };
  }, [meta.title, meta.description, t]);
}
