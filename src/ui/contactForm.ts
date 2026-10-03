import { LINKS } from "../content/portfolio";
import { CONTACT_LIMITS, type ContactSource } from "../systems/contact";
import { createContactFlow, type ContactFlow, type FlowState } from "../systems/contactFlow";
import { el, nextId } from "./dom";

export const SUCCESS_TEXT = "Message sent. Thanks! I'll reply soon.";
export const PRIVACY_TEXT =
  "Your message is sent to Momen through the site's hosting provider (Netlify) and used only to reply. No cookies, no tracking.";

/**
 * The contact form, shared by the Post office panel and the plain page. It posts to this site's own
 * Netlify Forms endpoint (see src/systems/contactSend.ts) and falls back to a prefilled mailto link
 * if sending fails, which is also what happens on `npm run dev` and `npm run preview`.
 */
export function createContactForm(
  source: ContactSource,
  flow: ContactFlow = createContactFlow({ source }),
): { form: HTMLFormElement; firstField: HTMLElement } {
  const id = nextId("contact");
  const name = el("input", {
    id: `${id}-name`,
    name: "name",
    type: "text",
    autocomplete: "name",
    maxlength: String(CONTACT_LIMITS.name),
    "aria-describedby": `${id}-name-err`,
  });
  const email = el("input", {
    id: `${id}-email`,
    name: "email",
    type: "email",
    autocomplete: "email",
    maxlength: String(CONTACT_LIMITS.email),
    required: "",
    "aria-describedby": `${id}-email-err`,
  });
  const message = el("textarea", {
    id: `${id}-message`,
    name: "message",
    rows: "5",
    maxlength: String(CONTACT_LIMITS.message),
    required: "",
    "aria-describedby": `${id}-message-err`,
  });
  // Spam trap: hidden from sight, keyboard and screen readers. Humans never fill it.
  const honeypot = el("input", {
    name: "bot-field",
    type: "text",
    tabindex: "-1",
    autocomplete: "off",
  });
  const trap = el(
    "div",
    { class: "hp-field", "aria-hidden": "true" },
    el("label", {}, "Leave this empty", honeypot),
  );

  const nameErr = el("p", { id: `${id}-name-err`, class: "field-error", role: "alert" });
  const emailErr = el("p", { id: `${id}-email-err`, class: "field-error", role: "alert" });
  const messageErr = el("p", { id: `${id}-message-err`, class: "field-error", role: "alert" });
  const failure = el("p", { class: "form-failure", role: "alert", tabindex: "-1" });
  const status = el("p", { class: "form-status", role: "status", tabindex: "-1" });
  const again = el(
    "button",
    { type: "button", class: "btn-ghost form-again", hidden: "" },
    "Send another",
  );
  const submit = el("button", { type: "submit", class: "btn-primary" }, "Send message");

  const field = (label: string, input: HTMLElement, err: HTMLElement): HTMLElement =>
    el("div", { class: "field" }, el("label", { for: input.id }, label), input, err);

  const fields = el(
    "div",
    { class: "form-fields" },
    field("Your name (optional)", name, nameErr),
    field("Your email", email, emailErr),
    field("Message", message, messageErr),
    trap,
    submit,
  );
  const form = el(
    "form",
    { class: "contact-form", novalidate: "" },
    fields,
    failure,
    status,
    again,
    el("p", { class: "form-privacy" }, PRIVACY_TEXT),
  );

  const mark = (input: HTMLElement, bad: boolean): void =>
    input.setAttribute("aria-invalid", bad ? "true" : "false");

  const render = (state: FlowState): void => {
    const errors = state.status === "error" && state.kind === "validation" ? state.errors : {};
    nameErr.textContent = errors.name ?? "";
    emailErr.textContent = errors.email ?? "";
    messageErr.textContent = errors.message ?? "";
    mark(name, Boolean(errors.name));
    mark(email, Boolean(errors.email));
    mark(message, Boolean(errors.message));

    const loading = state.status === "loading";
    submit.disabled = loading;
    submit.textContent = loading ? "Sending…" : "Send message";
    form.setAttribute("aria-busy", String(loading));

    const done = state.status === "success";
    fields.hidden = done;
    again.hidden = !done;
    status.textContent = loading ? "Sending…" : done ? SUCCESS_TEXT : "";

    failure.replaceChildren();
    if (state.status !== "error" || state.kind === "validation") return;
    if (state.kind === "too-fast") {
      failure.textContent = "That was quick! Please check your message and press send again.";
    } else {
      failure.append(
        "Couldn't send it. You can email me directly at ",
        el("a", { href: state.mailto }, LINKS.email),
      );
    }
  };

  flow.subscribe((state) => {
    render(state);
    if (state.status === "success") status.focus();
    else if (state.status === "error") {
      if (state.kind === "validation") {
        const e = state.errors;
        (e.name ? name : e.email ? email : message).focus();
      } else failure.focus();
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void flow.submit({
      name: name.value,
      email: email.value,
      message: message.value,
      honeypot: honeypot.value,
    });
  });
  again.addEventListener("click", () => {
    form.reset();
    flow.reset();
    name.focus();
  });

  render(flow.state);
  return { form, firstField: name };
}
