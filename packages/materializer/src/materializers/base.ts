import { ponderDb } from '../db/ponder.js';
import { CheckpointService } from '../services/CheckpointService.js';
import { createLogger } from '@dashtec/shared-utils';
import { sql } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

export interface EventCursor {
  blockNumber: string;
  logIndex: string;
}

/**
 * Abstract base class for materializers.
 * Handles checkpoint management, batched fetching from Ponder, and reorg detection.
 */
export abstract class BaseMaterializer {
  protected readonly checkpointService: CheckpointService;
  protected readonly logger: ReturnType<typeof createLogger>;
  protected readonly batchSize: number;
  public lastCursor: EventCursor = { blockNumber: '0', logIndex: '0' };
  public totalRows: number = 0;

  constructor(
    readonly id: string,
    options?: { batchSize?: number }
  ) {
    this.checkpointService = new CheckpointService();
    this.logger = createLogger(`Materializer:${id}`);
    this.batchSize = options?.batchSize ?? 10000;
  }

  /** Run one poll cycle: fetch batch from Ponder and materialize to Prisma. */
  async poll(): Promise<number> {
    const cursor = await this.getCursor();
    this.lastCursor = cursor;
    const rows = await this.fetchBatch(cursor);

    if (rows.length === 0) return 0;

    await this.materializeBatch(rows);

    const lastRow = rows[rows.length - 1];
    const newCursor = this.extractCursor(lastRow);
    await this.saveCursor(newCursor, rows.length);
    this.lastCursor = newCursor;
    this.totalRows = await this.countRemaining();

    this.logger.info(`Processed ${rows.length} rows up to block ${newCursor.blockNumber}:${newCursor.logIndex}`);
    return rows.length;
  }

  /** Detect reorg by checking if Ponder's max block is less than our checkpoint. */
  async detectReorg(ponderMaxBlock: string): Promise<boolean> {
    const cursor = await this.getCursor();
    if (BigInt(ponderMaxBlock) < BigInt(cursor.blockNumber)) {
      this.logger.warn(
        `Reorg detected: Ponder max block ${ponderMaxBlock} < checkpoint ${cursor.blockNumber}`
      );
      return true;
    }
    return false;
  }

  /** Reset checkpoint to a specific block (used after reorg detection). */
  async resetToBlock(blockNumber: string): Promise<void> {
    this.logger.info(`Resetting checkpoint to block ${blockNumber}`);
    await this.deleteAfterBlock(blockNumber);
    const remaining = await this.countRemaining();
    await this.checkpointService.resetCheckpoint(this.id, blockNumber, '0', remaining);
    this.totalRows = remaining;
  }

  /** Get current cursor position from checkpoint. */
  protected async getCursor(): Promise<EventCursor> {
    const checkpoint = await this.checkpointService.getCheckpoint(this.id);
    if (this.totalRows === 0) {
      this.totalRows = await this.countRemaining();
    }
    return {
      blockNumber: checkpoint?.blockNumber ?? '0',
      logIndex: checkpoint?.logIndex ?? '0',
    };
  }

  /** Save cursor position to checkpoint, incrementing count by processed rows. */
  protected async saveCursor(cursor: EventCursor, processedRows: number = 0): Promise<void> {
    await this.checkpointService.updateCheckpoint(this.id, cursor.blockNumber, cursor.logIndex, processedRows);
  }

  /**
   * Build a cursor-based WHERE clause for fetching events after a checkpoint.
   * Uses (block_number, log_index) ordering for deterministic event ordering.
   */
  protected buildCursorCondition(
    blockNumberCol: ReturnType<typeof sql>,
    logIndexCol: ReturnType<typeof sql>,
    cursor: EventCursor
  ) {
    return sql`(
      ${blockNumberCol}::bigint > ${cursor.blockNumber}::bigint
      OR (
        ${blockNumberCol}::bigint = ${cursor.blockNumber}::bigint
        AND ${logIndexCol}::bigint > ${cursor.logIndex}::bigint
      )
    )`;
  }

  /** Fetch a batch of rows from Ponder after the given cursor. Override for custom queries. */
  protected abstract fetchBatch(cursor: EventCursor): Promise<any[]>;

  /** Materialize a batch of Ponder rows into Prisma. */
  protected abstract materializeBatch(rows: any[]): Promise<void>;

  /** Extract cursor position from the last row in a batch. */
  protected abstract extractCursor(row: any): EventCursor;

  /** Delete Prisma rows after a given block number (for reorg recovery). */
  protected abstract deleteAfterBlock(blockNumber: string): Promise<void>;

  /** Count remaining rows in Prisma after reorg cleanup. */
  protected abstract countRemaining(): Promise<number>;
}
