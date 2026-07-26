import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { StudentWorldLayout } from "@/components/layout/StudentWorldLayout";
// The code itself, not the `@/mockData` re-export of it. This module is eager,
// and reaching through the barrel drags every demo fixture (the host's seeded
// chats and chatter lines included) into the chunk a student loads first.
import { DEMO_JOIN_CODE } from "@chaverola/shared";

import { lazyPage } from "@/lib/lazyPage";
import { useLocalePath } from "@/lib/locale";

/*
  Every page is split out of the entry chunk, because the join screen is the
  moment a whole class waits on at once: thirty phones on one school AP, all
  fetching four digits' worth of screen. A student typing a code has no use
  for the teacher dashboard, the setup form, or the homepage, so none of it
  rides along any more.

  Each page is a named export, hence the `default` adapters. The pages export
  named components everywhere else in the app, and that stays true — only the
  split point needs the shape `lazy()` wants.

  Declared at module scope, so the two locale trees below (`/` and `/he`)
  share one chunk and one promise rather than fetching a page twice.
*/
const HomePage = lazyPage(() =>
  import("@/pages/HomePage").then((m) => ({ default: m.HomePage }))
);
const NotFoundPage = lazyPage(() =>
  import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage }))
);
const JoinActivityPage = lazyPage(() =>
  import("@/pages/student/JoinActivityPage").then((m) => ({
    default: m.JoinActivityPage,
  }))
);
const CreateActivityPage = lazyPage(() =>
  import("@/pages/teacher/CreateActivityPage").then((m) => ({
    default: m.CreateActivityPage,
  }))
);
const HostActivityPage = lazyPage(() =>
  import("@/pages/teacher/HostActivityPage").then((m) => ({
    default: m.HostActivityPage,
  }))
);

/**
 * A speakable demo URL. Always a redirect into the real flow, never a page of
 * its own — standalone /demo pages were tried and deleted for diverging from
 * the real components (see DECISIONS.md → "Routes & app structure").
 */
function DemoRedirect({ to }: { to: string }) {
  const localePath = useLocalePath();
  return <Navigate to={localePath(to)} replace />;
}

/**
 * The canonical route tree (see Shared_Project_Context.md). Rendered once at
 * the root and once under `/he` (Hebrew variant — same English text for now).
 * Two pathless layout groups: most pages live under the navbar shell
 * (AppLayout), while the student join flow gets the immersive, navbar-free
 * StudentWorldLayout.
 */
function LocalizedRoutes() {
  return (
    <>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="activity/create" element={<CreateActivityPage />} />
        {/* The param is the unguessable hostKey — the URL is the teacher's
            capability. The demo's `1234` rides the same param slot. */}
        <Route path="activity/host/:hostKey" element={<HostActivityPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route element={<StudentWorldLayout />}>
        {/* Both join routes render the same page so the code input can swap
            in-place for the name input when a code checks out. */}
        <Route path="activity/join" element={<JoinActivityPage />} />
        <Route path="activity/join/:joinCode" element={<JoinActivityPage />} />
      </Route>
      {/* The demo entry URLs — easy to say out loud in a meeting. Bare /demo
          lands on the teacher view because that's who a pitch is aimed at.
          The student entry skips the code screen: it lands on the name step
          with the demo name already filled in (see JoinActivityPage). */}
      <Route
        path="demo"
        element={<DemoRedirect to={`/activity/host/${DEMO_JOIN_CODE}`} />}
      />
      <Route
        path="demo/teacher"
        element={<DemoRedirect to={`/activity/host/${DEMO_JOIN_CODE}`} />}
      />
      <Route
        path="demo/student"
        element={<DemoRedirect to={`/activity/join/${DEMO_JOIN_CODE}`} />}
      />
    </>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/">{LocalizedRoutes()}</Route>
        <Route path="/he">{LocalizedRoutes()}</Route>
      </Routes>
    </>
  );
}
