import { LINKS } from "../content/portfolio";

/** Name of the Netlify form. Must match the static detection form in index.html. */
export const CONTACT_FORM_NAME = "contact";

/** Every field the real form posts, in the same spelling as the static form (tests compare them). */
export const CONTACT_FIELDS = ["name", "email", "message", "source", "bot-field"] as const;

export const CONTACT_LIMITS = { name: 100, email: 254, message: 5000 } as const;

export type ContactSource = "game-post-office" | "plain-page";

export interface ContactInput {
  name?: string;
  email: string;
  message: string;
}

export interface ContactErrors {
  name?: string;
  email?: string;
  message?: string;
}

export type ContactResult = { ok: true; mailto: string } | { ok: false; errors: ContactErrors };

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
  source: ContactSource;
  /** The honeypot value. Real visitors never fill it, so it is normally empty. */
  honeypot: string;
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function buildMailto(input: ContactInput): string {
  const name = (input.name ?? "").replace(/[\r\n]+/g, " ").trim();
  const subject = `Hello from ${name || "your portfolio"}`;
  const body = `${input.message.trim()}\n\nReply to: ${input.email.trim()}`;
  return `mailto:${LINKS.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function validateContact(input: ContactInput): ContactResult {
  const errors: ContactErrors = {};
  const name = (input.name ?? "").trim();
  const email = input.email.trim();
  const message = input.message.trim();
  if (name.length > CONTACT_LIMITS.name) {
    errors.name = `Keep your name under ${CONTACT_LIMITS.name} characters.`;
  }
  if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
  else if (email.length > CONTACT_LIMITS.email) {
    errors.email = `Keep the email under ${CONTACT_LIMITS.email} characters.`;
  }
  if (message === "") errors.message = "Write a message before sending.";
  else if (message.length > CONTACT_LIMITS.message) {
    errors.message = `Keep the message under ${CONTACT_LIMITS.message} characters.`;
  }
  if (errors.name || errors.email || errors.message) return { ok: false, errors };
  return { ok: true, mailto: buildMailto(input) };
}

/** The urlencoded form body Netlify expects: form-name plus the same fields as the static form. */
export function encodePayload(payload: ContactPayload): URLSearchParams {
  return new URLSearchParams({
    "form-name": CONTACT_FORM_NAME,
    name: payload.name.trim(),
    email: payload.email.trim(),
    message: payload.message.trim(),
    source: payload.source,
    "bot-field": payload.honeypot,
  });
}
