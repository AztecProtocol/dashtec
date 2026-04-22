import { BaseMaterializer, EventCursor } from './base.js';
import { ponderDb } from '../db/ponder.js';
import { prisma } from '../db/prisma.js';
import {
  providerRegistered,
  providerTakeRateUpdated,
  providerRewardsRecipientUpdated,
  providerAdminUpdated,
  attestersAddedToProvider,
} from '@dashtec/indexer-ponder/ponder.schema';
import { sql, asc } from 'drizzle-orm';
import { config } from '../config.js';

/**
 * Materializes Provider state from multiple event types.
 * Applies the latest update from each event to build current provider state.
 */
export class ProviderMaterializer extends BaseMaterializer {
  constructor() {
    super('provider');
  }

  protected async fetchBatch(cursor: EventCursor) {
    // Fetch all provider-related events and merge chronologically
    const registered = await ponderDb
      .select({
        type: sql<string>`'registered'`.as('type'),
        provider_identifier: providerRegistered.provider_identifier,
        provider_admin: providerRegistered.provider_admin,
        provider_take_rate: providerRegistered.provider_take_rate,
        rewards_recipient: providerRegistered.rewards_recipient,
        block_number: providerRegistered.block_number,
        log_index: providerRegistered.log_index,
        transaction_hash: providerRegistered.transaction_hash,
        timestamp: providerRegistered.timestamp,
        rollup_address: providerRegistered.rollup_address,
        value: sql<string>`null`.as('value'),
      })
      .from(providerRegistered)
      .where(this.buildCursorCondition(
        sql`${providerRegistered.block_number}`,
        sql`${providerRegistered.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${providerRegistered.block_number}::bigint`),
        asc(sql`${providerRegistered.log_index}::bigint`)
      )
      .limit(this.batchSize);

    const takeRateUpdates = await ponderDb
      .select({
        type: sql<string>`'take_rate_updated'`.as('type'),
        provider_identifier: providerTakeRateUpdated.provider_identifier,
        provider_admin: sql<string>`null`.as('provider_admin'),
        provider_take_rate: providerTakeRateUpdated.new_take_rate,
        rewards_recipient: sql<string>`null`.as('rewards_recipient'),
        block_number: providerTakeRateUpdated.block_number,
        log_index: providerTakeRateUpdated.log_index,
        transaction_hash: providerTakeRateUpdated.transaction_hash,
        timestamp: sql<bigint>`null`.as('timestamp'),
        rollup_address: providerTakeRateUpdated.rollup_address,
        value: sql<string>`null`.as('value'),
      })
      .from(providerTakeRateUpdated)
      .where(this.buildCursorCondition(
        sql`${providerTakeRateUpdated.block_number}`,
        sql`${providerTakeRateUpdated.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${providerTakeRateUpdated.block_number}::bigint`),
        asc(sql`${providerTakeRateUpdated.log_index}::bigint`)
      )
      .limit(this.batchSize);

    const recipientUpdates = await ponderDb
      .select({
        type: sql<string>`'recipient_updated'`.as('type'),
        provider_identifier: providerRewardsRecipientUpdated.provider_identifier,
        provider_admin: sql<string>`null`.as('provider_admin'),
        provider_take_rate: sql<number>`null`.as('provider_take_rate'),
        rewards_recipient: sql<string>`null`.as('rewards_recipient'),
        block_number: providerRewardsRecipientUpdated.block_number,
        log_index: providerRewardsRecipientUpdated.log_index,
        transaction_hash: providerRewardsRecipientUpdated.transaction_hash,
        timestamp: sql<bigint>`null`.as('timestamp'),
        rollup_address: providerRewardsRecipientUpdated.rollup_address,
        value: providerRewardsRecipientUpdated.new_rewards_recipient,
      })
      .from(providerRewardsRecipientUpdated)
      .where(this.buildCursorCondition(
        sql`${providerRewardsRecipientUpdated.block_number}`,
        sql`${providerRewardsRecipientUpdated.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${providerRewardsRecipientUpdated.block_number}::bigint`),
        asc(sql`${providerRewardsRecipientUpdated.log_index}::bigint`)
      )
      .limit(this.batchSize);

    const adminUpdates = await ponderDb
      .select({
        type: sql<string>`'admin_updated'`.as('type'),
        provider_identifier: providerAdminUpdated.provider_identifier,
        provider_admin: sql<string>`null`.as('provider_admin'),
        provider_take_rate: sql<number>`null`.as('provider_take_rate'),
        rewards_recipient: sql<string>`null`.as('rewards_recipient'),
        block_number: providerAdminUpdated.block_number,
        log_index: providerAdminUpdated.log_index,
        transaction_hash: providerAdminUpdated.transaction_hash,
        timestamp: sql<bigint>`null`.as('timestamp'),
        rollup_address: providerAdminUpdated.rollup_address,
        value: providerAdminUpdated.new_admin,
      })
      .from(providerAdminUpdated)
      .where(this.buildCursorCondition(
        sql`${providerAdminUpdated.block_number}`,
        sql`${providerAdminUpdated.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${providerAdminUpdated.block_number}::bigint`),
        asc(sql`${providerAdminUpdated.log_index}::bigint`)
      )
      .limit(this.batchSize);

    // Merge and sort all events chronologically
    const all = [...registered, ...takeRateUpdates, ...recipientUpdates, ...adminUpdates]
      .sort((a, b) => {
        const blockCmp = BigInt(a.block_number) - BigInt(b.block_number);
        if (blockCmp !== 0n) return blockCmp > 0n ? 1 : -1;
        return BigInt(a.log_index) - BigInt(b.log_index) > 0n ? 1 : -1;
      });

    return all.slice(0, this.batchSize);
  }

