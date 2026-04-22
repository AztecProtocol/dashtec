import { createLogger, createRpcClient, mapStatusToString, getValidatorHexIndex } from '@dashtec/shared-utils';
import { config } from '../../config';
import { validatorExists, upsertValidator } from './index';
import { Address } from 'viem';
import { RollupABI } from '@dashtec/shared-types/abis';
import type { IndexingFunctionArgs } from 'ponder:registry';
import prisma from '../../lib/prisma';

const logger = createLogger('ValidatorBootstrapService');

interface BootstrapValidatorParams {
  client: IndexingFunctionArgs['context']['client'];
  attesterAddress: Address;
  withdrawerAddress: Address;
  timestamp: bigint;
}

/*
 * Bootstrap validator on first deposit if it doesn't exist yet
 * Fetches contract state from Rollup contract and creates initial validator record
 */
export async function bootstrapValidatorOnDeposit(params: BootstrapValidatorParams): Promise<void> {
  const { client, attesterAddress, withdrawerAddress, timestamp } = params;

  // Check if validator already exists
  const exists = await validatorExists(attesterAddress);
  if (exists) {
    logger.info(`Validator ${attesterAddress} already exists, skipping bootstrap & updating activation date`);
    await prisma.validator.update({
      where: { address: attesterAddress },
      data: {
        activation_date: new Date(Number(timestamp) * 1000),
      },
    });
    return;
  }

  try {
    // Fetch validator state from Rollup contract
    const attesterView = await client.readContract({
      address: config.ROLLUP_CONTRACT_ADDRESS as Address,
      abi: RollupABI,
      functionName: 'getAttesterView',
      args: [attesterAddress]
    }) as any;

    // Only create validator if active in contract (status != None)
    if (attesterView) {
      const status = mapStatusToString(Number(attesterView.status));
      const stakeBalance = attesterView.effectiveBalance;
      const validatorHexIndex = getValidatorHexIndex(attesterAddress);

      await upsertValidator({
        address: attesterAddress,
        validatorHexIndex,
        status,
        stakeBalance,
        withdrawerAddress,
        activationDate: new Date(Number(timestamp) * 1000),
      });

      logger.info(`Bootstrapped validator ${attesterAddress} with status ${status}`);
    } else {
      logger.warn(`Validator ${attesterAddress} not found in contract, skipping bootstrap`);
    }
  } catch (error) {
    logger.error(`Failed to bootstrap validator ${attesterAddress}`, { error });
    // Fail silently - validator will be picked up by other collectors
  }
}
