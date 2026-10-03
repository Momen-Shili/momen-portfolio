import { buildMailto, validateContact, type ContactErrors, type ContactSource } from "./contact";
import { sendContactMessage, type SendResult } from "./contactSend";

export const MIN_FILL_MS = 2000;

export type FlowState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success" }
  | { status: "error"; kind: "validation"; errors: ContactErrors }
  | { status: "error"; kind: "too-fast" }
  | { status: "error"; kind: "send-failed"; mailto: string };

export interface FormValues {
  name: string;
  email: string;
  message: string;
  honeypot: string;
}

export interface ContactFlow {
  readonly state: FlowState;
  submit(values: FormValues): Promise<void>;
  /** Back to idle (after "Send another"); the fill-time clock starts again. */
  reset(): void;
  subscribe(listener: (state: FlowState) => void): () => void;
}

interface FlowOptions {
  source: ContactSource;
  send?: (payload: Parameters<typeof sendContactMessage>[0]) => Promise<SendResult>;
  now?: () => number;
  minFillMs?: number;
}

/** The form's state machine: idle, loading, success or error. No DOM, so it is fully testable. */
export function createContactFlow(options: FlowOptions): ContactFlow {
  const send = options.send ?? ((payload) => sendContactMessage(payload));
  const now = options.now ?? Date.now;
  const minFill = options.minFillMs ?? MIN_FILL_MS;
  const listeners = new Set<(state: FlowState) => void>();
  let state: FlowState = { status: "idle" };
  let shownAt = now();

  const set = (next: FlowState): void => {
    state = next;
    for (const listener of listeners) listener(state);
  };

  return {
    get state() {
      return state;
    },
    async submit(values) {
      if (state.status === "loading") return; // double submit
      // A bot filled the hidden field: act as if it worked, send nothing.
      if (values.honeypot.trim() !== "") {
        set({ status: "success" });
        return;
      }
      const checked = validateContact(values);
      if (!checked.ok) {
        set({ status: "error", kind: "validation", errors: checked.errors });
        return;
      }
      if (now() - shownAt < minFill) {
        set({ status: "error", kind: "too-fast" });
        return;
      }
      set({ status: "loading" });
      const result = await send({ ...values, source: options.source });
      if (result.ok) set({ status: "success" });
      else set({ status: "error", kind: "send-failed", mailto: buildMailto(values) });
    },
    reset() {
      shownAt = now();
      set({ status: "idle" });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
