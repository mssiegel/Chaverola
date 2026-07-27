import type { TFunction } from "i18next";

import type { Participant } from "@/types/chat";

import type { HostedChat, WaitingStudent } from "./hostWorld";

/** The confirmations the host page can be waiting on. */
export type PendingAction =
  | { kind: "remove-from-queue"; student: WaitingStudent }
  | { kind: "remove-from-chat"; chat: HostedChat; participant: Participant }
  | { kind: "end-all" }
  | { kind: "pause-all" }
  | { kind: "end-activity" };

/**
 * The confirmation copy per action — each names what actually happens.
 * `autoMatchOn` is read live at render, never frozen into the action: a
 * pending settings edit can flip it while the dialog is open, and the copy
 * must not promise a hold that won't happen.
 *
 * `t` comes in as a parameter and this stays a pure function, per the house
 * extraction rule: a hook here would be uncallable from `getFixedT`.
 * `confirmVariant` stays in code — it's behavior, not copy.
 */
export function confirmCopy(
  t: TFunction<"teacher">,
  action: PendingAction | null,
  autoMatchOn: boolean,
  teacherEmail: string | null,
  chatCount: number,
  demo: boolean
): {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Pause is reversible, so it confirms in the default color, not red. */
  confirmVariant: "default" | "destructive";
} {
  if (action?.kind === "remove-from-queue") {
    return {
      title: t("confirm.removeStudent.title", {
        name: action.student.realName,
      }),
      description: t("confirm.removeStudent.body"),
      confirmLabel: t("confirm.remove"),
      cancelLabel: t("confirm.cancel"),
      confirmVariant: "destructive",
    };
  }
  if (action?.kind === "remove-from-chat") {
    const groupChat =
      action.chat.participants.length - action.chat.inactiveStudentIds.length >
      2;
    return {
      title: t("confirm.removeFromChat.title", {
        name: action.participant.realName,
      }),
      description: groupChat
        ? t("confirm.removeFromChat.group")
        : t("confirm.removeFromChat.pair"),
      confirmLabel: t("confirm.remove"),
      cancelLabel: t("confirm.cancel"),
      confirmVariant: "destructive",
    };
  }
  if (action?.kind === "pause-all") {
    return {
      title: t("confirm.pause.title"),
      description: t("confirm.pause.body"),
      confirmLabel: t("confirm.pause.confirm"),
      cancelLabel: t("confirm.cancel"),
      confirmVariant: "default",
    };
  }
  if (action?.kind === "end-activity") {
    // The terminal wrap-up. Names the three consequences, then where the
    // transcript goes (with a live chat count) or that nothing will be sent.
    const emailLine = demo
      ? t("confirm.endActivity.demo")
      : !teacherEmail
        ? t("confirm.endActivity.noEmail")
        : chatCount === 0
          ? t("confirm.endActivity.noChats", { email: teacherEmail })
          : t("confirm.endActivity.send", {
              count: chatCount,
              email: teacherEmail,
            });
    return {
      title: t("confirm.endActivity.title"),
      description: `${t("confirm.endActivity.consequences")} ${emailLine}`,
      confirmLabel: t("confirm.endActivity.confirm"),
      cancelLabel: t("confirm.endActivity.cancel"),
      confirmVariant: "destructive",
    };
  }
  return {
    title: t("confirm.endAll.title"),
    description: autoMatchOn
      ? t("confirm.endAll.hold")
      : t("confirm.endAll.body"),
    confirmLabel: t("confirm.endAll.confirm"),
    cancelLabel: t("confirm.endAll.cancel"),
    confirmVariant: "destructive",
  };
}
