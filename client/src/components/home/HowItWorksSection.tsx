import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { GraduationCap } from "lucide-react";

import {
  SectionEyebrow,
  SectionHeading,
} from "@/components/home/SectionHeading";
import { LocaleLink } from "@/components/layout/LocaleLink";
import { Button } from "@/components/ui/button";
import { DEMO_JOIN_CODE } from "@/mockData";

/**
 * "How it works for teachers": four quick steps that stress how little setup
 * hosting takes, ending in the Host CTA. Same deliberately plain styling as
 * the hero's numbered list — no icon cards or template chrome (see
 * DECISIONS.md → "The hero looks hand-made and never mentions AI").
 */
export function HowItWorksSection() {
  const { t } = useTranslation("home");

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
      <div className="flex flex-col items-start gap-5 sm:gap-6">
        <SectionEyebrow>{t("how.eyebrow")}</SectionEyebrow>
        <SectionHeading>{t("how.heading")}</SectionHeading>
      </div>

      <ol className="mt-8 grid gap-x-12 gap-y-8 sm:mt-10 sm:grid-cols-2">
        <Step n={1} title={t("how.step1.title")}>
          {t("how.step1.body")}
        </Step>
        <Step n={2} title={t("how.step2.title")}>
          {t("how.step2.body")}
        </Step>
        <Step n={3} title={t("how.step3.title")}>
          {t("how.step3.body")}
          {/* dir="ltr": the digits are a number, and their order must not
              follow the paragraph's direction. */}
          <span aria-hidden dir="ltr" className="mt-3 flex gap-1.5">
            {DEMO_JOIN_CODE.split("").map((digit, index) => (
              <span
                key={index}
                className="flex size-8 items-center justify-center rounded-md border border-border bg-card text-base font-bold text-brand-grape shadow-sm"
              >
                {digit}
              </span>
            ))}
          </span>
        </Step>
        <Step n={4} title={t("how.step4.title")}>
          {t("how.step4.body")}
        </Step>
      </ol>

      <div className="mt-10 flex flex-col items-center gap-2.5 sm:mt-12">
        {/* Matches the hero's Host button: solid grape stays reserved for
            the student Join CTA. */}
        <Button asChild size="lg" variant="outline">
          <LocaleLink to="/activity/create">
            <GraduationCap className="size-5 text-brand-grape" />
            {t("cta.host")}
          </LocaleLink>
        </Button>
        {/* The practical facts teachers check before trying a tool. The
            claims are founder-approved — see DECISIONS.md → "The how-it-works
            footer answers cost, accounts, and devices". "Free plan" (not
            "free to use") since the plans section below added a paid tier —
            see DECISIONS.md → "The homepage has a two-plan section, and the
            free plan stays the whole product". */}
        <ul className="flex flex-col items-center gap-1 text-center text-sm text-muted-foreground sm:flex-row sm:gap-2.5">
          <li>{t("how.fact1")}</li>
          <li aria-hidden className="hidden text-brand-grape sm:block">
            ·
          </li>
          <li>{t("how.fact2")}</li>
          <li aria-hidden className="hidden text-brand-grape sm:block">
            ·
          </li>
          <li>{t("how.fact3")}</li>
        </ul>
      </div>
    </section>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3.5">
      {/* dir="ltr": "1." is a digit plus a neutral, which an RTL line would
          reorder into ".1". Same fix as HomePage's HowStep. */}
      <span
        dir="ltr"
        className="w-7 shrink-0 text-2xl leading-7 font-bold text-brand-grape"
      >
        {n}.
      </span>
      <div className="space-y-1">
        <h3 className="text-lg leading-7 font-semibold text-foreground">
          {title}
        </h3>
        <p className="text-[15px] text-pretty text-muted-foreground">
          {children}
        </p>
      </div>
    </li>
  );
}
