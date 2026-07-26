# 32 — Students download the student app

State: **Not started**

**The problem.** There is no route-level code splitting:
[`App.tsx:8-12`](../../../client/src/App.tsx) imports every page eagerly, so
one main bundle carries the teacher dashboard (`HostActivity/*` and the
whole `hostWorld` simulation), the setup form, both demo engines, all of
`mockData/`, and the homepage — and **thirty phones hitting one school AP
at the same moment pull all of it to type four digits**. The join screen
is the most latency-sensitive moment in the product (a whole class waits
on it simultaneously), and it's currently the slowest thing it could be.
Only the emoji picker is split today
([`LazyEmojiPicker.tsx`](../../../client/src/components/chat/LazyEmojiPicker.tsx)).

**Decisions in play.**

- **React Compiler owns memoization** (AGENTS.md) — `React.lazy` +
  `Suspense` are orthogonal to the compiler, but re-run the optimization
  check after splitting: grep the build for `useMemoCache` per the
  recorded technique.
- `socket.io-client` in the main bundle is **explicitly accepted** (the
  header note in [`lib/socket.ts`](../../../client/src/lib/socket.ts)) —
  leave it; this doc splits pages, not the socket.
- Fonts load in [`main.tsx`](../../../client/src/main.tsx) — global by
  design; untouched.
- "Routes are canonical" — no route changes, only how their elements
  load.

- [ ] Prompt — Lazy pages behind fallbacks that match the app

---

## Prompt — Lazy pages behind fallbacks that match the app

**Goal:** the initial bundle for `/activity/join` carries the student
flow and not the teacher app; every page still appears without a jarring
fallback flash; nothing about navigation or the demos changes.

1. In [`App.tsx`](../../../client/src/App.tsx), convert the five pages to
   `React.lazy` imports (named-export adapters as needed — the pages
   export named components). Mount **one `Suspense` per layout group,
   inside the layout** so the shell stays painted: the `AppLayout` group
   keeps the navbar while a page loads; the `StudentWorldLayout` group
   keeps the purple world + doodles. Fallbacks reuse the app's existing
   loading language (the spinner/beat the join flow already has — see
   [`LoadingCard.tsx`](../../../client/src/pages/student/join/LoadingCard.tsx)
   for the idiom; keep the fallback minimal, no new copy).
2. Check what actually moved: `pnpm build`, then read the chunk report.
   Expect at minimum: home, join, create, host as separate chunks;
   `hostWorld`/demo engines riding the host/join chunks that use them
   (the `1234` demo lobby lives inside `JoinActivityPage` — the student
   chunk will still include the student demo engine; that's correct, the
   win is shedding the _teacher_ app). If `mockData/` barrels everything
   into the student chunk, note the number and leave deeper surgery out
   of scope — this prompt is route-level only.
3. Compiler check: grep the build output for `useMemoCache` (AGENTS.md →
   Conventions) to confirm the lazy wrappers didn't bail optimization.
4. Route behavior sweep: locale variants (`/he/...` mounts the same
   lazy elements), the `/demo*` redirects (they render `Navigate`, no
   suspense needed), ScrollToTop, and the back/forward cache. StrictMode
   dev double-mount must not double-fetch chunks (it doesn't — browser
   caches; just don't add ceremony).
5. **Demo parity:** the demos are pages in the same tree — they lazy-load
   with their pages; verify `/activity/host/1234` and
   `/activity/join/1234` still boot offline-fast with `?fast=10`.

**Edge cases:** a chunk that fails to load (student on flaky wifi mid-
navigation) — React surfaces a load error; the join flow's own
unreachable/retry work (doc
[10](10-a-blip-at-refresh-keeps-your-seat.md)) covers the API side, and a
Vite deploy invalidating old chunk hashes mid-session can throw on
navigate — add the standard `lazy` retry-on-failure only if it's cheap;
otherwise note it and move on (deploys during class hours are already
restricted post-launch).

**Tests:** none — build topology; the chunk report and the browser are
the verification.

**Done when:** `pnpm typecheck` + `pnpm build` green; chunk report shows
the teacher app out of the join path (record before/after main-chunk KB
in the commit message); `verify:smoke` passes against the dev stack;
demo routes boot with zero network beyond static assets; `useMemoCache`
still present in the build. Production check after push: Vercel Ready +
a hard-refresh join on chaverola.com loads. `pnpm format`, one commit to
`main`, push, tick this box, flip doc + README state to Complete.
