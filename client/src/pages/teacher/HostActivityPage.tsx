import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, RotateCw } from "lucide-react";
import { useParams } from "react-router-dom";

// Side-effect import: registers the `teacher` namespace into this page chunk.
import "@/i18n/ns/teacher";
// …and `chat`, for the chat cards' transcript lines and the emoji pickers in
// the live settings panel's character rows.
import "@/i18n/ns/chat";

import { DemoBanner } from "@/components/demo/DemoBanner";
import { BrandGlow } from "@/components/layout/BrandGlow";
import { LocaleLink } from "@/components/layout/LocaleLink";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { HostActivityDashboard } from "@/components/Teacher/HostActivity";
import { useHostActivityDemo } from "@/components/Teacher/HostActivity/useHostActivityDemo";
import { useHostActivityLive } from "@/components/Teacher/HostActivity/useHostActivityLive";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDemoContent } from "@/lib/demoContent";
import { sameRoster } from "@/lib/hostActivity";
import { usePageMeta } from "@/lib/usePageMeta";
import { useHostedActivityLookup } from "@/lib/useHostedActivityLookup";
import { DEMO_JOIN_CODE, demoHostedActivity } from "@/mockData";
import type { ActivitySettings, HostedActivity } from "@/types/activity";

/**
 * `/activity/host/:hostKey` — the teacher's live activity page. The URL is
 * the capability: the create form lands here with the freshly minted key,
 * and the same link keeps working from any device (shareable with an
 * assistant teacher; see DECISIONS.md → "Host access is a URL capability").
 *
 * Which activity renders: `1234` hosts the Rome demo, fully client-simulated
 * — the same activity the student side mocks, so the pin on screen really
 * works on `/activity/join` in another tab. Every other param resolves over
 * `GET /activities/host/:hostKey` and then holds a live teacher socket for
 * the real queue; a link that doesn't resolve (expired activity, stale
 * 4-digit link, typo) gets a friendly not-found — the old
 * always-redirect-to-the-demo is gone now that real links exist.
 */
export function HostActivityPage() {
  const { hostKey } = useParams();
  // "teacher" first so unprefixed keys resolve there; "common" for the two
  // shell-grade buttons this page reuses.
  const { t } = useTranslation(["teacher", "common"]);

  // `1234` is the one host URL anyone is meant to share — it's what /demo and
  // /demo/teacher redirect into, and what gets pasted into a pitch email — so
  // it carries a pair written for that reader. A real session is behind an
  // unguessable key and never indexed, so it keeps a plain private title and
  // reuses it as the description rather than carrying a second string nothing
  // reads.
  //
  // Chosen here rather than by a second usePageMeta inside
  // DemoHostActivityView: child effects flush before the parent's, so this
  // call would write the private title back over the demo's on every commit,
  // and the three inline branches below would lose their meta entirely.
  const isDemo = hostKey === DEMO_JOIN_CODE;
  usePageMeta(
    isDemo ? t("host.demo.meta.title") : t("host.meta.title"),
    isDemo ? t("host.demo.meta.description") : t("host.meta.title")
  );

  // The demo never consults this: the hook settles `1234` (or any other
  // non-key-shaped param) as not-found without a network trip.
  const { lookup, retry } = useHostedActivityLookup(hostKey);

  if (isDemo) {
    return <DemoHostActivityView key={DEMO_JOIN_CODE} />;
  }

  if (lookup.state === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
        <Loader2
          aria-hidden
          className="size-8 animate-spin text-brand-grape motion-reduce:animate-none"
        />
        <p className="text-lg font-semibold text-foreground">
          {t("host.loading")}
        </p>
      </div>
    );
  }

  if (lookup.state === "unreachable") {
    return (
      <PlaceholderPage
        eyebrow={t("host.badge")}
        title={t("host.unreachable.title")}
        description={t("host.unreachable.body")}
      >
        <Button size="lg" onClick={retry}>
          {/* No flip-rtl: RotateCw is a cycle glyph, not a direction. */}
          <RotateCw aria-hidden className="size-4" />
          {t("common:error.retry")}
        </Button>
      </PlaceholderPage>
    );
  }

  if (lookup.state === "not-found") {
    return <HostActivityNotFound />;
  }

  // The lookup only settles "found" for a pattern-valid key, so hostKey is
  // a real string on this branch.
  return (
    <LiveHostActivityView
      key={hostKey}
      initialActivity={lookup.activity}
      hostKey={hostKey!}
    />
  );
}

/**
 * The friendly dead-link screen — reached from a lookup that 404ed, and
 * from a live class whose activity vanished under it (a server wipe or
 * restart mid-lesson ends every class; the socket surfaces it).
 */
function HostActivityNotFound() {
  const { t } = useTranslation(["teacher", "common"]);
  return (
    <PlaceholderPage
      eyebrow={t("host.badge")}
      title={t("host.notFound.title")}
      description={t("host.notFound.body")}
    >
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <LocaleLink to="/activity/create">{t("host.newActivity")}</LocaleLink>
        </Button>
        <Button asChild size="lg" variant="outline">
          <LocaleLink to="/">{t("common:notFound.backHome")}</LocaleLink>
        </Button>
      </div>
    </PlaceholderPage>
  );
}

/**
 * The shared page shell: brand glow, badge, and (on the demo) the sticky
 * pretend-students banner.
 */
