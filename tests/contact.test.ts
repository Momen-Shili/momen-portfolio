import { describe, expect, it } from "vitest";
import { LINKS } from "../src/content/portfolio";
import { buildMailto, validateContact } from "../src/systems/contact";

describe("contact form", () => {
  it("rejects an invalid email", () => {
    const result = validateContact({ email: "not-an-email", message: "Hi" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.email).toBeTruthy();
  });

  it("rejects an empty or whitespace-only message", () => {
    const result = validateContact({ email: "a@b.co", message: "   \n " });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.message).toBeTruthy();
      expect(result.errors.email).toBeUndefined();
    }
  });

  it("reports both errors at once", () => {
    const result = validateContact({ email: "", message: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["email", "message"]);
  });

  it("builds a mailto with the subject and reply-to line, URL-encoded", () => {
    const result = validateContact({
      name: "Sara",
      email: "sara@example.com",
      message: "Hello & welcome",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const url = new URL(result.mailto);
    expect(url.protocol).toBe("mailto:");
    expect(url.pathname).toBe(LINKS.email);
    expect(url.searchParams.get("subject")).toBe("Hello from Sara");
    expect(url.searchParams.get("body")).toBe("Hello & welcome\n\nReply to: sara@example.com");
    expect(result.mailto).not.toContain(" ");
    expect(result.mailto).not.toContain("\n");
  });

  it("falls back to 'your portfolio' when no name is given", () => {
    const url = new URL(buildMailto({ email: "a@b.co", message: "x" }));
    expect(url.searchParams.get("subject")).toBe("Hello from your portfolio");
  });

  it("cannot be used to inject extra headers through the name", () => {
    const url = new URL(buildMailto({ name: "Eve\r\nBcc: x@y.z", email: "a@b.co", message: "x" }));
    expect(url.searchParams.get("subject")).toBe("Hello from Eve Bcc: x@y.z");
    expect(url.searchParams.get("bcc")).toBeNull();
  });
});
