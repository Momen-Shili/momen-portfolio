import { describe, expect, it, vi } from "vitest";
import { LINKS } from "../src/content/portfolio";
import {
  CONTACT_FIELDS,
  CONTACT_LIMITS,
  buildMailto,
  encodePayload,
  validateContact,
  type ContactPayload,
} from "../src/systems/contact";
import { createContactFlow, MIN_FILL_MS, type FlowState } from "../src/systems/contactFlow";
import { sendContactMessage } from "../src/systems/contactSend";

const good = { name: "Sara", email: "sara@example.com", message: "Hello there", honeypot: "" };
const payload: ContactPayload = { ...good, source: "plain-page" };

function flowWith(
  send: Parameters<typeof createContactFlow>[0]["send"],
  clock = { t: 0 },
): { flow: ReturnType<typeof createContactFlow>; clock: { t: number } } {
  const flow = createContactFlow({ source: "plain-page", send, now: () => clock.t });
  return { flow, clock };
}

describe("validation limits", () => {
  it("trims before checking and enforces the maximum lengths", () => {
    expect(validateContact({ email: "  a@b.co  ", message: "  hi  " }).ok).toBe(true);
    const long = (n: number) => "x".repeat(n);
    const name = validateContact({ name: long(101), email: "a@b.co", message: "x" });
    expect(!name.ok && name.errors.name).toBeTruthy();
    const email = validateContact({ email: `${long(250)}@b.co`, message: "x" });
    expect(!email.ok && email.errors.email).toBeTruthy();
    const msg = validateContact({ email: "a@b.co", message: long(CONTACT_LIMITS.message + 1) });
    expect(!msg.ok && msg.errors.message).toBeTruthy();
    expect(validateContact({ email: "a@b.co", message: long(CONTACT_LIMITS.message) }).ok).toBe(
      true,
    );
  });
});

describe("payload encoding", () => {
  it("includes form-name, source and every field of the static form", () => {
    const body = encodePayload(payload);
    expect(body.get("form-name")).toBe("contact");
    expect(body.get("source")).toBe("plain-page");
    expect([...body.keys()].sort()).toEqual(["form-name", ...CONTACT_FIELDS].sort());
  });

  it("round-trips special characters, emoji and Arabic text", () => {
    const message = 'a&b=c+d%e "q" <x>\nline 2 😀 مرحبا بالعالم';
    const encoded = encodePayload({ ...payload, name: "  مؤمن ", message }).toString();
    expect(encoded).not.toContain(" ");
    const back = new URLSearchParams(encoded);
    expect(back.get("message")).toBe(message);
    expect(back.get("name")).toBe("مؤمن");
  });
});

describe("sendContactMessage", () => {
  it("POSTs urlencoded to / and treats response.ok as success", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 200 }));
    expect(await sendContactMessage(payload, fetchMock as unknown as typeof fetch)).toEqual({
      ok: true,
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/x-www-form-urlencoded" });
    expect(new URLSearchParams(init.body as string).get("form-name")).toBe("contact");
  });

  it("reports http failures (404 and 405 on local servers) and network errors", async () => {
    for (const status of [404, 405, 500]) {
      const f = vi.fn(async () => new Response("", { status })) as unknown as typeof fetch;
      expect(await sendContactMessage(payload, f)).toEqual({ ok: false, reason: "http", status });
    }
    const down = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    expect(await sendContactMessage(payload, down)).toEqual({ ok: false, reason: "network" });
  });
});

describe("contact flow", () => {
  it("goes idle -> loading -> success and sends the source", async () => {
    const send = vi.fn(async () => ({ ok: true }) as const);
    const { flow, clock } = flowWith(send);
    const seen: FlowState["status"][] = [];
    flow.subscribe((s) => seen.push(s.status));
    clock.t = MIN_FILL_MS + 1;
    await flow.submit(good);
    expect(seen).toEqual(["loading", "success"]);
    expect(send).toHaveBeenCalledTimes(1);
    expect((send.mock.calls as unknown[][])[0]?.[0]).toMatchObject({
      source: "plain-page",
      email: good.email,
    });
  });

  it("rejects invalid input without sending", async () => {
    const send = vi.fn(async () => ({ ok: true }) as const);
    const { flow, clock } = flowWith(send);
    clock.t = 10_000;
    await flow.submit({ ...good, email: "nope", message: "" });
    expect(flow.state).toMatchObject({ status: "error", kind: "validation" });
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects submissions made too soon, then accepts the retry", async () => {
    const send = vi.fn(async () => ({ ok: true }) as const);
    const { flow, clock } = flowWith(send);
    clock.t = 500;
    await flow.submit(good);
    expect(flow.state).toEqual({ status: "error", kind: "too-fast" });
    expect(send).not.toHaveBeenCalled();
    clock.t = 3000;
    await flow.submit(good);
    expect(flow.state.status).toBe("success");
  });

  it("silently pretends success for a filled honeypot and sends nothing", async () => {
    const send = vi.fn(async () => ({ ok: true }) as const);
    const { flow, clock } = flowWith(send);
    clock.t = 10_000;
    await flow.submit({ ...good, honeypot: "http://spam.example" });
    expect(flow.state.status).toBe("success");
    expect(send).not.toHaveBeenCalled();
  });

  it("blocks double submits while loading", async () => {
    let release: (v: { ok: true }) => void = () => undefined;
    const send = vi.fn(() => new Promise<{ ok: true }>((r) => (release = r)));
    const { flow, clock } = flowWith(send);
    clock.t = 10_000;
    const first = flow.submit(good);
    await flow.submit(good);
    expect(send).toHaveBeenCalledTimes(1);
    release({ ok: true });
    await first;
    expect(flow.state.status).toBe("success");
  });

  it("falls back to a prefilled mailto when sending fails, and can retry", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, reason: "http", status: 404 })
      .mockResolvedValueOnce({ ok: true });
    const { flow, clock } = flowWith(send);
    clock.t = 10_000;
    await flow.submit(good);
    expect(flow.state).toMatchObject({ status: "error", kind: "send-failed" });
    const mailto =
      flow.state.status === "error" && flow.state.kind === "send-failed" ? flow.state.mailto : "";
    expect(mailto).toBe(buildMailto(good));
    const url = new URL(mailto);
    expect(url.pathname).toBe(LINKS.email);
    expect(url.searchParams.get("body")).toContain("Hello there");
    await flow.submit(good); // same values still available to the caller: nothing was lost
    expect(flow.state.status).toBe("success");
  });

  it("reset returns to idle and restarts the fill-time clock", async () => {
    const send = vi.fn(async () => ({ ok: true }) as const);
    const { flow, clock } = flowWith(send);
    clock.t = 10_000;
    await flow.submit(good);
    flow.reset();
    expect(flow.state.status).toBe("idle");
    await flow.submit(good); // clock has not moved since reset: too fast
    expect(flow.state).toMatchObject({ kind: "too-fast" });
  });
});
