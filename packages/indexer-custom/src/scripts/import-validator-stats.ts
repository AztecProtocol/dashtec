#!/usr/bin/env tsx
/**
 * Import Validator Stats from JSON file or Aztec RPC
 *
 * This script reads validator stats from a JSON file or fetches from Aztec RPC
 * and imports them to the database using the same logic as ValidatorStatsCollector.
 *
 * Usage:
 *   pnpm import:validator-stats [path-to-json]
 *   pnpm import:validator-stats --rpc <rpc-url>
 *
 * Example:
 *   pnpm import:validator-stats ../../sentinel.json
 *   pnpm import:validator-stats --rpc https://api.aztec.network
 */

import { ValidatorService } from '../services/ValidatorService';
import { EpochService } from '../services/EpochService';
import { RollupConfigService } from '../services/RollupConfigService';
import { EpochIntegrityStatsService } from '../services/EpochIntegrityStatsService';
import { createLogger } from '@dashtec/shared-utils';
import { createAztecRpcClient, createAztecMethods, ValidatorsStatsResult } from '@dashtec/aztec-rpc-sdk';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const logger = createLogger('ImportValidatorStats');

// Configuration
const BATCH_SIZE = Number(process.env.IMPORT_BATCH_SIZE) || 10;
const MAX_PAST_EPOCHS = Number(process.env.IMPORT_MAX_PAST_EPOCHS) || 0; // 0 = all epochs
const RPC_TIMEOUT = Number(process.env.RPC_TIMEOUT) || 60000;

interface ImportStats {
  totalValidators: number;
  processedValidators: number;
  failedValidators: number;
  totalEpochsTouched: number;
  startTime: number;
}

