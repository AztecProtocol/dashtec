/**
 * Ponder-style TUI that renders a fixed status table below scrolling logs.
 * Uses ANSI scroll regions in TTY mode; degrades to no-op in non-TTY (Docker).
 */

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  clearLine: '\x1b[2K',
} as const;

interface MaterializerStats {
  status: 'idle' | 'polling' | 'synced' | 'error';
  totalRows: number;
  lastBlock: string;
  lastDuration: number;
}

export class StatusDisplay {
  private readonly enabled: boolean;
  private readonly stats = new Map<string, MaterializerStats>();
  private readonly ids: string[];
  private readonly tableHeight: number;
  private interval: NodeJS.Timeout | null = null;
  private ponderMaxBlock = '-';
  private reorgDetected = false;

  constructor(materializerIds: string[]) {
    this.enabled = process.stdout.isTTY === true;
    this.ids = materializerIds;

    // title + blank + header + rows + bottom margin
    this.tableHeight = materializerIds.length + 4;

    for (const id of materializerIds) {
      this.stats.set(id, { status: 'idle', totalRows: 0, lastBlock: '-', lastDuration: 0 });
    }
  }

  /** Initialize scroll region and start rendering the table. */
  start(): void {
    if (!this.enabled) return;

    this.setupScrollRegion();
    this.render();
    this.interval = setInterval(() => this.render(), 500);

    process.stdout.on('resize', () => {
      this.setupScrollRegion();
      this.render();
    });

    const cleanup = () => this.stop();
    process.on('exit', cleanup);
    process.on('SIGINT', () => { cleanup(); process.exit(0); });
    process.on('SIGTERM', () => { cleanup(); process.exit(0); });
  }

  /** Mark a materializer as currently polling. */
  setPolling(id: string): void {
    const s = this.stats.get(id);
    if (s) s.status = 'polling';
  }

  /** Record poll results for a materializer. */
  recordPoll(id: string, rows: number, lastBlock: string, durationMs: number): void {
    const s = this.stats.get(id);
    if (!s) return;
    s.status = 'synced';
    s.totalRows = rows;
    // Always reflect the checkpoint block (even when 0 rows processed)
    if (lastBlock !== '0') s.lastBlock = lastBlock;
    if (rows > 0) s.lastDuration = durationMs;
  }

  /** Mark a materializer as errored. */
  setError(id: string): void {
    const s = this.stats.get(id);
    if (s) s.status = 'error';
  }

  /** Update the Ponder max block displayed in the header. */
  setPonderBlock(block: string): void {
    this.ponderMaxBlock = block;
  }

  /** Flag reorg status in the header. */
  setReorgDetected(detected: boolean): void {
    this.reorgDetected = detected;
  }

  /** Tear down the display and reset terminal scroll region. */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.enabled) {
      process.stdout.write('\x1b[r'); // reset scroll region
    }
  }

  // -- Private ----------------------------------------------------------------

  /** Set the terminal scroll region so logs stay above the table. */
  private setupScrollRegion(): void {
    const scrollEnd = this.getScrollEnd();
    process.stdout.write(`\x1b[1;${scrollEnd}r`);
    process.stdout.write(`\x1b[${scrollEnd};1H`);
  }

  /** Render the fixed table below the scroll region. */
  private render(): void {
    if (!this.enabled) return;

    const COL = { name: 28, status: 12, rows: 8, block: 14, dur: 14 };
    let row = this.getScrollEnd() + 1;

    process.stdout.write('\x1b7'); // save cursor

    // Header
    const health = this.reorgDetected
      ? `${ANSI.red}REORG${ANSI.reset}`
      : `${ANSI.green}healthy${ANSI.reset}`;
    this.writeLine(row++,
      `${ANSI.bold}Materializers${ANSI.reset} ${ANSI.dim}(${this.ids.length})${ANSI.reset}` +
      `  Ponder block: ${ANSI.cyan}${this.ponderMaxBlock}${ANSI.reset}  ${health}`
    );
    this.writeLine(row++, '');

    // Column headers
    this.writeLine(row++,
      ` ${pad('Materializer', COL.name)}` +
      `${pad('Status', COL.status)}` +
      `${rpad('Rows', COL.rows)}` +
      `${rpad('Block', COL.block)}` +
      `${rpad('Duration (ms)', COL.dur)}`
    );

    // Data rows
    for (const id of this.ids) {
      const s = this.stats.get(id)!;
      const statusStr = colorStatus(s.status);
      const statusPad = ' '.repeat(Math.max(0, COL.status - visLen(statusStr)));

      this.writeLine(row++,
        ` ${pad(id, COL.name)}` +
        `${statusStr}${statusPad}` +
        `${rpad(s.totalRows > 0 ? s.totalRows.toLocaleString() : '0', COL.rows)}` +
        `${rpad(s.lastBlock, COL.block)}` +
        `${rpad(s.lastDuration > 0 ? s.lastDuration.toFixed(1) : '-', COL.dur)}`
      );
    }

    process.stdout.write('\x1b8'); // restore cursor
  }

  /** Calculate where the scroll region ends (leaving room for the table). */
  private getScrollEnd(): number {
    const termHeight = process.stdout.rows || 80;
    return Math.max(termHeight - this.tableHeight, 5);
  }

  /** Write a string to a specific terminal row, clearing the line first. */
  private writeLine(row: number, text: string): void {
    process.stdout.write(`\x1b[${row};1H${ANSI.clearLine}${text}`);
  }
}

// -- Helpers ------------------------------------------------------------------

/** Left-pad string, truncate with '..' if too long. */
function pad(str: string, width: number): string {
  if (str.length > width) return str.slice(0, width - 2) + '..';
  return str + ' '.repeat(width - str.length);
}

/** Right-align string within width. */
function rpad(str: string, width: number): string {
  if (str.length >= width) return str;
  return ' '.repeat(width - str.length) + str;
}

/** Get visible length stripping ANSI codes. */
function visLen(str: string): number {
  return str.replace(/\x1b\[[0-9;]*m/g, '').length;
}

/** Colorize materializer status. */
function colorStatus(status: string): string {
  switch (status) {
    case 'polling': return `${ANSI.yellow}polling${ANSI.reset}`;
    case 'synced': return `${ANSI.green}synced${ANSI.reset}`;
    case 'error': return `${ANSI.red}error${ANSI.reset}`;
    default: return `${ANSI.dim}idle${ANSI.reset}`;
  }
}
