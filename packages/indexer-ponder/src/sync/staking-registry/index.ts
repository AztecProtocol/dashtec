import { prisma } from '../../lib/prisma';
import { createLogger } from '@dashtec/shared-utils';

const logger = createLogger('StakingRegistrySync');

export interface StakedWithProviderParams {
  providerIdentifier: string;
  rollupAddress: string;
  attesterAddress: string;
  coinbaseSplitContractAddress: string;
  stakerAddress: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
  timestamp: bigint;
}

export interface AttestersAddedToProviderParams {
  providerIdentifier: string;
  attesters: string[];
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
  timestamp: bigint;
}

export interface ProviderRegisteredParams {
  providerIdentifier: string;
  providerAdmin: string;
  providerTakeRate: number;
  providerRewardsRecipient: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
  timestamp: bigint;
}

export interface ProviderQueueDrippedParams {
  providerIdentifier: string;
  attesterAddress: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
  timestamp: bigint;
}

export interface ProviderTakeRateUpdatedParams {
  providerIdentifier: string;
  newTakeRate: number;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
  timestamp: bigint;
}

export interface ProviderRewardsRecipientUpdatedParams {
  providerIdentifier: string;
  newRewardsRecipient: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
  timestamp: bigint;
}

export interface ProviderAdminUpdatedParams {
  providerIdentifier: string;
  newAdmin: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
  timestamp: bigint;
}

/**
 * Sync StakedWithProvider event to Prisma
 */
export async function syncStakedWithProvider(params: StakedWithProviderParams): Promise<void> {
  try {
    await prisma.stakedWithProvider.upsert({
      where: {
        txHash_logIndex: {
          txHash: params.transactionHash,
          logIndex: parseInt(params.logIndex),
        },
      },
      create: {
        providerIdentifier: params.providerIdentifier,
        rollupAddress: params.rollupAddress,
        attesterAddress: params.attesterAddress,
        coinbaseSplitContractAddress: params.coinbaseSplitContractAddress,
        stakerAddress: params.stakerAddress,
        blockNumber: BigInt(params.blockNumber),
        txHash: params.transactionHash,
        logIndex: parseInt(params.logIndex),
        timestamp: params.timestamp,
      },
      update: {
        providerIdentifier: params.providerIdentifier,
        rollupAddress: params.rollupAddress,
        attesterAddress: params.attesterAddress,
        coinbaseSplitContractAddress: params.coinbaseSplitContractAddress,
        stakerAddress: params.stakerAddress,
        blockNumber: BigInt(params.blockNumber),
        timestamp: params.timestamp,
      },
    });
  } catch (error) {
    logger.error('Error syncing StakedWithProvider', { error, params });
    throw error;
  }
}

/**
 * Sync AttestersAddedToProvider event to Prisma
 * Creates one ProviderAttester record per attester in the array
 */
export async function syncAttestersAddedToProvider(params: AttestersAddedToProviderParams): Promise<void> {
  try {
    // Create one record per attester
    for (const attester of params.attesters) {
      await prisma.providerAttester.upsert({
        where: {
          txHash_logIndex_providerIdentifier_attesterAddress: {
            txHash: params.transactionHash,
            logIndex: parseInt(params.logIndex),
            providerIdentifier: params.providerIdentifier,
            attesterAddress: attester,
          },
        },
        create: {
          providerIdentifier: params.providerIdentifier,
          attesterAddress: attester,
          blockNumber: BigInt(params.blockNumber),
          txHash: params.transactionHash,
          logIndex: parseInt(params.logIndex),
          timestamp: params.timestamp,
        },
        update: {
          blockNumber: BigInt(params.blockNumber),
          timestamp: params.timestamp,
        },
      });
    }
  } catch (error) {
    logger.error('Error syncing AttestersAddedToProvider', { error, params });
    throw error;
  }
}

/**
 * Sync ProviderRegistered event to Prisma
 * Creates or updates the Provider model
 */
