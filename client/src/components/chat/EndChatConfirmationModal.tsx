import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface EndChatConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  /** What ending the chat means from this viewer's seat. */
  description: string;
  /** Label for the "never mind" button. */
  cancelLabel: string;
}

/**
 * Confirmation step before ending a chat. Shared by the student and teacher
 * views — the consequences differ per seat, so each passes its own copy.
 */
export function EndChatConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  description,
  cancelLabel,
}: EndChatConfirmationModalProps) {
  // `common`: this dialog is mounted by the teacher's chat card, which the
  // homepage renders too.
  const { t } = useTranslation("common");
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title={t("endChat.title")}
      description={description}
      cancelLabel={cancelLabel}
      confirmLabel={
        <>
          {/* flip-rtl: a door-and-arrow glyph reads as "out this way". */}
          <LogOut className="flip-rtl size-4" />
          {t("endChat.confirm")}
        </>
      }
    />
  );
}
