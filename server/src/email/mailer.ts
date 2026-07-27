import { createTransport } from "nodemailer";
import type { Logger } from "pino";

import type { Config } from "../config";

/*
  The one place a transcript email actually leaves the process. Two modes,
  chosen once at boot from config.smtp:

  - "gmail": a nodemailer transport over Gmail SMTP (the founder's account +
    an app password, GMAIL_USER / GMAIL_APP_PASSWORD on Render). A stopgap,
    isolated here so swapping to a real provider touches one file.
  - "log": no credentials — the mailer logs instead of sending, so dev needs
    zero env vars. In dev it logs the whole composed email (that's how the
    format gets eyeballed); in production it logs a warning with the
    recipient and counts only — never the student messages, which have no
    business in Render's log stream.

  Nothing calls send() until feature 11 prompt 3 (End activity); prompt 2
  builds and wires the mailer so that prompt stays pure feature.
*/

/** TCP connect to the SMTP host. */
const SMTP_CONNECTION_TIMEOUT_MS = 10_000;
/** Waiting for the server's greeting once connected. */
const SMTP_GREETING_TIMEOUT_MS = 10_000;
/** Inactivity on an established socket — the stalled-mid-send case. */
const SMTP_SOCKET_TIMEOUT_MS = 20_000;

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  /** The HTML alternative; nodemailer builds the multipart message when both
   *  parts are present. Log mode ignores it — the text part is the readable
   *  one, and HTML would drown the dev log. */
  html?: string;
}

export interface Mailer {
  mode: "gmail" | "log";
  send(message: EmailMessage): Promise<void>;
}

/** One digit per line, for the log-mode warning — a transcript's shape
 *  without its contents. */
function lineCount(text: string): number {
  return text.split("\n").length;
}

export function createMailer(config: Config, logger: Logger): Mailer {
  const log = logger.child({ module: "mail" });

  if (config.smtp) {
    // Latin `Chaverola` in every language, and not an oversight: this runs
    // once at boot from config, before any activity exists, so it has no
    // record and no locale to read — a per-locale From would mean a transport
    // per send. The brand call is in docs/decisions/branding.md ("the domain
    // and the email From-name stay Latin"); the subject and both bodies are
    // the parts that speak the teacher's language.
    const from = `Chaverola <${config.smtp.user}>`;
    const transport = createTransport({
      service: "gmail",
      auth: { user: config.smtp.user, pass: config.smtp.pass },
      // A teacher is standing in front of a class watching a spinner while
      // this runs — End activity awaits the send before it can answer.
      // nodemailer's defaults (~2 min to connect, up to 10 min on a stalled
      // socket) are sized for a background job, not for that. These cap the
      // worst case at roughly half a minute, after which the send reports
      // failed and the wrap-up moves on; a transcript that needs longer than
      // this was not going to arrive on time anyway.
      connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
      greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
      socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
    });
    log.info({ mode: "gmail" }, "mailer ready — sending via Gmail SMTP");
    return {
      mode: "gmail",
      async send({ to, subject, text, html }) {
        await transport.sendMail({ from, to, subject, text, html });
      },
    };
  }

  // No credentials → log mode. Loud in production, since a real deploy that
  // reaches this branch will silently never deliver a transcript.
  const isProd = config.nodeEnv === "production";
  if (isProd) {
    log.warn(
      { mode: "log" },
      "no GMAIL_USER / GMAIL_APP_PASSWORD — transcript emails will be logged, not sent"
    );
  } else {
    log.info({ mode: "log" }, "mailer in log-only mode (no SMTP credentials)");
  }

  return {
    mode: "log",
    async send({ to, subject, text }) {
      if (isProd) {
        // Never the body in production — recipient and shape only.
        log.warn(
          { to, subject, lines: lineCount(text) },
          "transcript email not sent (log mode)"
        );
      } else {
        // A Hebrew transcript's `text` opens every line with U+200F, so this
        // log entry looks like it has a stray box or mojibake on each line.
        // That is correct and load-bearing — see applyLinePrefix in
        // transcript.ts before trying to clean it up.
        log.info(
          { to, subject, text },
          "transcript email (log mode — not actually sent)"
        );
      }
    },
  };
}
