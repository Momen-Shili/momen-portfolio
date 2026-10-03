import { LINKS } from "../content/portfolio";

export interface ContactInput {
  name?: string;
  email: string;
  message: string;
}

export interface ContactErrors {
  email?: string;
  message?: string;
}

export type ContactResult = { ok: true; mailto: string } | { ok: false; errors: ContactErrors };

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function buildMailto(input: ContactInput): string {
  const name = (input.name ?? "").replace(/[\r\n]+/g, " ").trim();
  const subject = `Hello from ${name || "your portfolio"}`;
  const body = `${input.message.trim()}\n\nReply to: ${input.email.trim()}`;
  return `mailto:${LINKS.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function validateContact(input: ContactInput): ContactResult {
  const errors: ContactErrors = {};
  if (!EMAIL_RE.test(input.email.trim())) errors.email = "Enter a valid email address.";
  if (input.message.trim() === "") errors.message = "Write a message before sending.";
  if (errors.email || errors.message) return { ok: false, errors };
  return { ok: true, mailto: buildMailto(input) };
}