  protected async materializeBatch(rows: any[]) {
    for (const row of rows) {
      switch (row.type) {
        case 'registered':
          await this.handleRegistered(row);
          break;
        case 'take_rate_updated':
          await this.handleTakeRateUpdated(row);
          break;
        case 'recipient_updated':
          await this.handleRecipientUpdated(row);
          break;
        case 'admin_updated':
          await this.handleAdminUpdated(row);
          break;
      }
    }
  }

  /** Handle ProviderRegistered: create or update provider. */
  private async handleRegistered(row: any) {
    await prisma.provider.upsert({
      where: { providerIdentifier: row.provider_identifier },
      create: {
        providerIdentifier: row.provider_identifier,
        providerAdmin: row.provider_admin,
        providerTakeRate: row.provider_take_rate,
        rewardsRecipient: row.rewards_recipient ?? row.provider_admin,
        rollup_address: row.rollup_address,
        blockNumber: BigInt(row.block_number),
        txHash: row.transaction_hash,
        logIndex: parseInt(row.log_index),
        timestamp: row.timestamp ?? 0n,
      },
      update: {
        providerAdmin: row.provider_admin,
        providerTakeRate: row.provider_take_rate,
        rollup_address: row.rollup_address,
        blockNumber: BigInt(row.block_number),
        txHash: row.transaction_hash,
        logIndex: parseInt(row.log_index),
        timestamp: row.timestamp ?? 0n,
      },
    });
  }

  /** Handle ProviderTakeRateUpdated: update take rate field. */
  private async handleTakeRateUpdated(row: any) {
    try {
      await prisma.provider.update({
        where: { providerIdentifier: row.provider_identifier },
        data: {
          providerTakeRate: row.provider_take_rate,
          blockNumber: BigInt(row.block_number),
          txHash: row.transaction_hash,
          logIndex: parseInt(row.log_index),
        },
      });
    } catch {
      this.logger.warn(`Provider ${row.provider_identifier} not found for take rate update`);
    }
  }

