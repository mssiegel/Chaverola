import { useTranslation } from "react-i18next";

import { ChatFrame } from "@/components/chat/ChatFrame";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { Conversation } from "@/components/chat/Conversation";
import { MessageComposer } from "@/components/chat/MessageComposer";
import type { ChatDemo } from "@/components/chat/useChatDemo";
import { selfFirstCharacterColors } from "@/lib/characterColor";

interface HeroChatboxProps {
  /**
   * The live demo chat, owned by the homepage so the teacher preview further
   * down can mirror the exact same conversation. See DECISIONS.md → "The
   * teacher preview mirrors the hero chat live".
   */
  chat: ChatDemo;
}

/**
 * The live sample chat on the homepage hero. It reuses the real student
 * chatbox pieces (frame + header + conversation feed + composer) and the demo
 * engine, so what a visitor sees — and types into — is the actual product,
 * minus the End chat controls that don't belong on a landing page. See
 * DECISIONS.md → "Hero chatbox is a live demo".
 */
export function HeroChatbox({ chat }: HeroChatboxProps) {
  const { t } = useTranslation("home");
  const characterColors = selfFirstCharacterColors(
    chat.self,
    chat.participants
  );

  return (
    <ChatFrame className="h-[380px] sm:h-[420px]">
      <ChatHeader
        self={chat.self}
        peers={chat.peers}
        characterColors={characterColors}
        peerSuffix={
          <span className="text-white/60">{t("hero.chatPeerSuffix")}</span>
        }
      />

      <Conversation
        participants={chat.participants}
        selfId={chat.self.id}
        messages={chat.messages}
        typingPeerId={chat.typingPeerId}
        peerState={chat.peerState}
        offlinePeerId={chat.offlinePeerId}
        reconnectSecondsLeft={chat.reconnectSecondsLeft}
        characterColors={characterColors}
      />

      <MessageComposer
        onSend={chat.send}
        selfCharacterLabel={chat.self.character.name}
      />
    </ChatFrame>
  );
}
