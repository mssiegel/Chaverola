// The bare specifier is what makes this an AUGMENTATION rather than a fresh
// module declaration. `verbatimModuleSyntax` requires the rest to be
// `import type`.
import "i18next";

import type { chat } from "./locales/en/chat";
import type { common } from "./locales/en/common";
import type { home } from "./locales/en/home";
import type { student } from "./locales/en/student";
import type { teacher } from "./locales/en/teacher";

/**
 * Teaches `t()` the key space.
 *
 * English is the shape of record on purpose: the Hebrew files are typed
 * against these same objects via `HebrewOf<>`, so a key that exists here and
 * nowhere else fails to compile in `locales/he/`, and a key that exists only
 * in `he/` is an excess property there. That pair is the whole completeness
 * story — no extraction tooling, no runtime check, no parity test.
 *
 * `resources` here is TYPES ONLY. At runtime only `common` is loaded at init;
 * the other four register from `i18n/ns/*.ts` inside their page chunks. So a
 * key can typecheck and still be missing at runtime if it's used from a module
 * that doesn't reach the registering chunk — the DEV `missingKeyHandler` in
 * `i18n/index.ts` catches that on first render.
 */
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    returnNull: false;
    resources: {
      common: typeof common;
      home: typeof home;
      teacher: typeof teacher;
      student: typeof student;
      chat: typeof chat;
    };
  }
}
