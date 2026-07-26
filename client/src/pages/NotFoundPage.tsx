import { LocaleLink } from "@/components/layout/LocaleLink";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/lib/usePageTitle";

/** Friendly catch-all. */
export function NotFoundPage() {
  usePageTitle("Page Not Found");

  return (
    <PlaceholderPage
      eyebrow="404"
      title="Nothing here 🫥"
      description="That page wandered off. Got a code from your teacher?"
    >
      {/* Join leads: whoever mistyped a path most likely has a code in hand. */}
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <LocaleLink to="/activity/join">Join an Activity</LocaleLink>
        </Button>
        <Button asChild size="lg" variant="outline">
          <LocaleLink to="/">Back home</LocaleLink>
        </Button>
      </div>
    </PlaceholderPage>
  );
}
