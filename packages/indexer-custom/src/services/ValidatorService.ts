import { Validator } from '@dashtec/database';
import { prisma } from '../lib/prisma';
import { IValidatorService } from '../interfaces/IValidatorService';
import { ValidatorMinimalData, ValidatorStatDetail } from '../types/validatorStats';
import { createLogger, mapStatusToString, getValidatorHexIndex } from '@dashtec/shared-utils';
import { EpochService } from './EpochService';
import { AttesterView } from '../types/attester';
import { config } from '../config/config';
import { VALIDATOR_STATUS } from '@dashtec/shared-types';

const logger = createLogger('ValidatorService');

/**
 * Validator Service
 *
 * Handles all validator-related database operations
 */
export class ValidatorService implements IValidatorService {
  /**
   * Get all validator addresses from the database
   */
  async getAllValidatorAddresses(): Promise<string[]> {
    try {
      const validators = await prisma.validator.findMany({
        select: {
          address: true,
        },
        where: {
          // status: {
          //   in: [VALIDATOR_STATUS.ACTIVE, VALIDATOR_STATUS.EXITING, VALIDATOR_STATUS.ZOMBIE]
          // }
        }
      });
      return validators.map((v: { address: string }) => v.address.toLowerCase());
    } catch (error) {
      logger.error('Failed to fetch all validator addresses', { error });
      throw error;
    }
  }

  /**
   * Get validator by address
   */
  async getValidatorByAddress(address: string): Promise<Validator | null> {
    try {
      const validator = await prisma.validator.findUnique({
        where: { address: address.toLowerCase() },
      });
      return validator;
    } catch (error) {
      logger.error(`Failed to fetch validator by address ${address}`, { error });
      throw error;
    }
  }

  /**
   * Get validator by proposer address
   */
  async getValidatorByProposerAddress(proposerAddress: string): Promise<Validator | null> {
    try {
      const validator = await prisma.validator.findFirst({
        where: { address: proposerAddress.toLowerCase() },
      });

      if (!validator) {
        logger.warn(`No validator found with proposer address ${proposerAddress}`);
        return null;
      }

      logger.debug(`Found validator with proposer address ${proposerAddress}`);
      return validator;
    } catch (error) {
      logger.error(`Failed to retrieve validator with proposer address ${proposerAddress}`, { error });
      throw error;
    }
  }

  /**
   * Upsert validator with minimal data
   */
  async upsertValidatorMinimal(data: ValidatorMinimalData): Promise<void> {
    try {
      const baseHex = getValidatorHexIndex(data.address);

      await prisma.validator.upsert({
        where: { address: data.address.toLowerCase() },
        create: {
          address: data.address.toLowerCase(),
          validator_hex_index: data.validator_hex_index || baseHex,
          rollup_address: config.ROLLUP_CONTRACT_ADDRESS,
          status: 'unknown',
          first_seen_at: new Date(),
          last_updated_at: data.last_updated_at,
        },
        update: {
          rollup_address: config.ROLLUP_CONTRACT_ADDRESS,
          last_updated_at: data.last_updated_at,
        },
      });
      logger.debug(`Upserted validator ${data.address}`);
    } catch (error) {
      logger.error(`Failed to upsert validator ${data.address}`, { error });
      throw error;
    }
  }

  /**
   * Upsert validator with full data
   */
  async upsertFullValidator(data: {
    address: string;
    status?: string | null;
    stake_balance?: number | null;
    withdrawable_balance?: number | null;
    activation_date?: Date | null;
    exit_date?: Date | null;
    withdrawer_address?: string | null;
    validator_hex_index?: string | null;
    last_updated_at: Date;
  }): Promise<void> {
    const { address, ...updatePayload } = data;
    const baseHex = getValidatorHexIndex(address);

    try {
      await prisma.validator.upsert({
        where: { address: address.toLowerCase() },
        create: {
          address: address.toLowerCase(),
          validator_hex_index: updatePayload.validator_hex_index || baseHex,
          rollup_address: config.ROLLUP_CONTRACT_ADDRESS,
          status: updatePayload.status || 'unknown',
          stake_balance: updatePayload.stake_balance,
          withdrawable_balance: updatePayload.withdrawable_balance,
          activation_date: updatePayload.activation_date,
          exit_date: updatePayload.exit_date,
          withdrawer_address: updatePayload.withdrawer_address?.toLowerCase(),
          first_seen_at: new Date(),
          last_updated_at: data.last_updated_at,
        },
        update: {
          rollup_address: config.ROLLUP_CONTRACT_ADDRESS,
          status: updatePayload.status ?? undefined,
          stake_balance: updatePayload.stake_balance ?? undefined,
          withdrawable_balance: updatePayload.withdrawable_balance ?? undefined,
          activation_date: updatePayload.activation_date ?? undefined,
          exit_date: updatePayload.exit_date ?? undefined,
          withdrawer_address: updatePayload.withdrawer_address?.toLowerCase() ?? undefined,
          last_updated_at: data.last_updated_at,
        },
      });
      logger.debug(`Upserted full validator ${address}`);
    } catch (error) {
      logger.error(`Failed to upsert full validator ${address}`, { error });
      throw error;
    }
  }

