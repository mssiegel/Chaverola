import type { Catalog } from "../../types";

/**
 * The chat pieces both roles render — composer, header, banners, transcript.
 *
 * Registered from `i18n/ns/chat.ts` by FOUR page modules, not one: the
 * homepage hero is a real chatbox (header + feed + composer), the teacher's
 * setup form and live settings panel open the same emoji picker the student
 * composer does, and the join flow renders all of it. Anything mounted on
 * only one of those belongs in `home` / `teacher` / `student` instead.
 */
export const chat = {
  // The gradient bar over every chat surface. Trailing spaces are load-bearing
  // — the character name follows in its own <bdi>.
  "header.youAre": "You're ",
  "header.with": "with ",
  "header.others_one": "and {{count}} other",
  "header.others_other": "and {{count}} others",
  "header.roster": "Who's in this chat",
  // Also the transcript's own inline tag; one string, one key.
  "header.you": "(you)",

  // The transcript itself.
  "line.retry": "Didn't send. Try again",
  "line.failed": "This didn't send",
  "line.newMessages": "New messages",

  /*
    Membership notices — written by the client, never the wire (see
    DECISIONS.md). The demo engine and the live reducers both post them, and
    the teacher's demo host page posts the "left" one too, which is why they
    sit here rather than in `student`.
  */
  "notice.left": "{{name, bidi}} left the chat",
  "notice.timedOut": "{{name, bidi}} couldn't get back in and left the chat",
  /** A removed student the teacher's frozen cast can't name. */
  "notice.someone": "Someone",
  /** A characterId the chat's cast can't resolve. Shouldn't happen — the
   *  server deals from the cast it froze — but the wire is the wire. */
  "notice.mysteryGuest": "Mystery guest",

  // `<1>` is the styled name — see PeerIsTyping's <Trans>.
  "typing.someone": "someone",
  "typing.line": "<1>{{name}}</1> is typing…",

  // The banners that float over the feed.
  "peer.fallback": "Your partner",
  "peer.lost": "{{name, bidi}} lost connection…",
  // `<1>` is the m:ss clock, isolated so an RTL line can't lay it out as 34:1.
  "peer.clock": "<1>{{clock}}</1> to come back",
  "peer.srWindow": "they have {{minutes}} minutes to come back",
  "peer.back": "{{name, bidi}} is back! 🎉",
  "self.reconnecting": "Reconnecting you…",
  paused: "Your teacher paused the chat. Eyes up front! 👀",

  // The message box.
  "composer.hold": "You're on a roll. Sending these in {{seconds}}s",
  "composer.pausedPlaceholder": "Paused. Hang tight…",
  "composer.talkAs": "Talk as {{name, bidi}}…",
  "composer.placeholder": "Type a message…",
  "composer.addEmoji": "Add emoji",
  "composer.send": "Send message",

  /*
    The emoji picker's own chrome. `emoji-picker-react` has no RTL support and
    no locale of its own, so the container forces `dir="ltr"` (it's a grid of
    pictures, not prose) and these three props carry the translation. Its "No
    results found" and its a11y live region are module constants inside the
    library and stay English — accepted.
  */
  "emoji.loading": "Loading emojis…",
  "emoji.search": "Search",
  "emoji.clear": "Clear",
  "emoji.suggested": "Recently used",
  "emoji.smileysPeople": "Smileys & People",
  "emoji.animalsNature": "Animals & Nature",
  "emoji.foodDrink": "Food & Drink",
  "emoji.travelPlaces": "Travel & Places",
  "emoji.activities": "Activities",
  "emoji.objects": "Objects",
  "emoji.symbols": "Symbols",
  "emoji.flags": "Flags",
} as const satisfies Catalog;

export type ChatCatalog = typeof chat;
