import { BaseMaterializer, EventCursor } from './base.js';
import { ponderDb } from '../db/ponder.js';
import { prisma } from '../db/prisma.js';
import { deposit, gseDeposit } from '@dashtec/indexer-ponder/ponder.schema';
import { sql, asc } from 'drizzle-orm';
import { config } from '../config.js';

/**
 * Materializes Validator records from deposit events.
 * Reads enriched Ponder deposit tables (attester_status, effective_balance, validator_hex_index)
 * and upserts Prisma Validator by address.
 * Preserves app-maintained fields: name, x_handle, discordUsername, discordAvatar, x_image_url.
 */
export class ValidatorMaterializer extends BaseMaterializer {
  constructor() {
    super('validator');
  }

  protected async fetchBatch(cursor: EventCursor) {
    // Fetch from both deposit sources, union them by cursor ordering
    const rollupDeposits = await ponderDb
      .select({
        attester_address: deposit.attester_address,
        withdrawer_address: deposit.withdrawer_address,
        attester_status: deposit.attester_status,
        effective_balance: deposit.effective_balance,
        validator_hex_index: deposit.validator_hex_index,
        rollup_address: deposit.rollup_address,
        block_number: sql<string>`${deposit.block_number}::text`.as('block_number'),
        log_index: sql<string>`${deposit.log_index}::text`.as('log_index'),
        timestamp: deposit.timestamp,
        source: sql<string>`'rollup'`.as('source'),
      })
      .from(deposit)
      .where(this.buildCursorCondition(
        sql`${deposit.block_number}`,
        sql`${deposit.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${deposit.block_number}::bigint`),
        asc(sql`${deposit.log_index}::bigint`)
      )
      .limit(this.batchSize);

    const gseDeposits = await ponderDb
      .select({
        attester_address: gseDeposit.attester_address,
        withdrawer_address: gseDeposit.withdrawer_address,
        attester_status: gseDeposit.attester_status,
        effective_balance: gseDeposit.effective_balance,
        validator_hex_index: gseDeposit.validator_hex_index,
        rollup_address: gseDeposit.instance_address,
        block_number: gseDeposit.block_number,
        log_index: gseDeposit.log_index,
        timestamp: gseDeposit.timestamp,
        source: sql<string>`'gse'`.as('source'),
      })
      .from(gseDeposit)
      .where(this.buildCursorCondition(
        sql`${gseDeposit.block_number}`,
        sql`${gseDeposit.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${gseDeposit.block_number}::bigint`),
        asc(sql`${gseDeposit.log_index}::bigint`)
      )
      .limit(this.batchSize);

    // Merge and sort both sources
    const all = [...rollupDeposits, ...gseDeposits].sort((a, b) => {
      const blockCmp = BigInt(a.block_number) - BigInt(b.block_number);
      if (blockCmp !== 0n) return blockCmp > 0n ? 1 : -1;
      return BigInt(a.log_index) - BigInt(b.log_index) > 0n ? 1 : -1;
    });

    return all.slice(0, this.batchSize);
  }

  protected async materializeBatch(rows: any[]) {
    for (const row of rows) {
      if (!row.attester_status || !row.validator_hex_index) continue;

      const activationDate = row.timestamp
        ? new Date(Number(row.timestamp) * 1000)
        : new Date();

      await prisma.validator.upsert({
        where: { address: row.attester_address },
        create: {
          address: row.attester_address,
          validator_hex_index: row.validator_hex_index,
          status: row.attester_status,
          stake_balance: row.effective_balance,
          withdrawer_address: row.withdrawer_address,
          rollup_address: row.rollup_address ?? null,
          activation_date: activationDate,
          last_updated_at: new Date(),
        },
        update: {
          // Only update chain-derived fields, preserve app-maintained fields
          withdrawer_address: row.withdrawer_address,
          activation_date: activationDate,
          status: row.attester_status,
          stake_balance: row.effective_balance,
          rollup_address: row.rollup_address ?? null,
          last_updated_at: new Date(),
        },
      });
    }
  }

  protected extractCursor(row: any): EventCursor {
    return {
      blockNumber: row.block_number.toString(),
      logIndex: row.log_index.toString(),
    };
  }

  protected async deleteAfterBlock(_blockNumber: string) {
    // Validators are upserted by address, not by block - we don't delete on reorg.
    // A full re-sync from genesis will re-derive the correct state.
    this.logger.info('Validator reorg recovery: will re-derive from events on next cycle');
  }

  protected async countRemaining() {
    return prisma.validator.count({ where: { rollup_address: config.ROLLUP_CONTRACT_ADDRESS } });
  }
}
