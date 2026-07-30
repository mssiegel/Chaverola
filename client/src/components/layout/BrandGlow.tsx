/**
 * The soft brand glow behind the two teacher pages (setup and host): three
 * blurred blobs in grape, coral and sun. Purely decorative, so it is
 * `aria-hidden` and takes no pointer events, and it is clipped — an
 * unclipped blur reaches past the viewport and gives phones sideways
 * scroll.
 *
 * Sits under a `relative isolate` page wrapper; the negative offsets are
 * physical rather than logical on purpose, since the scatter is composition,
 * not reading order (AGENTS.md → Right-to-left).
 */
export function BrandGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute -top-24 -left-20 size-72 rounded-full bg-brand-grape/10 blur-3xl" />
      <div className="absolute -top-16 -right-16 size-64 rounded-full bg-brand-coral/10 blur-3xl" />
      <div className="absolute top-72 right-1/4 size-56 rounded-full bg-brand-sun/10 blur-3xl" />
    </div>
  );
}