export async function syncProviderRegistered(params: ProviderRegisteredParams): Promise<void> {
  try {
    await prisma.provider.upsert({
      where: {
        providerIdentifier: params.providerIdentifier,
      },
      create: {
        providerIdentifier: params.providerIdentifier,
        providerAdmin: params.providerAdmin,
        providerTakeRate: params.providerTakeRate,
        rewardsRecipient: params.providerRewardsRecipient,
        blockNumber: BigInt(params.blockNumber),
        txHash: params.transactionHash,
        logIndex: parseInt(params.logIndex),
        timestamp: params.timestamp,
      },
      update: {
        providerAdmin: params.providerAdmin,
        providerTakeRate: params.providerTakeRate,
        blockNumber: BigInt(params.blockNumber),
        txHash: params.transactionHash,
        logIndex: parseInt(params.logIndex),
        timestamp: params.timestamp,
      },
    });
  } catch (error) {
    logger.error('Error syncing ProviderRegistered', { error, params });
    throw error;
  }
}

/**
 * Sync ProviderQueueDripped event to Prisma
 */
export async function syncProviderQueueDripped(params: ProviderQueueDrippedParams): Promise<void> {
  try {
    await prisma.providerQueueDrip.upsert({
      where: {
        txHash_logIndex: {
          txHash: params.transactionHash,
          logIndex: parseInt(params.logIndex),
        },
      },
      create: {
        providerIdentifier: params.providerIdentifier,
        attesterAddress: params.attesterAddress,
        blockNumber: BigInt(params.blockNumber),
        txHash: params.transactionHash,
        logIndex: parseInt(params.logIndex),
        timestamp: params.timestamp,
      },
      update: {
        providerIdentifier: params.providerIdentifier,
        attesterAddress: params.attesterAddress,
        blockNumber: BigInt(params.blockNumber),
        timestamp: params.timestamp,
      },
    });
  } catch (error) {
    logger.error('Error syncing ProviderQueueDripped', { error, params });
    throw error;
  }
}

/**
 * Sync ProviderTakeRateUpdated event to Prisma
 * Updates the providerTakeRate field in the Provider model
 */
export async function syncProviderTakeRateUpdated(params: ProviderTakeRateUpdatedParams): Promise<void> {
  try {
    await prisma.provider.update({
      where: {
        providerIdentifier: params.providerIdentifier,
      },
      data: {
        providerTakeRate: params.newTakeRate,
        blockNumber: BigInt(params.blockNumber),
        txHash: params.transactionHash,
        logIndex: parseInt(params.logIndex),
        timestamp: params.timestamp,
      },
    });
  } catch (error) {
    logger.error('Error syncing ProviderTakeRateUpdated', { error, params });
    throw error;
  }
}

/**
 * Sync ProviderRewardsRecipientUpdated event to Prisma
 * Updates the rewardsRecipient field in the Provider model
 */
export async function syncProviderRewardsRecipientUpdated(params: ProviderRewardsRecipientUpdatedParams): Promise<void> {
  try {
    await prisma.provider.update({
      where: {
        providerIdentifier: params.providerIdentifier,
      },
      data: {
        rewardsRecipient: params.newRewardsRecipient,
        blockNumber: BigInt(params.blockNumber),
        txHash: params.transactionHash,
        logIndex: parseInt(params.logIndex),
        timestamp: params.timestamp,
      },
    });
  } catch (error) {
    logger.error('Error syncing ProviderRewardsRecipientUpdated', { error, params });
    throw error;
  }
}

/**
 * Sync ProviderAdminUpdated event to Prisma
 * Updates the providerAdmin field in the Provider model
 */
export async function syncProviderAdminUpdated(params: ProviderAdminUpdatedParams): Promise<void> {
  try {
    await prisma.provider.update({
      where: {
        providerIdentifier: params.providerIdentifier,
      },
      data: {
        providerAdmin: params.newAdmin,
        blockNumber: BigInt(params.blockNumber),
        txHash: params.transactionHash,
        logIndex: parseInt(params.logIndex),
        timestamp: params.timestamp,
      },
    });
  } catch (error) {
    logger.error('Error syncing ProviderAdminUpdated', { error, params });
    throw error;
  }
}
