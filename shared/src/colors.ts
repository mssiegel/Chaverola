/*
  The character-name palette.

  Both arrays mirror the `--char-*` custom properties in client/src/index.css
  (the light block) and must stay in the same order and length — colors.test.ts
  pins the length. The client resolves colors through the CSS vars so theming
  keeps working; the transcript email has no CSS vars and no dark mode, so it
  uses the light-mode hexes directly.
*/

export const CHARACTER_COLOR_VARS = [
  "--char-1",
  "--char-2",
  "--char-3",
  "--char-4",
  "--char-5",
  "--char-6",
  "--char-7",
  "--char-8",
] as const;

export const CHARACTER_EMAIL_COLORS = [
  "#14804a", // green  — char 1
  "#96690f", // golden — char 2
  "#2563eb", // bluish — char 3
  "#7c3aed", // purplish — char 4
  "#0d9488", // teal
  "#be2d8a", // magenta
  "#4f46e5", // indigo
  "#e11d48", // rose
] as const;
