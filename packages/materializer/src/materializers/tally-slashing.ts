import { BaseMaterializer, EventCursor } from './base.js';
import { ponderDb } from '../db/ponder.js';
import { prisma } from '../db/prisma.js';
import {
  tallyVoteCast,
  tallyRoundExecuted,
  slashSlashed,
} from '@dashtec/indexer-ponder/ponder.schema';
import { sql, asc, desc, lte } from 'drizzle-orm';
import { normalizeAddress } from '@dashtec/shared-utils';
import { config } from '../config.js';

/** Materializes TallyVoteCast events from Ponder (with epoch_number) to Prisma. */
export class TallyVoteCastMaterializer extends BaseMaterializer {
  constructor() {
    super('tally_vote_cast');
  }

  protected async fetchBatch(cursor: EventCursor) {
    return ponderDb
      .select()
      .from(tallyVoteCast)
      .where(this.buildCursorCondition(
        sql`${tallyVoteCast.block_number}`,
        sql`${tallyVoteCast.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${tallyVoteCast.block_number}::bigint`),
        asc(sql`${tallyVoteCast.log_index}::bigint`)
      )
      .limit(this.batchSize);
  }

  protected async materializeBatch(rows: (typeof tallyVoteCast.$inferSelect)[]) {
    for (const row of rows) {
      const timestamp = row.timestamp?.toString() ?? null;
      const voteDate = row.timestamp ? new Date(Number(row.timestamp) * 1000) : null;

      // Only overwrite enriched fields if Ponder actually has them
      const enrichedFields: Record<string, unknown> = {};
      if (row.epoch_number != null) enrichedFields.epoch_number = row.epoch_number;
      if (voteDate != null) enrichedFields.vote_date = voteDate;

      await prisma.tallyVoteCast.upsert({
        where: {
          unique_tally_vote_cast_transaction_log: {
            transaction_hash: row.transaction_hash,
            log_index: Number(row.log_index),
          },
        },
        create: {
          round_number: row.round_number,
          slot_number: row.slot_number,
          proposer_address: row.proposer_address,
          epoch_number: row.epoch_number,
          block_number: BigInt(row.block_number),
          transaction_hash: row.transaction_hash,
          log_index: Number(row.log_index),
          rollup_address: row.rollup_address,
          timestamp,
          vote_date: voteDate,
          contract_address: row.contract_address ?? '',
        },
        update: {
          round_number: row.round_number,
          slot_number: row.slot_number,
          proposer_address: row.proposer_address,
          block_number: BigInt(row.block_number),
          rollup_address: row.rollup_address,
          timestamp,
          contract_address: row.contract_address ?? '',
          ...enrichedFields,
        },
      });
    }
  }

  protected extractCursor(row: typeof tallyVoteCast.$inferSelect): EventCursor {
    return { blockNumber: row.block_number, logIndex: row.log_index };
  }

  protected async deleteAfterBlock(blockNumber: string) {
    await prisma.tallyVoteCast.deleteMany({
      where: { block_number: { gt: BigInt(blockNumber) } },
    });
  }

  protected async countRemaining() {
    return prisma.tallyVoteCast.count({ where: { rollup_address: config.ROLLUP_CONTRACT_ADDRESS } });
  }
}

/**
 * Materializes TallyRoundExecuted events + explodes tally_results and target_committees
 * into TallySlashAction and TallySlashTargetCommittee rows.
 */
export class TallyRoundExecutedMaterializer extends BaseMaterializer {
  constructor() {
    super('tally_round_executed');
  }

  protected async fetchBatch(cursor: EventCursor) {
    return ponderDb
      .select()
      .from(tallyRoundExecuted)
      .where(this.buildCursorCondition(
        sql`${tallyRoundExecuted.block_number}`,
        sql`${tallyRoundExecuted.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${tallyRoundExecuted.block_number}::bigint`),
        asc(sql`${tallyRoundExecuted.log_index}::bigint`)
      )
      .limit(this.batchSize);
  }

