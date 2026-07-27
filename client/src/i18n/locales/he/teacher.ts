import type { HebrewOf } from "../../types";
import type { TeacherCatalog } from "../en/teacher";

/**
 * Hebrew — masculine second person throughout; see `he/common.ts` for the
 * house style this folder follows. This namespace talks to a teacher, so the
 * register is a colleague's rather than a manual's.
 */
export const teacher: HebrewOf<TeacherCatalog> = {
  "setup.meta.title": "הקמת פעילות",
  "setup.meta.description":
    "בוחרים דמויות, מסדרים כמה הגדרות ומקבלים קוד הצטרפות לכיתה. לוקח בערך דקה.",

  "host.meta.title": "הפעילות שלך",
};