  /**
   * Update social media data for a validator
   */
  async updateValidatorSocialData(address: string, socialData: {
    x_handle?: string;
    x_user_id?: string;
    x_image_url?: string;
    discordId?: string;
    discordUsername?: string;
    discordAvatar?: string;
    name?: string;
  }): Promise<void> {
    try {
      await prisma.validator.update({
        where: { address: address.toLowerCase() },
        data: {
          x_handle: socialData.x_handle,
          x_user_id: socialData.x_user_id,
          x_image_url: socialData.x_image_url,
          discordId: socialData.discordId,
          discordUsername: socialData.discordUsername,
          discordAvatar: socialData.discordAvatar,
          name: socialData.name,
          last_updated_at: new Date(),
        },
      });
      logger.info(`Updated social data for validator ${address}`, { socialData });
    } catch (error) {
      logger.error(`Failed to update social data for validator ${address}`, { error });
      throw error;
    }
  }

  /**
   * Process a single validator's stats
   * Returns set of epochs touched by this validator
   */
  async processValidatorStats(
    validatorData: ValidatorStatDetail,
    currentEpochFromRpc: bigint,
    slotsPerEpoch: bigint,
    maxPastEpochs: number,
    epochService: EpochService
  ): Promise<Set<bigint>> {
    logger.debug(`Processing validator ${validatorData.address}`);
    const epochsTouchedForThisValidator = new Set<bigint>();

    // Upsert validator
    await this.upsertValidatorMinimal({
      address: validatorData.address,
      validator_hex_index: validatorData.validator_hex_index,
      last_updated_at: new Date(),
    });

    // Filter history: only slots that map to valid epochs for this rollup
    const maxValidSlot = (currentEpochFromRpc + 1n) * slotsPerEpoch;
    let filteredHistory = validatorData.history.filter(item => {
      return BigInt(item.slot) < maxValidSlot;
    });

    // Further filter based on max past epochs
    if (maxPastEpochs > 0 && filteredHistory.length > 0) {
      const oldestEpochToProcess = currentEpochFromRpc - BigInt(maxPastEpochs - 1);
      filteredHistory = filteredHistory.filter(item => {
        const itemEpoch = BigInt(item.slot) / slotsPerEpoch;
        return itemEpoch >= oldestEpochToProcess && itemEpoch <= currentEpochFromRpc;
      });
    }

    if (filteredHistory.length === 0) {
      return epochsTouchedForThisValidator;
    }

    // Map history items
    const historyWithEpochs = filteredHistory.map(item => ({
      slot_number: BigInt(item.slot),
      epoch_number: BigInt(item.slot) / slotsPerEpoch,
      status: item.status,
    }));

    // Collect all unique epochs touched
    const uniqueEpochs = new Set(historyWithEpochs.map(item => item.epoch_number));
    uniqueEpochs.forEach(epoch => epochsTouchedForThisValidator.add(epoch));

    // Ensure epochs exist
    await Promise.all(
      Array.from(uniqueEpochs).map(epochNumber =>
        epochService.ensureEpochExists(epochNumber)
      )
    );

    // Save attestations in chunks to avoid overwhelming the database
    const chunkSize = 100;
    for (let i = 0; i < historyWithEpochs.length; i += chunkSize) {
      const chunk = historyWithEpochs.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(item =>
          epochService.saveValidatorAttestation({
            slot_number: item.slot_number,
            epoch_number: item.epoch_number,
            validator_address: validatorData.address,
            timestamp: new Date(),
            status: item.status,
          })
        )
      );
    }

    // Update validator performance for each epoch in parallel
    await Promise.all(
      Array.from(epochsTouchedForThisValidator).map(epochNumber =>
        epochService.updateValidatorEpochPerformance(epochNumber, validatorData.address)
      )
    );

