import type { ReactNode } from "react";
import { GraduationCap, Mail } from "lucide-react";

import {
  SectionEyebrow,
  SectionHeading,
} from "@/components/home/SectionHeading";
import { LocaleLink } from "@/components/layout/LocaleLink";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Same address as the founder's note, with a plan-specific subject. */
const CONTACT_MAILTO =
  "mailto:siegel.moshes@gmail.com?subject=Chaverola%20Complete%20Implementation&body=Hi%20Moshe%2C%0A%0A";

/**
 * The two plans, right above the founder's note. The free plan is the whole
 * current product and must never read as limited; Complete Implementation has
 * no listed price — its CTA opens a write-to-Moshe dialog. See DECISIONS.md →
 * "The homepage has a two-plan section, and the free plan stays the whole
 * product".
 */
export function PlansSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
      <div className="flex flex-col items-start gap-5 sm:gap-6">
        <SectionEyebrow>Plans</SectionEyebrow>
        <SectionHeading>The free plan is the whole thing.</SectionHeading>
        <p className="max-w-2xl text-lg text-pretty text-muted-foreground">
          Everything on this page is free for every teacher: the characters,
          the live dashboard, the reveal at the end. The second plan is for
          teachers and schools who want us working alongside them.
        </p>
      </div>

      <div className="mx-auto mt-8 grid w-full max-w-md gap-6 sm:mt-10 lg:max-w-4xl lg:grid-cols-2 lg:gap-8">
        <PlanCard
          name="Free"
          tagline="Everything Chaverola does today, for any teacher who wants it."
          bullets={[
            "Create activities and hand out secret characters",
            "Students chat in character from any browser, with no accounts and nothing to install",
            "A live teacher dashboard where you watch every student chat",
            "The name reveal at the end of each chat, when students find out who was who",
            "Transcripts emailed to you when class wraps up",
          ]}
          footer={
            /* Matches the other Host buttons: solid grape stays reserved
               for the student Join CTA. */
            <Button asChild size="lg" variant="outline">
              <LocaleLink to="/activity/create">
                <GraduationCap className="size-5 text-brand-grape" />
                Host an Activity
              </LocaleLink>
            </Button>
          }
        />

        <PlanCard
          highlighted
          sticker="With the Chaverola team"
          name="Complete Implementation"
          tagline="For teachers and schools that want help making Chaverola part of how they teach."
          bullets={[
            "Training from our team on fitting activities into your curriculum",
            "Training on running lessons that teach the material and that students love",
            <>
              Connections to{" "}
              <span className="whitespace-nowrap">
                <GoogleClassroomLogo />
                &nbsp;Google Classroom
              </span>{" "}
              and the other tools your school already uses
            </>,
            "A teacher account, so your characters are saved and ready for the next activity",
            "Mid-activity tasks: write them ahead of time, then push each one into your students' chats when the room is ready for it",
          ]}
          footer={
            <>
              <p className="text-sm text-muted-foreground">
                Priced per teacher or school.
              </p>
              <CompleteContactDialog />
            </>
          }
        />
      </div>
    </section>
  );
}

function PlanCard({
  name,
  tagline,
  bullets,
  footer,
  sticker,
  highlighted = false,
}: {
  name: string;
  tagline: string;
  bullets: ReactNode[];
  footer: ReactNode;
  sticker?: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border bg-card p-6 sm:p-8",
        highlighted
          ? "border-brand-grape/40 shadow-lg shadow-brand-grape/10"
          : "border-border shadow-md"
      )}
    >
      {sticker && (
        <span className="w-fit -rotate-1 rounded-md bg-brand-grape-soft px-2.5 py-1 text-xs font-bold text-brand-grape">
          {sticker}
        </span>
      )}
      <div className="space-y-1.5">
        <h3 className="text-2xl font-bold text-foreground">{name}</h3>
        <p className="text-[15px] text-pretty text-muted-foreground">
          {tagline}
        </p>
      </div>
      <ul className="space-y-2 text-[15px] text-foreground/90">
        {bullets.map((bullet, index) => (
          <li key={index} className="flex gap-2.5">
            <span aria-hidden className="shrink-0 font-bold text-brand-grape">
              ·
            </span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col items-center gap-2.5 pt-2 text-center">
        {footer}
      </div>
    </div>
  );
}

/**
 * The Google Classroom logo (gold frame, green board, three figures, eraser),
 * redrawn as a tiny inline SVG so nothing loads from Google's servers. Sits
 * inline with the integrations bullet; decorative, the text names the product.
 */
function GoogleClassroomLogo() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="inline-block size-4 -translate-y-px align-text-bottom"
    >
      <rect x="0.5" y="2.5" width="23" height="19" rx="2" fill="#ffc112" />
      <rect x="2.5" y="4.5" width="19" height="15" fill="#21a464" />
      <circle cx="7.4" cy="10.9" r="1.5" fill="#57bb8a" />
      <path d="M4.4 15.6c0-1.2 1.4-2.2 3-2.2s3 1 3 2.2v.7h-6z" fill="#57bb8a" />
      <circle cx="16.6" cy="10.9" r="1.5" fill="#57bb8a" />
      <path
        d="M13.6 15.6c0-1.2 1.4-2.2 3-2.2s3 1 3 2.2v.7h-6z"
        fill="#57bb8a"
      />
      <circle cx="12" cy="9.6" r="2.1" fill="#fff" />
      <path d="M7.9 16.3c0-1.8 1.8-3.1 4.1-3.1s4.1 1.3 4.1 3.1h-8.2z" fill="#fff" />
      <rect x="14.5" y="20.2" width="5" height="1.6" fill="#f1f1f1" />
    </svg>
  );
}

/**
 * There's no set price, so instead of a checkout the CTA opens a short note
 * with a prefilled email to Moshe. The raw address is shown too (select-all)
 * for anyone without a mail app wired up.
 */
function CompleteContactDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" variant="secondary">
          <Mail className="size-5 text-brand-grape" />
          Write to Moshe
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Let's figure out what fits</DialogTitle>
          <DialogDescription>
            Whether you're one teacher or a whole school, Complete
            Implementation is shaped around you, and so is the price. Write to
            Moshe with a little about what you're planning, and we'll take it
            from there.
          </DialogDescription>
        </DialogHeader>
        <Button asChild variant="secondary">
          <a href={CONTACT_MAILTO}>
            <Mail className="size-5 text-brand-grape" />
            Email Moshe
          </a>
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Or copy the address:{" "}
          <span className="font-semibold text-brand-grape select-all">
            siegel.moshes@gmail.com
          </span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
