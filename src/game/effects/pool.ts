/**
 * Fixed-size pool of reusable objects. All objects are created up front; `acquire` hands out an
 * idle one (or null when the pool is exhausted) and `release` returns it. Effects use pools so a
 * busy scene never allocates per frame and its cost has a hard upper limit.
 */
export class Pool<T> {
  private readonly idle: T[] = [];
  private readonly busy = new Set<T>();

  constructor(
    readonly size: number,
    create: (index: number) => T,
  ) {
    for (let i = 0; i < size; i++) this.idle.push(create(i));
  }

  get active(): number {
    return this.busy.size;
  }

  acquire(): T | null {
    const item = this.idle.pop();
    if (item === undefined) return null;
    this.busy.add(item);
    return item;
  }

  release(item: T): void {
    if (this.busy.delete(item)) this.idle.push(item);
  }

  /** Visits every object that is currently in use. Safe to release inside the callback. */
  forEachActive(fn: (item: T) => void): void {
    for (const item of [...this.busy]) fn(item);
  }

  releaseAll(): void {
    for (const item of [...this.busy]) this.release(item);
  }
}