function HostActivityChrome({
  demo = false,
  children,
}: {
  demo?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation("teacher");
  return (
    <div className="relative isolate">
      {/* The demo's pretend-students banner pins below the navbar for the
          whole scroll; HostHeader's condensed waiting bar stands down on the
          demo so the two never fight over that band. */}
      {demo && <DemoBanner />}

      <BrandGlow />

      <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-16 sm:pt-10">
        <div className="mb-5">
          <Badge>{t("host.badge")}</Badge>
        </div>
        {children}
      </div>
    </div>
  );
}

/*
  The demo/live split is a component split, never a conditional hook (the
  react-hooks lint forbids it and the React Compiler needs it clean): each
  branch is its own thin wrapper calling its own engine hook, and the
  dashboard just takes the resulting HostEngine.

  Edits split by kind on a real activity. SETTINGS are synced: every commit
  that changes them also emits settings:update through the engine (one
  interception point below catches the rail's auto-match switch, End-all's
  auto-match hold, and the panel's commits), the server validates and keeps
  them, and the teacher's other devices hear settings:changed. The TEACHER'S
  EMAIL syncs through the same wrapper (activity:update-email, no echo
  event) — the server is what sends the transcripts, so a local-only edit
  would silently mail the old address. The HOST NAME, STUDENT INSTRUCTIONS
  and CHARACTER ROSTER sync the same way (activity:update-details, features
  17 and 18, no echo either — a second device is last-write-wins like the
  email), so the edit survives a refresh, a student joining later gets the
  current copy, and students sitting in the lobby watch it change live (a
  silent swap, no announcement — founder call).

  The roster's reach stops at the door of a running chat, on purpose: a
  rename lands on the lobby chips and on every chat that starts afterward,
  while the two students already mid-scene keep the names they began with
  and so does the teacher's card for them (the server froze that cast at
  chat start — feature 18 prompt 1). So folding a roster edit into
  `activity` updates the lobby-facing copy and the pairing rail, never a
  chat card. See DECISIONS.md → "Teacher live activity page".
  On the demo everything is local because the whole class is client-side.
*/

function DemoHostActivityView() {
  // The demo activity is cast per language, so it's read here rather than
  // passed down — `/activity/host/1234` opens Rome, `/he/...` opens Tel Aviv.
  const demo = useDemoContent();
  const [activity, setActivity] = useState(() =>
    demoHostedActivity(demo.activity)
  );
  const engine = useHostActivityDemo(activity);

  return (
    <HostActivityChrome demo>
      <HostActivityDashboard
        activity={activity}
        onActivityChange={setActivity}
        engine={engine}
        demoTriggers={engine}
      />
    </HostActivityChrome>
  );
}

function LiveHostActivityView({
  initialActivity,
  hostKey,
}: {
  initialActivity: HostedActivity;
  hostKey: string;
}) {
  // The activity died under the class (server wipe/restart). Rendering the
  // not-found here unmounts the connected view — and with it the socket —
  // instead of leaving a dead connection behind the screen.
  const [gone, setGone] = useState(false);

  if (gone) return <HostActivityNotFound />;
  return (
    <ConnectedHostActivityView
      initialActivity={initialActivity}
      hostKey={hostKey}
      onActivityGone={() => setGone(true)}
    />
  );
}

function ConnectedHostActivityView({
  initialActivity,
  hostKey,
  onActivityGone,
}: {
  initialActivity: HostedActivity;
  hostKey: string;
  onActivityGone: () => void;
}) {
  const [activity, setActivity] = useState(initialActivity);
  const engine = useHostActivityLive({
    hostKey,
    onActivityGone,
    // Another host device edited the settings, or this device reconnected
    // and its first snapshot carried server truth — fold the server's copy
    // into our activity state. The settings panel's own merge effect then
    // folds it into any open draft (mergeExternalSettings), so a half-typed
    // edit survives. Deliberately NOT routed through handleActivityChange: a
    // sync must never echo back as another settings:update.
    onSettingsSync: (settings) =>
      setActivity((prev) => ({ ...prev, settings })),
  });

  // The one interception point for edits reaching the server: the rail's
  // auto-match switch, End-all's auto-match hold, and the settings panel's
  // debounced commits all arrive here as a whole next activity.
  const handleActivityChange = (next: HostedActivity) => {
    const prev = activity.settings;
    const settingsChanged = (
      Object.keys(next.settings) as (keyof ActivitySettings)[]
    ).some((key) => prev[key] !== next.settings[key]);
    if (settingsChanged) engine.updateSettings(next.settings);
    // The email syncs beside the settings — it decides where the transcripts
    // land, and the send happens on the server long after this tab may be
    // gone. An emptied field arrives as `undefined` and travels as an
    // explicit null. Only valid values get here: the panel holds its commit
    // while the draft has a problem, so a half-typed address never emits.
    if (activity.teacherEmail !== next.teacherEmail) {
      engine.updateTeacherEmail(next.teacherEmail ?? null);
    }
    // The details sync the same way (feature 17, roster added by 18): the
    // host name, the lobby instructions and the cast all decide what a
    // joining student sees, so a local-only edit would greet latecomers with
    // the old ones. An emptied instructions box arrives as `undefined` and
    // travels as an explicit null — a clear. The roster is compared by
    // CONTENT, not identity: activityFromLiveDraft rebuilds the array on
    // every debounced commit, so an identity check would re-send the whole
    // cast each time the teacher paused typing in any other field. No echo
    // comes back to fold in: a second host device is last-write-wins, like
    // the email — including for the roster, so a device that slept through
    // another's edit overwrites it on its next commit (founder call,
    // 2026-07-26).
    if (
      !sameRoster(activity.characters, next.characters) ||
      activity.hostName !== next.hostName ||
      activity.studentInstructions !== next.studentInstructions
    ) {
      engine.updateDetails({
        characters: next.characters,
        hostName: next.hostName,
        studentInstructions: next.studentInstructions ?? null,
      });
    }
    setActivity(next);
  };

  return (
    <HostActivityChrome>
      <HostActivityDashboard
        activity={activity}
        onActivityChange={handleActivityChange}
        engine={engine}
      />
    </HostActivityChrome>
  );
}
