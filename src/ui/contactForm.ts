import { validateContact } from "../systems/contact";
import { el, nextId } from "./dom";

/** Builds the mailto contact form. Used in the post office panel and on the plain page. */
export function createContactForm(): { form: HTMLFormElement; firstField: HTMLElement } {
  const id = nextId("contact");
  const name = el("input", { id: `${id}-name`, name: "name", type: "text", autocomplete: "name" });
  const email = el("input", {
    id: `${id}-email`,
    name: "email",
    type: "email",
    autocomplete: "email",
    required: "",
    "aria-describedby": `${id}-email-err`,
  });
  const message = el("textarea", {
    id: `${id}-message`,
    name: "message",
    rows: "5",
    required: "",
    "aria-describedby": `${id}-message-err`,
  });
  const emailErr = el("p", { id: `${id}-email-err`, class: "field-error", role: "alert" });
  const messageErr = el("p", { id: `${id}-message-err`, class: "field-error", role: "alert" });
  const status = el("p", { class: "form-status", role: "status" });

  const field = (label: string, input: HTMLElement, err?: HTMLElement): HTMLElement =>
    el(
      "div",
      { class: "field" },
      el("label", { for: input.id }, label),
      input,
      ...(err ? [err] : []),
    );

  const form = el(
    "form",
    { class: "contact-form", novalidate: "" },
    field("Your name (optional)", name),
    field("Your email", email, emailErr),
    field("Message", message, messageErr),
    el("button", { type: "submit", class: "btn-primary" }, "Open in my mail app"),
    status,
  );

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = validateContact({
      name: name.value,
      email: email.value,
      message: message.value,
    });
    const errors = result.ok ? {} : result.errors;
    emailErr.textContent = errors.email ?? "";
    messageErr.textContent = errors.message ?? "";
    email.setAttribute("aria-invalid", errors.email ? "true" : "false");
    message.setAttribute("aria-invalid", errors.message ? "true" : "false");
    status.textContent = "";
    if (!result.ok) {
      (errors.email ? email : message).focus();
      return;
    }
    status.textContent = "Opening your mail app…";
    window.location.href = result.mailto;
  });

  return { form, firstField: name };
}
