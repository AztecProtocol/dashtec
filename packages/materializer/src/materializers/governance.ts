import { BaseMaterializer, EventCursor } from './base.js';
import { ponderDb } from '../db/ponder.js';
import { prisma } from '../db/prisma.js';
import {
  proposerVote,
  proposerPayloadSubmittable,
  proposerPayloadSubmitted,
} from '@dashtec/indexer-ponder/ponder.schema';
import { sql, asc } from 'drizzle-orm';
import { config } from '../config.js';

/** Materializes ProposerVote (SignalCast) events from Ponder to Prisma. */
export class ProposerVoteMaterializer extends BaseMaterializer {
  constructor() {
    super('proposer_vote');
  }

  protected async fetchBatch(cursor: EventCursor) {
    return ponderDb
      .select()
      .from(proposerVote)
      .where(this.buildCursorCondition(
        sql`${proposerVote.block_number}`,
        sql`${proposerVote.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${proposerVote.block_number}::bigint`),
        asc(sql`${proposerVote.log_index}::bigint`)
      )
      .limit(this.batchSize);
  }

  protected async materializeBatch(rows: (typeof proposerVote.$inferSelect)[]) {
    for (const row of rows) {
      const timestamp = row.timestamp?.toString() ?? null;
      const voteDate = row.timestamp ? new Date(Number(row.timestamp) * 1000) : null;

      await prisma.proposerVote.upsert({
        where: {
          unique_vote_transaction_log: {
            transaction_hash: row.transaction_hash,
            log_index: Number(row.log_index),
          },
        },
        create: {
          vote_type: row.vote_type as 'GOVERNANCE_PROPOSER' | 'SLASHING_PROPOSER',
          signaler_address: row.signaler_address,
          payload_address: row.payload_address,
          round_number: row.round_number,
          block_number: BigInt(row.block_number),
          transaction_hash: row.transaction_hash,
          log_index: Number(row.log_index),
          rollup_address: row.rollup_address,
          timestamp,
          vote_date: voteDate,
          contract_address: row.contract_address ?? null,
        },
        update: {
          signaler_address: row.signaler_address,
          payload_address: row.payload_address,
          round_number: row.round_number,
          block_number: BigInt(row.block_number),
          rollup_address: row.rollup_address,
          timestamp,
          vote_date: voteDate,
          contract_address: row.contract_address ?? null,
        },
      });
    }
  }

  protected extractCursor(row: typeof proposerVote.$inferSelect): EventCursor {
    return { blockNumber: row.block_number, logIndex: row.log_index };
  }

  protected async deleteAfterBlock(blockNumber: string) {
    await prisma.proposerVote.deleteMany({
      where: { block_number: { gt: BigInt(blockNumber) } },
    });
  }

  protected async countRemaining() {
    return prisma.proposerVote.count();
  }
}

/** Materializes PayloadSubmittable events from Ponder to Prisma. */
export class PayloadSubmittableMaterializer extends BaseMaterializer {
  constructor() {
    super('payload_submittable');
  }

  protected async fetchBatch(cursor: EventCursor) {
    return ponderDb
      .select()
      .from(proposerPayloadSubmittable)
      .where(this.buildCursorCondition(
        sql`${proposerPayloadSubmittable.block_number}`,
        sql`${proposerPayloadSubmittable.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${proposerPayloadSubmittable.block_number}::bigint`),
        asc(sql`${proposerPayloadSubmittable.log_index}::bigint`)
      )
      .limit(this.batchSize);
  }

  protected async materializeBatch(rows: (typeof proposerPayloadSubmittable.$inferSelect)[]) {
    for (const row of rows) {
      await prisma.proposerPayloadSubmittable.upsert({
        where: {
          unique_proposer_payload_submittable_transaction_log: {
            transaction_hash: row.transaction_hash,
            log_index: Number(row.log_index),
          },
        },
        create: {
          payload_address: row.payload_address,
          round_number: row.round_number,
          block_number: BigInt(row.block_number),
          transaction_hash: row.transaction_hash,
          log_index: Number(row.log_index),
          rollup_address: row.rollup_address,
          timestamp: row.timestamp?.toString() ?? null,
          contract_address: row.contract_address ?? null,
        },
        update: {
          payload_address: row.payload_address,
          round_number: row.round_number,
          block_number: BigInt(row.block_number),
          rollup_address: row.rollup_address,
          timestamp: row.timestamp?.toString() ?? null,
          contract_address: row.contract_address ?? null,
        },
      });
    }
  }

  protected extractCursor(row: typeof proposerPayloadSubmittable.$inferSelect): EventCursor {
    return { blockNumber: row.block_number, logIndex: row.log_index };
  }

  protected async deleteAfterBlock(blockNumber: string) {
    await prisma.proposerPayloadSubmittable.deleteMany({
      where: { block_number: { gt: BigInt(blockNumber) } },
    });
  }

  protected async countRemaining() {
    return prisma.proposerPayloadSubmittable.count();
  }
}

/** Materializes PayloadSubmitted events from Ponder to Prisma. */
export class PayloadSubmittedMaterializer extends BaseMaterializer {
  constructor() {
    super('payload_submitted');
  }

  protected async fetchBatch(cursor: EventCursor) {
    return ponderDb
      .select()
      .from(proposerPayloadSubmitted)
      .where(this.buildCursorCondition(
        sql`${proposerPayloadSubmitted.block_number}`,
        sql`${proposerPayloadSubmitted.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${proposerPayloadSubmitted.block_number}::bigint`),
        asc(sql`${proposerPayloadSubmitted.log_index}::bigint`)
      )
      .limit(this.batchSize);
  }

  protected async materializeBatch(rows: (typeof proposerPayloadSubmitted.$inferSelect)[]) {
    for (const row of rows) {
      await prisma.proposerPayloadSubmitted.upsert({
        where: {
          unique_proposer_payload_submitted_transaction_log: {
            transaction_hash: row.transaction_hash,
            log_index: Number(row.log_index),
          },
        },
        create: {
          payload_address: row.payload_address,
          round_number: row.round_number,
          block_number: BigInt(row.block_number),
          transaction_hash: row.transaction_hash,
          log_index: Number(row.log_index),
          rollup_address: row.rollup_address,
          timestamp: row.timestamp?.toString() ?? null,
          contract_address: row.contract_address ?? null,
          submitter_address: row.submitter_address ?? null,
        },
        update: {
          payload_address: row.payload_address,
          round_number: row.round_number,
          block_number: BigInt(row.block_number),
          rollup_address: row.rollup_address,
          timestamp: row.timestamp?.toString() ?? null,
          contract_address: row.contract_address ?? null,
          submitter_address: row.submitter_address ?? null,
        },
      });
    }
  }

  protected extractCursor(row: typeof proposerPayloadSubmitted.$inferSelect): EventCursor {
    return { blockNumber: row.block_number, logIndex: row.log_index };
  }

  protected async deleteAfterBlock(blockNumber: string) {
    await prisma.proposerPayloadSubmitted.deleteMany({
      where: { block_number: { gt: BigInt(blockNumber) } },
    });
  }

  protected async countRemaining() {
    return prisma.proposerPayloadSubmitted.count();
  }
}
