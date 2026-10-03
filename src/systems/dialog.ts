export interface DialogLine {
  speaker: string;
  text: string;
}

/** Steps through a fixed list of lines. Pure state, no rendering. */
export class DialogRunner {
  private index = 0;

  constructor(private readonly lines: readonly DialogLine[]) {
    if (lines.length === 0) throw new Error("DialogRunner needs at least one line");
  }

  get current(): DialogLine {
    // The constructor guarantees at least one line and advance() never passes the end.
    return this.lines[this.index] as DialogLine;
  }

  get position(): { index: number; total: number } {
    return { index: this.index + 1, total: this.lines.length };
  }

  get isLast(): boolean {
    return this.index === this.lines.length - 1;
  }

  /** Moves to the next line. Returns true when the dialog is finished. */
  advance(): boolean {
    if (this.isLast) return true;
    this.index += 1;
    return false;
  }
}
