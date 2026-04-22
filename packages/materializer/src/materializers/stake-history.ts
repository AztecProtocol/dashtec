import { BaseMaterializer, EventCursor } from './base.js';
import { ponderDb } from '../db/ponder.js';
import { prisma } from '../db/prisma.js';
import { deposit, gseDeposit, slashSlashed, withdrawFinalized } from '@dashtec/indexer-ponder/ponder.schema';
import { sql, asc } from 'drizzle-orm';

/** Materializes stake-changing events into a unified history timeline. */
export class StakeHistoryMaterializer extends BaseMaterializer {
  constructor() {
    super('stake_history');
  }

  protected async fetchBatch(cursor: EventCursor) {
    const depositRows = await ponderDb
      .select({
        id: deposit.id,
        attester_address: deposit.attester_address,
        rollup_address: deposit.rollup_address,
        event_type: sql<string>`'deposit'`.as('event_type'),
        amount: sql<string>`${deposit.amount}::text`.as('amount'),
        block_number: sql<string>`${deposit.block_number}::text`.as('block_number'),
        log_index: sql<string>`${deposit.log_index}::text`.as('log_index'),
        transaction_hash: deposit.tx_hash,
        timestamp: deposit.timestamp,
      })
      .from(deposit)
      .where(this.buildCursorCondition(sql`${deposit.block_number}`, sql`${deposit.log_index}`, cursor))
      .orderBy(asc(sql`${deposit.block_number}::bigint`), asc(sql`${deposit.log_index}::bigint`))
      .limit(this.batchSize);

    const gseRows = await ponderDb
      .select({
        id: gseDeposit.id,
        attester_address: gseDeposit.attester_address,
        rollup_address: gseDeposit.instance_address,
        event_type: sql<string>`'gse_deposit'`.as('event_type'),
        amount: sql<string>`COALESCE(${gseDeposit.effective_balance}, '0')`.as('amount'),
        block_number: gseDeposit.block_number,
        log_index: gseDeposit.log_index,
        transaction_hash: gseDeposit.transaction_hash,
        timestamp: gseDeposit.timestamp,
      })
      .from(gseDeposit)
      .where(this.buildCursorCondition(sql`${gseDeposit.block_number}`, sql`${gseDeposit.log_index}`, cursor))
      .orderBy(asc(sql`${gseDeposit.block_number}::bigint`), asc(sql`${gseDeposit.log_index}::bigint`))
      .limit(this.batchSize);

    const slashRows = await ponderDb
      .select({
        id: slashSlashed.id,
        attester_address: slashSlashed.attester_address,
        rollup_address: slashSlashed.rollup_address,
        event_type: sql<string>`'slashed'`.as('event_type'),
        amount: slashSlashed.amount,
        block_number: slashSlashed.block_number,
        log_index: slashSlashed.log_index,
        transaction_hash: slashSlashed.transaction_hash,
        timestamp: slashSlashed.timestamp,
      })
      .from(slashSlashed)
      .where(this.buildCursorCondition(sql`${slashSlashed.block_number}`, sql`${slashSlashed.log_index}`, cursor))
      .orderBy(asc(sql`${slashSlashed.block_number}::bigint`), asc(sql`${slashSlashed.log_index}::bigint`))
      .limit(this.batchSize);

    const withdrawRows = await ponderDb
      .select({
        id: withdrawFinalized.id,
        attester_address: withdrawFinalized.attester_address,
        rollup_address: withdrawFinalized.rollup_address,
        event_type: sql<string>`'withdraw'`.as('event_type'),
        amount: sql<string>`${withdrawFinalized.amount}::text`.as('amount'),
        block_number: sql<string>`${withdrawFinalized.block_number}::text`.as('block_number'),
        log_index: sql<string>`${withdrawFinalized.log_index}::text`.as('log_index'),
        transaction_hash: withdrawFinalized.tx_hash,
        timestamp: withdrawFinalized.timestamp,
      })
      .from(withdrawFinalized)
      .where(this.buildCursorCondition(sql`${withdrawFinalized.block_number}`, sql`${withdrawFinalized.log_index}`, cursor))
      .orderBy(asc(sql`${withdrawFinalized.block_number}::bigint`), asc(sql`${withdrawFinalized.log_index}::bigint`))
      .limit(this.batchSize);

    const all = [...depositRows, ...gseRows, ...slashRows, ...withdrawRows].sort((a, b) => {
      const blockCmp = BigInt(a.block_number) - BigInt(b.block_number);
      if (blockCmp !== 0n) return blockCmp > 0n ? 1 : -1;
      return BigInt(a.log_index) - BigInt(b.log_index) > 0n ? 1 : -1;
    });

    return all.slice(0, this.batchSize);
  }

  protected async materializeBatch(rows: any[]) {
    for (const row of rows) {
      await prisma.materializedValidatorStakeHistory.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          attester_address: row.attester_address,
          rollup_address: row.rollup_address,
          event_type: row.event_type,
          amount: row.amount,
          block_number: BigInt(row.block_number),
          log_index: Number(row.log_index),
          transaction_hash: row.transaction_hash,
          timestamp: row.timestamp ? BigInt(row.timestamp) : null,
        },
        update: {},
      });
    }
  }

  protected extractCursor(row: any): EventCursor {
    return { blockNumber: row.block_number.toString(), logIndex: row.log_index.toString() };
  }

  protected async deleteAfterBlock(blockNumber: string) {
    await prisma.materializedValidatorStakeHistory.deleteMany({
      where: { block_number: { gt: BigInt(blockNumber) } },
    });
  }

  protected async countRemaining() {
    return prisma.materializedValidatorStakeHistory.count();
  }
}
