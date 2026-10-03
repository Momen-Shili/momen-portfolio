import { encodePayload, type ContactPayload } from "./contact";

export type SendResult =
  { ok: true } | { ok: false; reason: "http"; status: number } | { ok: false; reason: "network" };

/**
 * The only place that talks to the network. Today it posts to this site's own Netlify Forms
 * endpoint; to switch to a Netlify Function plus an email provider, only this function changes.
 */
export async function sendContactMessage(
  payload: ContactPayload,
  fetchImpl: typeof fetch = (input, init) => fetch(input, init),
): Promise<SendResult> {
  try {
    const response = await fetchImpl("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encodePayload(payload).toString(),
    });
    return response.ok ? { ok: true } : { ok: false, reason: "http", status: response.status };
  } catch {
    return { ok: false, reason: "network" };
  }
}
