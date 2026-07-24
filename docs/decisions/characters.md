# Characters & rosters

Part of the [Product & UX Decisions](../../DECISIONS.md) index — one file per
area. Entries are newest-first; add new ones at the top, and add a matching line
to the index in the same change. Replaced decisions move to Superseded at the
bottom of this file.

### A character's emoji is part of its name

_2026-07-24_

**Decision:** A character is a name, and nothing else. If it has an emoji, the
emoji lives inside that name string — `"Caesar's ghost 👻"` — so there is no
`emoji` field on `Character`, none on the wire, and no formatter that joins the
two. Every surface that shows a character (chat header, conversation lines,
lobby roster chips, reconnect banner, roster popover, end-of-chat reveal,
composer placeholder, the server's transcript email) renders `character.name`
verbatim. Whether a character gets an emoji is still the teacher's call, per
character: they type one or they don't. No placeholder glyph, no reserved gap.

**Why:** Founder call (2026-07-24). A separate emoji field made teachers fill
in a control they couldn't interpret, and it could only ever be set by our
picker — which meant it stopped working the moment that picker came off phones.
Emoji in the name have neither problem: the teacher sees exactly what students
will see, and any keyboard on earth can type one. See
[teacher-setup.md](teacher-setup.md#a-characters-emoji-is-typed-into-its-name)
for the input that replaced the emoji slot.

Removing the field deleted `characterLabel` along with it. That formatter
existed to join `name + emoji` in one place; with nothing to join, its 13 call
sites read `character.name` directly.

This is also still why
[the chat header summarizes the room](chat-behavior.md#the-chat-header-summarizes-the-room-and-tapping-it-shows-everyone)
with a count pill instead of emoji-chip avatars — there was never a guarantee
every character has an emoji, and now there isn't even a field to look in. The
demo data keeps the plain-name path visibly exercised: Marc Antony in the
join-flow roster and Julius Caesar on `/demo/student-chat` have no emoji on
purpose.

_Implemented in [types.ts](../../shared/src/types.ts) (the wire `Character`)
and [chat types](../../client/src/types/chat.ts)._

## Superseded

Replaced decisions, kept for history. Don't apply these; each date line links
to what replaced it.

### A character's emoji is optional, and labels simply drop it

_2026-07-14, superseded by
[A character's emoji is part of its name](#a-characters-emoji-is-part-of-its-name)_

**Decision:** `Character` carried an optional `emoji` field beside `name`.
Every surface rendered "Name emoji" when there was one and plain "Name" when
there wasn't: no placeholder glyph, no reserved gap, no trailing space.
`characterLabel` was the single formatter — nothing was allowed to hand-roll
`name + emoji` — and as of feature 11 it lived in `shared/labels.ts` so the
server's transcript email used the same rule, with a thin `Participant`-taking
wrapper on the client.

**Why it went:** the optional-and-dropped rule was sound; the separate field
was not. It asked teachers to populate a slot whose output they couldn't
picture, and it was only settable through our emoji picker, so it broke as soon
as that picker left phones. Folding the emoji into the name kept every rendering
rule above (a name without an emoji is still just a name) while deleting the
field and its formatter.
