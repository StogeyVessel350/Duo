/**
 * Fixed-size ring buffer. Samples added past capacity overwrite the oldest.
 *
 * This lives outside React state — pushing to it does not trigger renders.
 * The chart reads it on an interval (see useSignal).
 */

export class RingBuffer<T> {
  private data: T[];
  private head = 0;    // next write position
  private count = 0;

  constructor(public readonly capacity: number) {
    this.data = new Array(capacity);
  }

  push(v: T): void {
    this.data[this.head] = v;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  /** Returns samples in chronological order (oldest first). */
  toArray(): T[] {
    const out: T[] = new Array(this.count);
    const start = this.count < this.capacity ? 0 : this.head;
    for (let i = 0; i < this.count; i++) {
      out[i] = this.data[(start + i) % this.capacity]!;
    }
    return out;
  }

  get size(): number {
    return this.count;
  }

  clear(): void {
    this.head = 0;
    this.count = 0;
  }
}
