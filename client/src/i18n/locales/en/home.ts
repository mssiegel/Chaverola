import type { Catalog } from "../../types";

/**
 * The marketing homepage. Registered from `i18n/ns/home.ts`, so it rides that
 * page's chunk.
 *
 * The demo cast's names arrive as interpolations (`{{self, bidi}}`, `{{peer, bidi}}`,
 * `{{seat, bidi}}`, `{{studentName, bidi}}`) from `mockData` — the copy must never spell
 * them out, or a recast leaves the page describing a chat that isn't on it.
 */
export const home = {
  "meta.title": "A Classroom Activity That Students Love",
  "meta.description":
    "Chaverola turns your class into a live chat where every student plays a character. Set one up in a minute. Students join with a code and never need an account.",

  "hero.eyebrow": "A classroom activity for teachers",
  // <1> is the highlighter mark. Word order differs by language, which is why
  // this is one <Trans> and not two keys.
  "hero.title": "Get your whole class talking. <1>In character.</1>",
  "hero.pitch":
    "You pick the topic and hand out secret characters. Students chat with each other about your lesson, and behind every character is a real classmate. Nobody knows who's who until you reveal it at the end.",
  "hero.chatCaption":
    "This is the student side, live. Go ahead, type as {{self, bidi}}.",
  "hero.chatNote":
    "🤫 In a real round, {{self, bidi}} and {{peerShort, bidi}} are both your students. Only you know who's playing who, until the reveal at the end.",
  "hero.stepsLabel": "Setup takes about a minute:",
  "hero.step1": "Create an activity and pick your characters.",
  "hero.step2": "Put the join code on the board.",
  "hero.step3": "Students chat. You watch, then reveal who was who.",

  "cta.host": "Host an Activity",

  "teacherView.eyebrow": "The teacher's view",
  "teacherView.heading": "Students see characters. You see who's who.",
  "teacherView.body":
    "At the top of this page, someone plays {{self, bidi}} and someone plays {{peer, bidi}}. As the teacher, you see that same chat with each student's real name next to their character.",
  "teacherView.bullet1":
    "Students only see each other's characters. Nobody is anonymous to you, so if anyone gets out of line, you'll know exactly who.",
  "teacherView.bullet2":
    "Every chat in your activity gets its own live card, so you can watch the whole room at once.",
  "teacherView.bullet3":
    "When the activity wraps up, Chaverola can email you the full transcript of every chat.",
  "teacherView.caption":
    "This is the teacher side, live. Same chat, now with names.",
  "teacherView.note":
    "🕵️ Try it: say something as {{self, bidi}} up top, then check back here. In this demo you're borrowing {{seat, bidi}}'s seat, so the message shows up with her name on it.",

  "demo.eyebrow": "See it in action",
  "demo.heading": "Poke around a live class.",
  "demo.body":
    "Both sides of Chaverola, running on pretend students. Click around all you like: you don't need to sign up, and you can't break anything.",
  "demo.teacherTitle": "The teacher view",
  "demo.teacherBody":
    "A class in the middle of an activity. Students trickle in and wait to be paired, and every chat gets its own live card. You run the room.",
  "demo.teacherCta": "Open the teacher demo",
  "demo.studentTitle": "The student side",
  "demo.studentBody":
    "You join the demo class as a student named {{studentName, bidi}} and get matched into a character chat. It's the same trip your students will take.",
  "demo.studentCta": "Try the student side",

  "how.eyebrow": "How it works",
  "how.heading": "Live before you've finished taking attendance.",
  "how.step1.title": "Create the activity",
  "how.step1.body":
    "Set one up for whatever your class is studying, like a history unit or the solar system. It takes about a minute.",
  "how.step2.title": "Choose the characters",
  "how.step2.body":
    "Decide who your students get to be. Characters from the book you're reading, or a certain Moon and astronaut.",
  "how.step3.title": "Share the 4-digit code",
  "how.step3.body":
    "Put it on the board. Students tap Join on any device and type it in.",
  "how.step4.title": "Students join instantly",
  "how.step4.body":
    "Each student gets a secret character and a classmate to talk to. You watch the whole room from your dashboard, then reveal who was who.",
  "how.fact1": "Free plan for every teacher",
  "how.fact2": "No student accounts",
  "how.fact3": "Works on anything with a browser",

  "plans.eyebrow": "Plans",
  "plans.heading": "The free plan is the whole thing.",
  "plans.body":
    "Everything on this page is free for every teacher: the characters, the live dashboard, the reveal at the end. The second plan is for teachers and schools who want us working alongside them.",
  "plans.free.name": "Free",
  "plans.free.tagline":
    "Everything Chaverola does today, for any teacher who wants it.",
  "plans.free.bullet1": "Create activities and hand out secret characters",
  "plans.free.bullet2":
    "Students chat in character from any browser, with no accounts and nothing to install",
  "plans.free.bullet3":
    "A live teacher dashboard where you watch every student chat",
  "plans.free.bullet4":
    "The name reveal at the end of each chat, when students find out who was who",
  "plans.free.bullet5": "Transcripts emailed to you when class wraps up",
  "plans.complete.sticker": "With the Chaverola team",
  "plans.complete.name": "Complete Implementation",
  "plans.complete.tagline":
    "For teachers and schools that want help making Chaverola part of how they teach.",
  "plans.complete.bullet1":
    "Training from our team on fitting activities into your curriculum",
  // <1> wraps the logo and the product name so they can't break across lines.
  "plans.complete.bullet2":
    "Connections to <1>Google Classroom</1> and the other tools your school already uses",
  "plans.complete.bullet3":
    "A teacher account, so your characters are saved and ready for the next activity",
  "plans.complete.bullet4":
    "Mid-activity tasks: write them ahead of time, then push each one into your students' chats when the room is ready for it",
  "plans.complete.price": "Priced per teacher or school.",
  "plans.complete.cta": "Write to Moshe",
  "plans.dialog.title": "Let's figure out what fits",
  "plans.dialog.body":
    "Whether you're one teacher or a whole school, Complete Implementation is shaped around you, and so is the price. Write to Moshe with a little about what you're planning, and we'll take it from there.",
  "plans.dialog.emailCta": "Email Moshe",
  "plans.dialog.copyLabel": "Or copy the address:",
  "plans.mailto.subject": "Chaverola Complete Implementation",
  "plans.mailto.body": "Hi Moshe,\n\n",

  "founder.heading": "A note from the founder",
  "founder.p1":
    "I'm Moshe, and I volunteer in the English department at a high school in Beit Shemesh, Israel.",
  "founder.p2":
    "I've always loved multiplayer games like Warcraft and Brawl Stars. People in them are curious and fully awake in a way you don't often see in a classroom, and that kept nagging at me. Could a lesson feel that alive?",
  "founder.p3":
    "So I built the kind of game I would have loved in high school. Each student steps into a character and talks with classmates about whatever the class is studying. My hope is that it becomes the lesson they retell at dinner.",
  "founder.p4":
    "The name comes from two Hebrew words: Chaver, which means friend, and Olah, which means rising up. Friends raise each other up. That's what I wanted this to be, so I put it right in the name.",
  "founder.p5":
    "If you have questions, ideas, or just want to say hi, I'd love to hear from you.",
  "founder.signoff": "Sincerely,",
  "founder.name": "Moshe Siegel",
  "founder.initials": "MS",
  "founder.photoPlaceholder": "Placeholder for Moshe Siegel's photo",
  "founder.photoAlt": "Moshe Siegel, founder of Chaverola",
  "founder.photoSoon": "photo coming soon",
  "founder.mailto.subject": "Thoughts on Chaverola",
  "founder.mailto.body": "Hi Moshe,\n\n",
} as const satisfies Catalog;

export type HomeCatalog = typeof home;
