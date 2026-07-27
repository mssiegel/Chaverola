# 06 — Somebody is watching the search console

State: **Complete**

**The problem.** Everything else in this directory is a claim made into the
void. Canonical tags, hreflang pairs, a sitemap and structured data all
produce no visible feedback in the repo — the only place that says whether
Google accepted them, ignored them, or found them contradictory is Search
Console, and nobody has ever opened one for this site.

Two things in particular need watching rather than assuming. Every unknown
path still returns HTTP 200 with the shell, so Google will report soft
404s, and the count is the honest measure of whether that deferred fix
matters. And hreflang is the single most commonly misconfigured signal on
the web; reciprocity failures are silent by design.

**Decisions in play.**

- "No third-party scripts" — the site loads none, self-hosts its fonts, and
  redraws the Google Classroom logo inline so nothing fetches from Google's
  servers ([`homepage.md`](../../decisions/homepage.md)). **Search Console
  verification must not break that.** A DNS TXT record adds no script; a
  verification meta tag adds no script; a Google Analytics-based
  verification would, and is out.
- "Every fact has ONE home" ([`AGENTS.md`](../../../AGENTS.md)) — the
  operational half of this doc belongs in
  [`operations.md`](../../operations.md), beside the Vercel and Render
  runbooks, not duplicated here.

**Settled (founder, 2026-07-28).** The **DNS TXT route**, on a Domain property,
with the domain's DNS at Squarespace. So **step 1 below shipped no code**:
neither the meta tag nor the token file was built, because a verified Domain
property makes both dead weight, and a token committed against a route nobody
took is worse than no token. Recorded as a decision in
[`analytics.md`](../../decisions/analytics.md#search-console-is-verified-by-dns-not-by-a-tag-on-the-page)
— it is the entry that keeps "no third-party scripts" intact, since a Google
Analytics-based verification was the one route that would have broken it.

**Google only.** Bing was skipped in the same call, so step 2's "do not verify
separately" advice is now the cheap way back rather than the thing that was done.
The verified property, the submitted sitemap and the URL Inspection passes on `/`
and `/he` are all Google's.

One thing step 1 gets wrong, written down because the next person will hit it:
the meta tag could **not** have gone through doc 01's `head[]`. That list reaches
the ten prerendered pages and misses `app.html`, which
[`prerender-head.mjs`](../../../client/scripts/prerender-head.mjs) never stamps
on purpose — it is the template every other file is re-stamped from, so touching
it would destroy idempotence. `client/index.html` is the only file that reaches
all ten pages and both fallback shells, so that is where a tag would have had to
live.

**Prompt order.** One prompt, run **last** — after doc
[04](04-crawlers-get-a-map-and-a-fence.md)'s sitemap is live in production,
because submitting a sitemap that 404s starts the relationship badly.

**This prompt is partly founder-blocked.** Verification needs the founder's
Google account and, for the recommended method, DNS access. An agent can
make the code side ready and write the checklist; it cannot click through
someone else's console. Do the half you can, then follow the blocked path
in the [README](README.md) rather than stalling the prompt.

- [x] Prompt — Verified, submitted, and watched

---

## Prompt — Verified, submitted, and watched

**Goal:** the founder can see whether Google and Bing accepted what the
last five docs shipped, and knows which two numbers to look at.

1. **Prepare both verification routes in code, so whichever the founder can
   act on is ready.**
   - **A `google-site-verification` meta tag** through doc 01's `head[]` —
     but note it must land on the **fallback** shell too, since Google will
     often fetch the bare origin. Sourcing the token from an env var rather
     than committing it keeps a rotatable secret out of git; sourcing it
     from a committed constant is simpler and the token is not
     confidential. Pick one, and say which in the comment.
   - **An HTML verification file** in `client/public/`, which Vercel serves
     ahead of the catch-all exactly as `robots.txt` is served. This one
     needs no code at all once the founder supplies the file.

   Recommend the **DNS TXT route** over both: it verifies a Domain
   property, which covers the apex, `www`, and both protocols in one go —
   and since doc 02 settled that `www` redirects to the apex, a Domain
   property is the only shape that sees both sides of that redirect.

2. **Bing:** do not verify separately. Bing Webmaster Tools imports a
   verified Google Search Console property in one step, which brings the
   sitemap with it. Say so in the runbook so nobody repeats the work.

   **IndexNow is deliberately skipped.** It exists to push instant
   change notifications for large, frequently-changing sites; ten static
   URLs that change a few times a year do not need it, and it would be one
   more key to hold.

3. **Submit the sitemap** at `https://chaverola.com/sitemap.xml` in both
   consoles, and run URL Inspection on `/` and `/he`. Inspection is the one
   place that shows the **crawled** HTML against the **rendered** HTML, so
   it is the direct proof that docs 01 through 05 landed in the bytes and
   not just in the browser.

4. **The runbook** goes in [`operations.md`](../../operations.md) — one
   short section naming what to check and when. Four things, and only four:
   - **Page indexing → Soft 404.** The count that says whether the deferred
     404-status fix is worth doing. If it is small and stable, it is not.
   - **Page indexing → "Duplicate without user-selected canonical"** and
     **"Alternate page with proper canonical tag"**. The first should be
     empty after doc 03; if it isn't, the canonical and the sitemap's
     `<loc>` disagree somewhere, which is the trailing-slash defect doc 04
     warns about.
   - **Whether `/he` URLs are indexed at all.** Hebrew is equal priority
     for this effort, and this is the number that says whether that
     landed. **Search Console retired its International Targeting report
     in 2022**, so hreflang errors no longer surface there — validate the
     tags with a third-party hreflang checker instead, and write that in
     the runbook so the next person doesn't hunt for a report that no
     longer exists.
   - **Performance → queries.** Which words teachers actually arrive on.
     This is the only feedback loop that can tell the founder whether the
     meta copy from `ca5ddba` guessed right, and it is worth more than the
     other three combined.

   Set expectations in the runbook: a new site with no backlinks takes
   weeks, not days, and an empty report in week one means nothing.

5. **Demo parity:** none — this is operational. Note it.

**Edge cases:** verification tokens sometimes need to survive a redeploy;
if the meta-tag route is used, confirm it appears on the fallback shell and
not only on prerendered pages, since Google may fetch a URL that isn't in
`PAGE_META`. A Domain property verified by DNS keeps working through
hosting changes, which is another reason to prefer it. If the founder
verifies a URL-prefix property on `www` rather than the apex, it will see
almost nothing, because everything redirects away from it — worth stating
in the handover, since it is an easy and quiet mistake.

**Tests:** none — configuration and a runbook.

**Done when:** the code-side verification route is in place and deployed;
the checklist is written into
[`operations.md`](../../operations.md); and either the founder has verified
both properties and submitted the sitemap, or the question is in
[`questions-for-the-founder.md`](questions-for-the-founder.md) with the doc
state flipped to Blocked. `pnpm format`, one commit to `main`, push, tick
this box, flip doc + README state to Complete.
