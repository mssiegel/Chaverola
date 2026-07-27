import type { Catalog } from "../../types";

/**
 * Teacher surfaces: activity setup and the live host dashboard. Registered
 * from `i18n/ns/teacher.ts`, so it rides those pages' chunks.
 *
 * Only the page-meta keys so far — the rest lands with the teacher slice.
 */
export const teacher = {
  "setup.meta.title": "Set Up Your Activity",
  "setup.meta.description":
    "Name your characters, pick your settings, and get a join code for your class. Takes about a minute.",

  "host.meta.title": "Your Live Activity",
} as const satisfies Catalog;

export type TeacherCatalog = typeof teacher;