    return epochsTouchedForThisValidator;
  }

  /**
   * Process validator from attester view data
   */
  async processValidatorFromAttesterView(address: string, attesterView: AttesterView | null): Promise<void> {
    if (!attesterView) {
      await this.upsertValidatorMinimal({
        address: address.toLowerCase(),
        last_updated_at: new Date(),
      });
      return;
    }

    await this.upsertFullValidator({
      address: address.toLowerCase(),
      status: mapStatusToString(Number(attesterView.status)),
      stake_balance: Number(attesterView.effectiveBalance),
      withdrawer_address: attesterView.config?.withdrawer?.toLowerCase(),
      last_updated_at: new Date(),
    });
  }

  /** Batch fetch validators by addresses in a single DB query */
  async getValidatorsByAddresses(addresses: string[]): Promise<Map<string, Validator>> {
    try {
      const validators = await prisma.validator.findMany({
        where: { address: { in: addresses.map(a => a.toLowerCase()), mode: 'insensitive' } },
      });
      return new Map(validators.map(v => [v.address.toLowerCase(), v]));
    } catch (error) {
      logger.error('Failed to batch fetch validators', { error, count: addresses.length });
      throw error;
    }
  }

  /** Get canonical rollup addresses excluding current, newest first */
  async getCanonicalRollupAddresses(): Promise<string[]> {
    try {
      const currentRollup = config.ROLLUP_CONTRACT_ADDRESS.toLowerCase();
      const rows = await prisma.canonicalRollupUpdated.findMany({
        select: { instance_address: true },
        orderBy: { block_number: 'desc' },
      });
      return rows
        .map(r => r.instance_address.toLowerCase())
        .filter(addr => addr !== currentRollup);
    } catch (error) {
      logger.error('Failed to fetch canonical rollup addresses', { error });
      return [];
    }
  }

  /** Batch upsert validators from a map of attester views using bulk unnest SQL */
  async batchProcessValidatorsFromAttesterViews(
    views: Map<string, AttesterView | null>,
    rollupOverrides?: Map<string, string>,
  ): Promise<number> {
    const now = new Date();
    const defaultRollup = config.ROLLUP_CONTRACT_ADDRESS;

    // Separate null-view (address-only) vs full-view validators into column arrays
    const nullView = { addresses: [] as string[], hexIndexes: [] as string[], rollups: [] as string[] };
    const fullView = {
      addresses: [] as string[],
      hexIndexes: [] as string[],
      rollups: [] as string[],
      statuses: [] as string[],
      balances: [] as string[],
      withdrawers: [] as (string | null)[],
    };

    for (const [address, view] of views) {
      const addr = address.toLowerCase();
      const baseHex = getValidatorHexIndex(addr);
      const rollup = rollupOverrides?.get(addr) ?? defaultRollup;

      if (!view) {
        nullView.addresses.push(addr);
        nullView.hexIndexes.push(baseHex);
        nullView.rollups.push(rollup);
      } else {
        fullView.addresses.push(addr);
        fullView.hexIndexes.push(baseHex);
        fullView.rollups.push(rollup);
        fullView.statuses.push(mapStatusToString(Number(view.status)));
        fullView.balances.push(String(Number(view.effectiveBalance)));
        fullView.withdrawers.push(view.config?.withdrawer?.toLowerCase() ?? null);
      }
    }

    let totalAffected = 0;

    // Null-view: only update rollup_address + last_updated_at on conflict
    if (nullView.addresses.length > 0) {
      const affected: number = await prisma.$executeRawUnsafe(
        `INSERT INTO "Validator" ("address", "validator_hex_index", "rollup_address", "status", "first_seen_at", "last_updated_at")
         SELECT * FROM unnest($1::varchar(42)[], $2::varchar(66)[], $3::varchar(42)[], $4::varchar(20)[], $5::timestamp[], $6::timestamp[])
         ON CONFLICT ("address") DO UPDATE SET
           "rollup_address" = EXCLUDED."rollup_address",
           "last_updated_at" = EXCLUDED."last_updated_at"`,
        nullView.addresses,
        nullView.hexIndexes,
        nullView.rollups,
        nullView.addresses.map(() => 'unknown'),
        nullView.addresses.map(() => now),
        nullView.addresses.map(() => now),
      );
      totalAffected += affected;
      logger.info(`Bulk upsert [null-view]: ${affected} rows`);
    }

    // Full-view: update status, balance, withdrawer on conflict
    if (fullView.addresses.length > 0) {
      const affected: number = await prisma.$executeRawUnsafe(
        `INSERT INTO "Validator" ("address", "validator_hex_index", "rollup_address", "status", "stake_balance", "withdrawer_address", "first_seen_at", "last_updated_at")
         SELECT * FROM unnest($1::varchar(42)[], $2::varchar(66)[], $3::varchar(42)[], $4::varchar(20)[], $5::numeric[], $6::varchar(42)[], $7::timestamp[], $8::timestamp[])
         ON CONFLICT ("address") DO UPDATE SET
           "rollup_address" = EXCLUDED."rollup_address",
           "status" = EXCLUDED."status",
           "stake_balance" = EXCLUDED."stake_balance",
           "withdrawer_address" = EXCLUDED."withdrawer_address",
           "last_updated_at" = EXCLUDED."last_updated_at"`,
        fullView.addresses,
        fullView.hexIndexes,
        fullView.rollups,
        fullView.statuses,
        fullView.balances,
        fullView.withdrawers,
        fullView.addresses.map(() => now),
        fullView.addresses.map(() => now),
      );
      totalAffected += affected;
      logger.info(`Bulk upsert [full-view]: ${affected} rows`);
    }

    logger.info(`Bulk upserted ${totalAffected} validators (${nullView.addresses.length} null-view, ${fullView.addresses.length} full-view)`);
    return totalAffected;
  }
}