  /** Handle ProviderRewardsRecipientUpdated: update rewards recipient field. */
  private async handleRecipientUpdated(row: any) {
    try {
      await prisma.provider.update({
        where: { providerIdentifier: row.provider_identifier },
        data: {
          rewardsRecipient: row.value,
          blockNumber: BigInt(row.block_number),
          txHash: row.transaction_hash,
          logIndex: parseInt(row.log_index),
        },
      });
    } catch {
      this.logger.warn(`Provider ${row.provider_identifier} not found for recipient update`);
    }
  }

  /** Handle ProviderAdminUpdated: update admin field. */
  private async handleAdminUpdated(row: any) {
    try {
      await prisma.provider.update({
        where: { providerIdentifier: row.provider_identifier },
        data: {
          providerAdmin: row.value,
          blockNumber: BigInt(row.block_number),
          txHash: row.transaction_hash,
          logIndex: parseInt(row.log_index),
        },
      });
    } catch {
      this.logger.warn(`Provider ${row.provider_identifier} not found for admin update`);
    }
  }

  protected extractCursor(row: any): EventCursor {
    return { blockNumber: row.block_number, logIndex: row.log_index };
  }

  protected async deleteAfterBlock(_blockNumber: string) {
    // Providers are upserted by providerIdentifier, not by block
    // A full re-sync will re-derive correct state
    this.logger.info('Provider reorg recovery: will re-derive from events on next cycle');
  }

  protected async countRemaining() {
    return prisma.provider.count({ where: { rollup_address: config.ROLLUP_CONTRACT_ADDRESS } });
  }
}

/**
 * Materializes ProviderAttester records from attestersAddedToProvider events.
 * Explodes JSON array of attesters into individual Prisma rows.
 */
export class ProviderAttesterMaterializer extends BaseMaterializer {
  constructor() {
    super('provider_attester');
  }

  protected async fetchBatch(cursor: EventCursor) {
    return ponderDb
      .select()
      .from(attestersAddedToProvider)
      .where(this.buildCursorCondition(
        sql`${attestersAddedToProvider.block_number}`,
        sql`${attestersAddedToProvider.log_index}`,
        cursor
      ))
      .orderBy(
        asc(sql`${attestersAddedToProvider.block_number}::bigint`),
        asc(sql`${attestersAddedToProvider.log_index}::bigint`)
      )
      .limit(this.batchSize);
  }

  protected async materializeBatch(rows: (typeof attestersAddedToProvider.$inferSelect)[]) {
    for (const row of rows) {
      // Parse attesters JSON array
      let attesters: string[];
      try {
        attesters = JSON.parse(row.attesters);
      } catch {
        this.logger.error(`Failed to parse attesters JSON for provider ${row.provider_identifier}`);
        continue;
      }

      for (const attester of attesters) {
        await prisma.providerAttester.upsert({
          where: {
            txHash_logIndex_providerIdentifier_attesterAddress: {
              txHash: row.transaction_hash,
              logIndex: parseInt(row.log_index),
              providerIdentifier: row.provider_identifier,
              attesterAddress: attester,
            },
          },
          create: {
            providerIdentifier: row.provider_identifier,
            attesterAddress: attester,
            rollup_address: row.rollup_address,
            blockNumber: BigInt(row.block_number),
            txHash: row.transaction_hash,
            logIndex: parseInt(row.log_index),
            timestamp: 0n, // attestersAddedToProvider doesn't have timestamp in Ponder
          },
          update: {
            rollup_address: row.rollup_address,
            blockNumber: BigInt(row.block_number),
          },
        });
      }
    }
  }

  protected extractCursor(row: typeof attestersAddedToProvider.$inferSelect): EventCursor {
    return { blockNumber: row.block_number, logIndex: row.log_index };
  }

  protected async deleteAfterBlock(blockNumber: string) {
    await prisma.providerAttester.deleteMany({
      where: { blockNumber: { gt: BigInt(blockNumber) } },
    });
  }

  protected async countRemaining() {
    return prisma.providerAttester.count({ where: { rollup_address: config.ROLLUP_CONTRACT_ADDRESS } });
  }
}
