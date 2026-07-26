import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";

import type { LobbyConnectionState } from "@chaverola/shared";

import { ConversationLines } from "@/components/chat/ConversationLines";
import { participantsById } from "@/lib/participants";
import type {
  ChatMessage,
  Participant,
  PeerConnectionState,
} from "@/types/chat";

import { ChatPausedBanner } from "./ChatPausedBanner";
import { PeerIsTyping } from "./PeerIsTyping";
import { PeerReconnectBanner } from "./PeerReconnectBanner";
import { SelfReconnectBanner } from "./SelfReconnectBanner";

/**
 * How close to the bottom still counts as "following the conversation". Wide
 * enough that a half-line of scroll jitter doesn't unpin, narrow enough that
 * deliberately scrolling up does.
 */
const PIN_THRESHOLD_PX = 48;

interface ConversationProps {
  participants: Participant[];
  selfId: string;
  messages: ChatMessage[];
  typingPeerId: string | null;
  peerState: PeerConnectionState;
  offlinePeerId: string | null;
  /** Seconds left in the offline peer's reconnect window (null: no window). */
  reconnectSecondsLeft?: number | null;
  /** The teacher's activity-wide pause: a banner floats over the feed. */
  isPaused?: boolean;
  /** The student's own link. Absent = connected (hero, teacher cards). */
  selfConnection?: LobbyConnectionState;
  /** Distinct color (CSS var) per character id in this room. */
  characterColors: Map<string, string>;
  /** Re-send a line whose echo never arrived (the live student chat only). */
  onRetryMessage?: (messageId: string) => void;
}

/**
 * The scrolling conversation feed for the student view: the shared message
 * lines (see ConversationLines) plus the reconnect banner and the typing
 * indicator. Follows the newest message while you're at the bottom, and gets
 * out of the way while you're reading further up.
 */