  protected async materializeBatch(rows: (typeof tallyRoundExecuted.$inferSelect)[]) {
    for (const row of rows) {
      const timestamp = row.timestamp?.toString() ?? null;
      const executedDate = row.timestamp ? new Date(Number(row.timestamp) * 1000) : null;

      // Build update data — only overwrite enriched fields if Ponder actually has them
      const enrichedFields: Record<string, unknown> = {};
      if (row.payload_address != null) enrichedFields.payload_address = row.payload_address;
      if (row.total_slash_amount != null) enrichedFields.total_slash_amount = row.total_slash_amount;
      if (row.vote_count != null) enrichedFields.vote_count = row.vote_count;
      if (executedDate != null) enrichedFields.executed_date = executedDate;

      // Upsert main TallyRoundExecuted row
      await prisma.tallyRoundExecuted.upsert({
        where: {
          unique_tally_round_executed_transaction_log: {
            transaction_hash: row.transaction_hash,
            log_index: Number(row.log_index),
          },
        },
        create: {
          round_number: row.round_number,
          slash_count: row.slash_count,
          payload_address: row.payload_address ?? null,
          total_slash_amount: row.total_slash_amount ?? null,
          vote_count: row.vote_count ?? null,
          block_number: BigInt(row.block_number),
          transaction_hash: row.transaction_hash,
          log_index: Number(row.log_index),
          rollup_address: row.rollup_address,
          timestamp,
          executed_date: executedDate,
          contract_address: row.contract_address ?? '',
        },
        update: {
          round_number: row.round_number,
          slash_count: row.slash_count,
          block_number: BigInt(row.block_number),
          rollup_address: row.rollup_address,
          timestamp,
          contract_address: row.contract_address ?? '',
          ...enrichedFields,
        },
      });

      // Explode target_committees JSON into TallySlashTargetCommittee rows
      if (row.target_committees) {
        await this.materializeCommittees(row);
      }

      // Explode tally_results JSON into TallySlashAction rows
      if (row.tally_results) {
        await this.materializeActions(row);
      }
    }
  }

