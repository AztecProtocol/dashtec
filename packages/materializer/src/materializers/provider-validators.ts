import { BaseMaterializer, EventCursor } from './base.js';
import { prisma } from '../db/prisma.js';

/**
 * Materializes active provider-attester mappings from ProviderAttester (ADDs) and ProviderQueueDrip (DRIPs).
 * Only active attesters exist in the output table — dripped attesters are removed.
 * Sources from already-materialized Prisma tables (Group A), not Ponder directly.
 */
export class ProviderValidatorListMaterializer extends BaseMaterializer {
  constructor() {
    super('provider_validator_list');
  }

  protected async fetchBatch(cursor: EventCursor) {
    const cursorBlock = BigInt(cursor.blockNumber);
    const cursorLog = Number(cursor.logIndex);

    // Fetch ADD events from ProviderAttester
    const addRows = await prisma.$queryRaw<ProviderAttesterEvent[]>`
      SELECT
        'add' as event_type,
        "providerIdentifier" as provider_identifier,
        "attesterAddress" as attester_address,
        "blockNumber" as block_number,
        "logIndex" as log_index,
        "timestamp",
        "txHash" as tx_hash
      FROM "ProviderAttester"
      WHERE ("blockNumber" > ${cursorBlock}
        OR ("blockNumber" = ${cursorBlock} AND "logIndex" > ${cursorLog}))
      ORDER BY "blockNumber" ASC, "logIndex" ASC
      LIMIT ${this.batchSize}
    `;

    // Fetch DRIP events from ProviderQueueDrip
    const dripRows = await prisma.$queryRaw<ProviderAttesterEvent[]>`
      SELECT
        'drip' as event_type,
        "providerIdentifier" as provider_identifier,
        "attesterAddress" as attester_address,
        "blockNumber" as block_number,
        "logIndex" as log_index,
        "timestamp",
        "txHash" as tx_hash
      FROM "ProviderQueueDrip"
      WHERE ("blockNumber" > ${cursorBlock}
        OR ("blockNumber" = ${cursorBlock} AND "logIndex" > ${cursorLog}))
      ORDER BY "blockNumber" ASC, "logIndex" ASC
      LIMIT ${this.batchSize}
    `;

    // Merge and sort chronologically
    const merged = [...addRows, ...dripRows].sort((a, b) => {
      const blockCmp = BigInt(a.block_number) - BigInt(b.block_number);
      if (blockCmp !== 0n) return blockCmp > 0n ? 1 : -1;
      return Number(a.log_index) - Number(b.log_index);
    });

    return merged.slice(0, this.batchSize);
  }

  protected async materializeBatch(rows: ProviderAttesterEvent[]) {
    for (const row of rows) {
      if (row.event_type === 'add') {
        await this.handleAdd(row);
      } else {
        await this.handleDrip(row);
      }
    }
  }

  /** Upsert attester as active in the provider validator list. */
  private async handleAdd(row: ProviderAttesterEvent) {
    await prisma.materializerProviderValidatorList.upsert({
      where: {
        unique_provider_attester_mapping: {
          providerIdentifier: row.provider_identifier,
          attesterAddress: row.attester_address,
        },
      },
      create: {
        providerIdentifier: row.provider_identifier,
        attesterAddress: row.attester_address,
        blockNumber: BigInt(row.block_number),
        logIndex: Number(row.log_index),
        timestamp: row.timestamp ? BigInt(row.timestamp) : null,
        txHash: row.tx_hash,
      },
      update: {
        blockNumber: BigInt(row.block_number),
        logIndex: Number(row.log_index),
        timestamp: row.timestamp ? BigInt(row.timestamp) : null,
        txHash: row.tx_hash,
      },
    });
  }

  /** Remove dripped attester from provider validator list. */
  private async handleDrip(row: ProviderAttesterEvent) {
    await prisma.materializerProviderValidatorList.deleteMany({
      where: {
        providerIdentifier: row.provider_identifier,
        attesterAddress: row.attester_address,
      },
    });
  }

  protected extractCursor(row: ProviderAttesterEvent): EventCursor {
    return {
      blockNumber: row.block_number.toString(),
      logIndex: row.log_index.toString(),
    };
  }

  protected async deleteAfterBlock(blockNumber: string) {
    await prisma.materializerProviderValidatorList.deleteMany({
      where: { blockNumber: { gt: BigInt(blockNumber) } },
    });
  }

  protected async countRemaining() {
    return prisma.materializerProviderValidatorList.count();
  }
}

interface ProviderAttesterEvent {
  event_type: string;
  provider_identifier: string;
  attester_address: string;
  block_number: bigint;
  log_index: number;
  timestamp: bigint | null;
  tx_hash: string | null;
}
