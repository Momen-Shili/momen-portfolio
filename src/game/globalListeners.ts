type Entry = {
  target: EventTarget;
  type: string;
  listener: EventListenerOrEventListenerObject;
  capture: boolean;
};

const captureOf = (options?: boolean | AddEventListenerOptions): boolean =>
  typeof options === "boolean" ? options : (options?.capture ?? false);

/**
 * Records every listener added to the given targets (window, document) while it is running and
 * removes whatever is still attached when it stops. Libraries sometimes forget to remove their
 * global listeners on destroy (Phaser keeps one `visibilitychange` handler per game, which keeps
 * the dead game alive); this makes leaving the game leave nothing behind.
 */
export class GlobalListenerTracker {
  private entries: Entry[] = [];
  private original: EventTarget["addEventListener"] | null = null;
  private patched: EventTarget["addEventListener"] | null = null;

  constructor(private readonly targets: readonly EventTarget[]) {}

  get tracked(): number {
    return this.entries.length;
  }

  private readonly record = (
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void => {
    if (this.targets.includes(target)) {
      this.entries.push({ target, type, listener, capture: captureOf(options) });
    }
  };

  start(): void {
    if (this.original) return;
    const proto = EventTarget.prototype;
    const original = proto.addEventListener;
    const record = this.record;
    const patched: EventTarget["addEventListener"] = function (
      this: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ): void {
      if (listener) record(this, type, listener, options);
      original.call(this, type, listener, options);
    };
    this.original = original;
    this.patched = patched;
    proto.addEventListener = patched;
  }

  /** Removes every tracked listener that is still attached, then stops tracking. */
  stop(): void {
    const proto = EventTarget.prototype;
    // Only undo our own patch; if something else wrapped it later, leave theirs in place.
    if (this.original && proto.addEventListener === this.patched) {
      proto.addEventListener = this.original;
    }
    for (const { target, type, listener, capture } of this.entries) {
      target.removeEventListener(type, listener, { capture });
    }
    this.entries = [];
    this.original = null;
    this.patched = null;
  }
}