  /** Parse target_committees JSON and create individual committee rows. */
  private async materializeCommittees(row: typeof tallyRoundExecuted.$inferSelect) {
    try {
      const committees: string[][] = JSON.parse(row.target_committees!);

      for (let epochIndex = 0; epochIndex < committees.length; epochIndex++) {
        const committee = committees[epochIndex];
        const normalizedMembers = committee.map(addr => normalizeAddress(addr));
        const targetEpochNumber = BigInt(row.round_number - epochIndex - 1);

        await prisma.tallySlashTargetCommittee.upsert({
          where: {
            unique_slash_target_committee: {
              round_number: row.round_number,
              rollup_address: row.rollup_address,
              epoch_index: epochIndex,
            },
          },
          create: {
            round_number: row.round_number,
            epoch_index: epochIndex,
            target_epoch_number: targetEpochNumber,
            committee_members: normalizedMembers,
            committee_size: committee.length,
            block_number: BigInt(row.block_number),
            contract_address: row.contract_address ?? '',
            rollup_instance: row.contract_address ?? '',
            rollup_address: row.rollup_address,
          },
          update: {
            target_epoch_number: targetEpochNumber,
            committee_members: normalizedMembers,
            committee_size: committee.length,
            block_number: BigInt(row.block_number),
            contract_address: row.contract_address ?? '',
            rollup_instance: row.contract_address ?? '',
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to parse target_committees for round ${row.round_number}`, { error });
    }
  }

  /** Parse tally_results JSON and create individual slash action rows. */
  private async materializeActions(row: typeof tallyRoundExecuted.$inferSelect) {
    try {
      const results: Array<{ attester: string; amount: string }> = JSON.parse(row.tally_results!);
      const executedAt = row.timestamp ? new Date(Number(row.timestamp) * 1000) : null;

      for (let actionIndex = 0; actionIndex < results.length; actionIndex++) {
        const action = results[actionIndex];
        const validatorAddress = normalizeAddress(action.attester);

        await prisma.tallySlashAction.upsert({
          where: {
            unique_slash_action_per_round: {
              round_number: row.round_number,
              action_index: actionIndex,
              rollup_address: row.rollup_address,
              validator_address: validatorAddress,
            },
          },
          create: {
            round_number: row.round_number,
            action_index: actionIndex,
            validator_address: validatorAddress,
            slash_amount: action.amount,
            payload_address: row.payload_address ? normalizeAddress(row.payload_address) : null,
            deployment_tx_hash: row.transaction_hash,
            deployment_block: BigInt(row.block_number),
            executed_at: executedAt,
            contract_address: row.contract_address ?? '',
            tally_block_number: BigInt(row.block_number),
            rollup_address: row.rollup_address
          },
          update: {
            slash_amount: action.amount,
            payload_address: row.payload_address ? normalizeAddress(row.payload_address) : null,
            deployment_tx_hash: row.transaction_hash,
            deployment_block: BigInt(row.block_number),
            executed_at: executedAt,
            contract_address: row.contract_address ?? '',
            tally_block_number: BigInt(row.block_number),
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to parse tally_results for round ${row.round_number}`, { error });
    }
  }

  protected extractCursor(row: typeof tallyRoundExecuted.$inferSelect): EventCursor {
    return { blockNumber: row.block_number, logIndex: row.log_index };
  }

  protected async deleteAfterBlock(blockNumber: string) {
    await prisma.tallyRoundExecuted.deleteMany({
      where: { block_number: { gt: BigInt(blockNumber) } },
    });
    await prisma.tallySlashTargetCommittee.deleteMany({
      where: { block_number: { gt: BigInt(blockNumber) } },
    });
    await prisma.tallySlashAction.deleteMany({
      where: { deployment_block: { gt: BigInt(blockNumber) } },
    });
  }

  protected async countRemaining() {
    return prisma.tallyRoundExecuted.count({ where: { rollup_address: config.ROLLUP_CONTRACT_ADDRESS } });
  }
}

/** Materializes SlashSlashed events from Ponder to Prisma. */
export class SlashSlashedMaterializer extends BaseMaterializer {
  constructor() {
    super('slash_slashed');
  }

  protected async fetchBatch(cursor: EventCursor) {
    return ponderDb
      .select()
      .from(slashSlashed)
      .where(this.buildCursorCondition(
        sql`${slashSlashed.block_number}`,
        sql`${slashSlashed.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${slashSlashed.block_number}::bigint`),
        asc(sql`${slashSlashed.log_index}::bigint`)
      )
      .limit(this.batchSize);
  }

  protected async materializeBatch(rows: (typeof slashSlashed.$inferSelect)[]) {
    for (const row of rows) {
      // Look up payload_address from the most recent TallyRoundExecuted in Ponder
      let payloadAddress = row.payload_address ?? null;
      if (!payloadAddress) {
        const recentRound = await ponderDb
          .select({ payload_address: tallyRoundExecuted.payload_address })
          .from(tallyRoundExecuted)
          .where(lte(sql`${tallyRoundExecuted.block_number}::bigint`, sql`${row.block_number}::bigint`))
          .orderBy(
            desc(sql`${tallyRoundExecuted.block_number}::bigint`),
            desc(sql`${tallyRoundExecuted.log_index}::bigint`)
          )
          .limit(1);

        payloadAddress = recentRound[0]?.payload_address ?? null;
      }

      const timestamp = row.timestamp?.toString() ?? null;
      const slashedDate = row.timestamp ? new Date(Number(row.timestamp) * 1000) : new Date();

      await prisma.slashSlashed.upsert({
        where: {
          unique_slash_slashed_transaction_log: {
            transaction_hash: row.transaction_hash,
            log_index: Number(row.log_index),
          },
        },
        create: {
          payload_address: payloadAddress,
          attester_address: row.attester_address,
          amount: row.amount,
          block_number: BigInt(row.block_number),
          transaction_hash: row.transaction_hash,
          log_index: Number(row.log_index),
          rollup_address: row.rollup_address,
          timestamp,
          slashed_date: slashedDate,
          contract_address: row.contract_address ?? '',
        },
        update: {
          payload_address: payloadAddress,
          attester_address: row.attester_address,
          amount: row.amount,
          block_number: BigInt(row.block_number),
          rollup_address: row.rollup_address,
          timestamp,
          slashed_date: slashedDate,
          contract_address: row.contract_address ?? '',
        },
      });
    }
  }

  protected extractCursor(row: typeof slashSlashed.$inferSelect): EventCursor {
    return { blockNumber: row.block_number, logIndex: row.log_index };
  }

  protected async deleteAfterBlock(blockNumber: string) {
    await prisma.slashSlashed.deleteMany({
      where: { block_number: { gt: BigInt(blockNumber) } },
    });
  }

  protected async countRemaining() {
    return prisma.slashSlashed.count({ where: { rollup_address: config.ROLLUP_CONTRACT_ADDRESS } });
  }
}
