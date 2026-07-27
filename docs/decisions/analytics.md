# Analytics

Part of the [Product & UX Decisions](../../DECISIONS.md) index — one file per
area. Entries are newest-first; add new ones at the top, and add a matching line
to the index in the same change. Replaced decisions move to Superseded at the
bottom of this file.

### Search Console is verified by DNS, not by a tag on the page

_2026-07-28_

**Decision:** `chaverola.com` is verified as a Search Console **Domain property**
through a DNS TXT record at Squarespace, the registrar. No
`google-site-verification` meta tag ships in `client/index.html`, and no token
file sits in `client/public/`. **Google only:** Bing Webmaster Tools is not set
up, and IndexNow is not used.

**Why:** Founder call, 2026-07-28. A Domain property is the only shape that sees
both sides of the `www` → apex redirect ([branding.md](branding.md)), so a
URL-prefix property on `www` would report almost nothing; and DNS verification
keeps working through a hosting change, which a tag or a file does not. Neither
code route was built, because both become dead weight the moment the Domain
property verifies — and the tag would have had to live in `client/index.html`
rather than a prerendered head, since `scripts/prerender-head.mjs` deliberately
never stamps `app.html`, the file Google fetches for every unmatched URL.

Bing was skipped in the same call, on attention rather than on principle. It
costs nothing to add later, because Bing Webmaster Tools imports a verified
Search Console property in one step and brings the sitemap with it, so nothing
here needs to change first.

A Google Analytics-based verification was **never on the table**: it would have
loaded the first third-party script this codebase has ever served, against
[Analytics is Vercel Web Analytics, not Google](#analytics-is-vercel-web-analytics-not-google).
Search Console itself adds no script — it reads the site the way a crawler does.

_Operational half in
[operations.md](../operations.md#search-console--the-four-numbers-worth-watching)._

### Analytics never reports a hostKey or a live join code

_2026-07-27_

**Decision:** Every pageview passes through `beforeSend` before it leaves the
browser. `/activity/host/<key>` is reported as `/activity/host/:hostKey` and
`/activity/join/<code>` as `/activity/join/:joinCode`; the query string and hash
are dropped whole. Two things survive deliberately: the **locale prefix**, so
`/he` counts separately, and the demo's **`1234`**, which is printed in the
README and pasted into pitch emails and is therefore public by construction —
demo traffic is the number a pitch is trying to move.

**Why:** The hostKey is the teacher's capability
([Host access is a URL capability](backend-api.md#host-access-is-a-url-capability--the-hostkey--not-an-account)),
and Vercel Analytics reports `location.href` verbatim. Vercel already sees that
URL — it serves the request — so this is not about hiding it from Vercel. It is
about the surface: an analytics dashboard lists paths in a UI and keeps them for
the retention window, which turns any shared screenshot into a live credential
leak, and makes a working credential available to anyone with dashboard access.
The query string is dropped rather than allowlisted because `?fast` is the only
param the app itself uses and anything else in there arrived from outside.

This function runs on every pageview and is the only thing standing between a
credential and a third-party dashboard, so it carries the area's only unit test
— deliberately, against the standing preference for fewer tests.

_Implemented in [analytics.ts](../../client/src/lib/analytics.ts), mounted in
[App.tsx](../../client/src/App.tsx)._

### Analytics is Vercel Web Analytics, not Google

_2026-07-27_

**Decision:** `@vercel/analytics` — one `<Analytics>` component mounted in
`App`, counting pageviews across every route. Google Analytics was built first
and removed before it shipped. Web Analytics is enabled on the Vercel project;
there is no environment variable and no measurement id.

**Why:** Founder call, on engineering time: the Vercel setup is a package and a
component against a property that already exists, where the Google one needed a
property, a data stream, a measurement id baked in as a build-time env var,
consent-mode ordering to stay cookieless, and a dashboard toggle
(Enhanced Measurement's history-change pageview) that would silently re-open a
hostKey leak if anyone ever re-ticked it. Explicitly reversible — "we can always
switch to Google Analytics later."

Three properties that came free and are worth not losing:

- **Same-origin in production.** The script is served from
  `/_vercel/insights/script.js`, so the deployed app makes no third-party
  request at all; Google's tag was going to be the first one this codebase had
  ever loaded. Dev is the exception — `isDevelopment()` swaps in a debug script
  from `va.vercel-scripts.com` that logs to the console instead of reporting.
  Only localhost ever touches that host.
- **Cookieless.** No `_ga`, no persistent identifier, so no consent banner —
  which the founder had already ruled out. That matters more than usual here:
  the users are minors, `/he` puts the product in Israeli classrooms, and the
  backend's own rule is
  [Nothing persists](backend-api.md#nothing-persists-activities-live-in-memory-for-12-hours-and-deploys-wipe-them).
- **The demo stays honest.** AGENTS.md's "the demo is structurally zero-network"
  survives, because same-origin insights beacons are not a call out to anyone.

The dependency is a real cost against the client's
[deliberately lean policy](backend-api.md#considered-and-rejected-for-the-backend-tanstack-query-dotenv-a-hostkey-stash-an-npm-conversion)
— accepted because the alternative was hand-rolling a tag loader, a consent
sequence, and a redaction layer to replace it.

**Still outstanding:** no privacy policy, no terms, and
[no footer](homepage.md) to link them from. Cookieless and same-origin lower the
exposure; they do not remove the obligation for a free product used by
schoolchildren. To be done before launch.

_Implemented in [analytics.ts](../../client/src/lib/analytics.ts) and
[App.tsx](../../client/src/App.tsx)._
