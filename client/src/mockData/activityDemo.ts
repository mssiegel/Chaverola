import { DEMO_JOIN_CODE } from "@chaverola/shared";
import type { Activity } from "@/types/activity";

/*
  The one mock activity behind the student join flow. Per the project brief,
  the demo join code `1234` always works, fully client-simulated; real codes
  resolve over the API. DEMO_JOIN_CODE itself lives in @chaverola/shared
  (the server refuses to issue or answer for it) and is re-exported here.
*/

export { DEMO_JOIN_CODE };

/**
 * The name waiting in the demo's name field, so demo entries (the homepage's
 * "Try the student side", /demo/student) are one click from the lobby.
 * Deliberately absent from every pretend roster, so the demo never shows two
 * Rachels side by side.
 */
export const DEMO_STUDENT_NAME = "Rachel";

export const demoActivity: Activity = {
  joinCode: DEMO_JOIN_CODE,
  hostName: "Ms. Cohen",
  // 239 chars on purpose: the instructions counter appears at 200 and turns
  // red at the 250-char cap, so this sits between — the demo shows the
  // counter working instead of a seeded value that reads as an error. Keep
  // any rewrite at 200-249 chars.
  studentInstructions:
    "Rome, on the Ides of March. A rumor is going around the forum, and " +
    "nobody knows who to trust. Stay in character and ask nosy questions. " +
    "And don't tell anyone what you saw last night: someone in this chat " +
    "knows more than they're letting on.",
  characters: [
    { id: "caesars-ghost", name: "Caesar's ghost 👻" },
    { id: "brutus", name: "Brutus 🔪" },
    { id: "cleopatra", name: "Cleopatra 👑" },
    // No emoji on purpose: a name is just a name, and the demo roster should
    // show somewhere visible that not every teacher adds one.
    { id: "marc-antony", name: "Marc Antony" },
  ],
};