async function loadJsonFile(filePath: string): Promise<ValidatorsStatsResult> {
  const basePath = process.env.INIT_CWD || process.cwd();
  const absolutePath = filePath.startsWith('/') ? filePath : resolve(basePath, filePath);

  logger.info(`Resolving path: ${filePath} -> ${absolutePath}`);

  if (!existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  logger.info(`Loading JSON from: ${absolutePath}`);
  const fileContent = readFileSync(absolutePath, 'utf-8');
  const data = JSON.parse(fileContent);

  // Handle both wrapped { result: {...} } and direct format
  const result = data.result || data;

  if (!result?.stats || !result?.lastProcessedSlot) {
    throw new Error('Invalid JSON structure. Expected { stats: {...}, lastProcessedSlot: "..." }');
  }

  return result as ValidatorsStatsResult;
}

async function fetchFromRpc(rpcUrl: string): Promise<ValidatorsStatsResult> {
  logger.info(`Fetching validator stats from RPC: ${rpcUrl}`);

  const client = createAztecRpcClient({ url: rpcUrl, timeout: RPC_TIMEOUT });
  const aztec = createAztecMethods(client);

  const result = await aztec.getValidatorsStats();

  if (!result?.stats || !result?.lastProcessedSlot) {
    throw new Error('Invalid RPC response');
  }

  logger.info(`Fetched ${Object.keys(result.stats).length} validators from RPC`);
  return result;
}

async function processValidatorStats(
  statsResult: ValidatorsStatsResult,
  validatorService: ValidatorService,
  epochService: EpochService,
  rollupConfigService: RollupConfigService,
  importStats: ImportStats
): Promise<void> {
  const { stats, lastProcessedSlot } = statsResult;

  const slotsPerEpoch = await rollupConfigService.getSlotsPerEpoch();
  const currentEpochFromRpc = BigInt(lastProcessedSlot) / slotsPerEpoch;

  logger.info(`Stats info:`, {
    lastProcessedSlot,
    currentEpoch: currentEpochFromRpc.toString(),
    slotsPerEpoch: slotsPerEpoch.toString(),
  });

  const validatorAddresses = Object.keys(stats);
  importStats.totalValidators = validatorAddresses.length;

  logger.info(`Processing ${importStats.totalValidators} validators in batches of ${BATCH_SIZE}`);

  const allProcessedEpochs = new Set<bigint>();

  // Process validators in batches
  for (let i = 0; i < validatorAddresses.length; i += BATCH_SIZE) {
    const batchAddresses = validatorAddresses.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(validatorAddresses.length / BATCH_SIZE);

    const batchPromises = batchAddresses.map(async (address) => {
      try {
        const validatorData = stats[address];
        const epochsTouched = await validatorService.processValidatorStats(
          validatorData,
          currentEpochFromRpc,
          slotsPerEpoch,
          MAX_PAST_EPOCHS,
          epochService
        );
        return { success: true, epochsTouched };
      } catch (error) {
        logger.error(`Failed to process validator ${address}`, { error });
        return { success: false, epochsTouched: new Set<bigint>() };
      }
    });

    const results = await Promise.all(batchPromises);

    results.forEach((result) => {
      if (result.success) {
        importStats.processedValidators++;
        result.epochsTouched.forEach((epoch) => allProcessedEpochs.add(epoch));
      } else {
        importStats.failedValidators++;
      }
    });

    const progress = Math.floor(((i + batchAddresses.length) / validatorAddresses.length) * 100);
    const elapsed = ((Date.now() - importStats.startTime) / 1000).toFixed(1);
    logger.info(`Batch ${batchNumber}/${totalBatches} complete | Progress: ${progress}% | Elapsed: ${elapsed}s`);
  }

  // Update epoch aggregates
  importStats.totalEpochsTouched = allProcessedEpochs.size;

  if (allProcessedEpochs.size > 0) {
    logger.info(`Updating aggregates for ${allProcessedEpochs.size} epochs...`);
    const epochNumbers = Array.from(allProcessedEpochs).sort((a, b) => Number(a - b));

    for (let i = 0; i < epochNumbers.length; i += BATCH_SIZE) {
      const epochBatch = epochNumbers.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        epochBatch.map((epochNumber) => epochService.updateEpochAggregates(epochNumber))
      );

      const progress = Math.floor(((i + epochBatch.length) / epochNumbers.length) * 100);
      logger.info(`Epoch aggregates: ${progress}% complete`);
    }

    logger.info('Finished updating epoch aggregates');

    // Update epoch integrity stats
    logger.info(`Updating integrity stats for ${epochNumbers.length} epochs...`);
    const epochIntegrityService = new EpochIntegrityStatsService();
    const slotsPerEpochNum = Number(slotsPerEpoch);

    for (let i = 0; i < epochNumbers.length; i += BATCH_SIZE) {
      const epochBatch = epochNumbers.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        epochBatch.map(async (epochNumber) => {
          // Get expected validators from epoch committee
          const epochCommittee = await rollupConfigService.getEpochCommittee(epochNumber);
          const expectedValidatorsPerEpoch = epochCommittee.length;
          return epochIntegrityService.analyzeAndSave(epochNumber, expectedValidatorsPerEpoch, slotsPerEpochNum);
        })
      );

      const progress = Math.floor(((i + epochBatch.length) / epochNumbers.length) * 100);
      logger.info(`Epoch integrity: ${progress}% complete`);
    }

    logger.info('Finished updating epoch integrity stats');
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse args
  let rpcUrl: string | null = null;
  let filePath: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--rpc' && args[i + 1]) {
      rpcUrl = args[i + 1];
      i++;
    } else if (!args[i].startsWith('--')) {
      filePath = args[i];
    }
  }

  if (!rpcUrl && !filePath) {
    logger.error('Usage: pnpm import:validator-stats [path-to-json] OR --rpc <rpc-url>');
    process.exit(1);
  }

  logger.info('='.repeat(60));
  logger.info('Validator Stats Import Script');
  logger.info(`Source: ${rpcUrl ? `RPC (${rpcUrl})` : `File (${filePath})`}`);
  logger.info('='.repeat(60));

  const importStats: ImportStats = {
    totalValidators: 0,
    processedValidators: 0,
    failedValidators: 0,
    totalEpochsTouched: 0,
    startTime: Date.now(),
  };

  try {
    // Load data from JSON file or RPC
    const statsData = rpcUrl
      ? await fetchFromRpc(rpcUrl)
      : await loadJsonFile(filePath!);

    const validatorCount = Object.keys(statsData.stats).length;
    logger.info(`Loaded ${validatorCount} validators`);

    // Initialize services
    const validatorService = new ValidatorService();
    const epochService = new EpochService();
    const rollupConfigService = RollupConfigService.getInstance();

    // Process stats
    await processValidatorStats(
      statsData,
      validatorService,
      epochService,
      rollupConfigService,
      importStats
    );

    // Summary
    const totalTime = ((Date.now() - importStats.startTime) / 1000).toFixed(2);

    logger.info('='.repeat(60));
    logger.info('Import Summary');
    logger.info('='.repeat(60));
    logger.info(`Total validators:       ${importStats.totalValidators}`);
    logger.info(`Successfully processed: ${importStats.processedValidators}`);
    logger.info(`Failed:                 ${importStats.failedValidators}`);
    logger.info(`Epochs touched:         ${importStats.totalEpochsTouched}`);
    logger.info(`Total time:             ${totalTime}s`);
    logger.info('='.repeat(60));

    if (importStats.failedValidators > 0) {
      logger.warn(`${importStats.failedValidators} validators failed to process.`);
      process.exit(1);
    }

    logger.info('Import completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Import failed', { error });
    process.exit(1);
  }
}

main();