export function Conversation({
  participants,
  selfId,
  messages,
  typingPeerId,
  peerState,
  offlinePeerId,
  reconnectSecondsLeft = null,
  isPaused = false,
  selfConnection = "connected",
  characterColors,
  onRetryMessage,
}: ConversationProps) {
  const byId = participantsById(participants);

  const isGroup = participants.length > 2;
  const feedRef = useRef<HTMLDivElement>(null);

  // Whether the reader is riding the bottom of the feed. A ref, not state:
  // nothing renders from it, and the React Compiler only allows ref writes
  // outside render — which the scroll handler and the effects below are.
  // Starts true so a freshly opened chat opens at the newest line.
  const pinnedRef = useRef(true);
  const lastTopRef = useRef(0);

  // How many lines there were when the reader scrolled away from the bottom;
  // null while they're following along. Anything past that count arrived
  // behind their back, which is what the chip offers to catch them up on.
  // Kept as a count rather than a boolean so the chip is derived during
  // render — no effect has to reach in and set it.
  const [readingFromCount, setReadingFromCount] = useState<number | null>(null);

  const ownNewest = messages[messages.length - 1]?.senderId === selfId;
  const hasNewBelow =
    readingFromCount !== null &&
    messages.length > readingFromCount &&
    // Your own line is never something to be caught up on: sending scrolls
    // you back down, so the chip must not flash on the way there.
    !ownNewest;

  const scrollToNewest = (behavior: ScrollBehavior) => {
    const el = feedRef.current;
    if (!el) return;
    pinnedRef.current = true;
    setReadingFromCount(null);
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  // A feed shorter than its frame gives a distance of 0 or less, so it reads
  // as pinned without a special case. `prev ?? messages.length` keeps the
  // count from the moment of leaving the bottom — scrolling further up must
  // not reset the mark and swallow the lines already missed.
  const handleScroll = () => {
    const el = feedRef.current;
    if (!el) return;
    const top = el.scrollTop;
    const wentUp = top < lastTopRef.current;
    lastTopRef.current = top;
    const atBottom =
      el.scrollHeight - top - el.clientHeight <= PIN_THRESHOLD_PX;
    // Only an UPWARD scroll can unpin. A downward one is either the reader
    // coming back or the catch-up animation below still running, and the
    // animation is the reason this isn't just `atBottom`: the smooth scroll
    // takes a few hundred milliseconds, and a second line landing while it
    // plays fires a scroll event from halfway up. Reading that as "they went
    // off to read" strands the feed mid-transcript on a fast exchange.
    pinnedRef.current = atBottom || (pinnedRef.current && !wentUp);
    setReadingFromCount((prev) =>
      pinnedRef.current ? null : (prev ?? messages.length)
    );
  };

  // Follow the newest message / typing indicator, but only from the bottom —
  // scrolling up to re-read what a partner said used to get yanked back down
  // the moment anyone typed. Your own send is the exception: it always brings
  // you back, because you just spoke. Scroll only the feed itself —
  // scrollIntoView would also scroll the page, which yanks the viewport
  // around when the chatbox is embedded mid-page (homepage hero).
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    if (!pinnedRef.current && !ownNewest) return;
    pinnedRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, typingPeerId, ownNewest]);

  // Re-pin when the feed itself changes size: on phones the keyboard shrinks
  // the chat card, which would otherwise strand the newest lines below the
  // fold. Instant, not smooth — this fires mid-keyboard-animation. This was
  // unconditional back when the feed always snapped to newest; now it honors
  // the pin, and the keyboard case it was written for still works — a student
  // opening the keyboard is a student composing, which is the pinned case.
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (pinnedRef.current) el.scrollTo({ top: el.scrollHeight });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const typingName = typingPeerId
    ? (byId.get(typingPeerId)?.character.name ?? null)
    : null;
  const offlinePeer = offlinePeerId ? byId.get(offlinePeerId) : undefined;
  const offlineName = offlinePeer?.character.name ?? null;

  return (
    <div
      ref={feedRef}
      onScroll={handleScroll}
      // h-0 + flex-auto (basis auto, so the explicit height is the flex
      // base): the feed grows to whatever space the frame has but contributes
      // nothing to intrinsic sizing. With flex-1 (basis 0%) a full feed's
      // content size leaks up and grows the phone chat card — and the page —
      // past the keyboard-shrunk viewport instead of scrolling.
      className="scroll-soft relative h-0 flex-auto overflow-y-auto px-3 py-3 text-[15px] leading-6 sm:px-4"
    >
      {(isPaused ||
        selfConnection === "reconnecting" ||
        peerState !== "connected") && (
        <div className="sticky top-0 z-10 -mx-3 mb-2 flex flex-col items-center gap-1.5 px-3 sm:-mx-4 sm:px-4">
          {/* Pause on top of a still-ticking reconnect countdown: both can
              apply — the grace runs through a pause. */}
          {isPaused && <ChatPausedBanner />}
          {/* Your own drop replaces the peer banner rather than stacking with
              it: whatever we last heard about a partner came down the same
              line that just died, so it's a claim this screen can't back up
              (the lobby ranks its pills the same way). */}
          {selfConnection === "reconnecting" ? (
            <SelfReconnectBanner />
          ) : (
            <PeerReconnectBanner
              peerState={peerState}
              peerName={offlineName}
              reconnectSecondsLeft={reconnectSecondsLeft}
            />
          )}
        </div>
      )}

      <ConversationLines
        participants={participants}
        messages={messages}
        characterColors={characterColors}
        selfId={selfId}
        onRetryMessage={onRetryMessage}
      />

      <PeerIsTyping characterName={typingName} isGroup={isGroup} />

      {/* Sticky, not absolute: as the last child it sits inline at the end of
          the transcript when you're at the bottom, and floats over the feed's
          bottom edge while you're reading further up — the same trick the
          banner slot above uses, flipped. */}
      {hasNewBelow && (
        <div className="sticky bottom-2 z-10 -mx-3 flex justify-center px-3 pt-2 sm:-mx-4 sm:px-4">
          <button
            type="button"
            onClick={() => scrollToNewest("smooth")}
            className="flex w-fit max-w-full animate-in items-center gap-1.5 rounded-full border border-brand-grape/25 bg-card px-3 py-1.5 text-sm font-medium text-brand-grape shadow-md transition-colors fade-in slide-in-from-bottom-2 hover:bg-brand-grape-soft active:scale-[0.98] motion-reduce:animate-none"
          >
            <span className="min-w-0 truncate">New messages</span>
            <ArrowDown aria-hidden className="size-4 shrink-0" />
          </button>
        </div>
      )}
    </div>
  );
}
