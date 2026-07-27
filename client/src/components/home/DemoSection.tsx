import { useTranslation } from "react-i18next";
import { Gamepad2, Presentation } from "lucide-react";

import {
  SectionEyebrow,
  SectionHeading,
} from "@/components/home/SectionHeading";
import { LocaleLink } from "@/components/layout/LocaleLink";
import { Button } from "@/components/ui/button";
import { DEMO_JOIN_CODE, DEMO_STUDENT_NAME } from "@/mockData";

/**
 * "See it in action": the homepage's two demo doorways, straight into the
 * real flows running the demo activity — the teacher's host dashboard
 * mid-round, and the student trip from the name step to a chat (the demo
 * skips code entry and prefills the name; see JoinActivityPage). Plain
 * text-and-button blocks, not icon cards, to match the page's hand-made look
 * (see DECISIONS.md → "The hero looks hand-made and never mentions AI").
 * The founder opens the same places in pitches via the speakable redirect
 * URLs /demo/teacher and /demo/student. Secondary buttons on purpose: solid
 * grape stays reserved for the hero's Join CTA, outline for Host.
 */
export function DemoSection() {
  const { t } = useTranslation("home");

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-16">
      <div className="flex flex-col items-start gap-5 sm:gap-6">
        <SectionEyebrow>{t("demo.eyebrow")}</SectionEyebrow>
        <SectionHeading>{t("demo.heading")}</SectionHeading>
        <p className="max-w-2xl text-lg text-pretty text-muted-foreground">
          {t("demo.body")}
        </p>
      </div>

      <div className="mt-8 grid gap-8 sm:mt-10 sm:grid-cols-2 sm:gap-12">
        <div className="flex flex-col items-start gap-3">
          <h3 className="text-lg font-semibold text-foreground">
            {t("demo.teacherTitle")}
          </h3>
          <p className="text-[15px] text-pretty text-muted-foreground">
            {t("demo.teacherBody")}
          </p>
          <Button asChild variant="secondary">
            <LocaleLink to={`/activity/host/${DEMO_JOIN_CODE}`}>
              <Presentation className="size-5 text-brand-grape" />
              {t("demo.teacherCta")}
            </LocaleLink>
          </Button>
        </div>

        <div className="flex flex-col items-start gap-3">
          <h3 className="text-lg font-semibold text-foreground">
            {t("demo.studentTitle")}
          </h3>
          <p className="text-[15px] text-pretty text-muted-foreground">
            {/* Read from the fixture, never spelled out — the demo's prefilled
                name and this sentence have to agree. */}
            {t("demo.studentBody", { studentName: DEMO_STUDENT_NAME })}
          </p>
          <Button asChild variant="secondary">
            <LocaleLink to={`/activity/join/${DEMO_JOIN_CODE}`}>
              <Gamepad2 className="size-5 text-brand-grape" />
              {t("demo.studentCta")}
            </LocaleLink>
          </Button>
        </div>
      </div>
    </section>
  );
}
