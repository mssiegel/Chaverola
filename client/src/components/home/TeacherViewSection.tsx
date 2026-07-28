import { useTranslation } from "react-i18next";

import {
  SectionEyebrow,
  SectionHeading,
} from "@/components/home/SectionHeading";
import { ChatCard } from "@/components/Teacher/ChatCard";
import { useDemoContent } from "@/lib/demoContent";
import type { ChatMessage, Participant } from "@/types/chat";

interface TeacherViewSectionProps {
  /** Participants of the hero's live demo chat, straight from `useChatDemo`. */
  participants: Participant[];
  /** The hero chat's live message list — the card mirrors it in real time. */
  messages: ChatMessage[];
}

/**
 * "What it looks like for teachers": the real teacher monitoring card
 * (`ChatCard`) fed the same live chat as the hero chatbox above it. Real
 * names show next to characters here and nowhere else on the page — that
 * contrast is the whole pitch. Anything the visitor types up top lands in
 * this card too. Cleopatra's student is "Dana K", never "You": the teacher
 * assigns chats and is not a player (see DECISIONS.md → "Demo students have
 * short names, and the teacher is never one of them"). No `onEndChat` is
 * passed, so the card hides its End chat button — a landing page shouldn't
 * offer a destructive-looking control.
 */
export function TeacherViewSection({
  participants,
  messages,
}: TeacherViewSectionProps) {
  const { t } = useTranslation("home");
  const { heroNames } = useDemoContent();

  return (
    <section className="border-y border-border/70 bg-brand-grape-soft/30">
      {/* grid-cols-1 (not the implicit auto track) so the chat card clamps
          to the viewport on narrow phones instead of forcing min-content. */}
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-4 py-14 sm:py-20 lg:grid-cols-2 lg:gap-14">
        {/* Pitch */}
        <div className="flex flex-col items-start gap-5">
          <SectionEyebrow>{t("teacherView.eyebrow")}</SectionEyebrow>

          <SectionHeading>{t("teacherView.heading")}</SectionHeading>

          {/* No "this card" here: on phones the card renders well below this
              text, so spatial pointing breaks. The caption right above the
              card does the pointing instead — see DECISIONS.md. The cast's
              names come from the demo content, so this copy can't drift from
              the chat it describes. */}
          <p className="max-w-lg text-lg text-pretty text-muted-foreground">
            {t("teacherView.body", {
              self: heroNames.self,
              peer: heroNames.peer,
            })}
          </p>

          <ul className="max-w-lg list-disc space-y-2.5 ps-5 text-[15px] text-foreground/90 marker:text-brand-grape">
            <li>{t("teacherView.bullet1")}</li>
            <li>{t("teacherView.bullet2")}</li>
            <li>{t("teacherView.bullet3")}</li>
          </ul>
        </div>

        {/* The real monitoring card, live */}
        <div className="flex flex-col gap-3">
          <p className="text-center text-sm font-semibold text-brand-grape">
            {t("teacherView.caption")}
          </p>
          <div className="mx-auto w-full max-w-md">
            <ChatCard
              participants={participants}
              messages={messages}
              isEnded={false}
            />
          </div>
          <div className="mx-auto max-w-[92%] rotate-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground shadow-md">
            {t("teacherView.note", {
              self: heroNames.self,
              seat: heroNames.seat,
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
