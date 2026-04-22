import { prisma } from '../../lib/prisma';
import { createLogger } from '@dashtec/shared-utils';
import { AddToQueueParams, RemoveFromQueueParams } from './types';

const logger = createLogger('ValidatorQueueSync');

export async function addToQueue(params: AddToQueueParams): Promise<void> {
  try {
    await prisma.validatorQueue.upsert({
      where: {
        unique_validator_queue_transaction_log: {
          transaction_hash: params.transactionHash,
          log_index: params.logIndex,
        },
      },
      create: {
        attester_address: params.attesterAddress,
        withdrawer_address: params.withdrawerAddress,
        block_number: params.blockNumber,
        transaction_hash: params.transactionHash,
        log_index: params.logIndex,
        queued_at: new Date(Number(params.queuedAt) * 1000),
      },
      update: {
        attester_address: params.attesterAddress,
        withdrawer_address: params.withdrawerAddress,
        block_number: params.blockNumber,
        queued_at: new Date(Number(params.queuedAt) * 1000),
      },
    });

    logger.debug(
      `ValidatorQueued: attester ${params.attesterAddress}, withdrawer ${params.withdrawerAddress}, added to queue`
    );
  } catch (error) {
    logger.error('Error adding to ValidatorQueue', { error });
    throw error;
  }
}

export async function updateValidatorActivation(attesterAddress: string, activationTimestamp: bigint): Promise<void> {
  try {
    await prisma.validator.update({
      where: {
        address: attesterAddress,
      },
      data: {
        activation_date: new Date(Number(activationTimestamp) * 1000),
      },
    });
    logger.debug(`Updated activation date for validator ${attesterAddress}`);
  } catch (error) {
    logger.error(`Error updating activation date for validator ${attesterAddress}`, { error });
    // We don't throw here to avoid failing the event processing if the validator record doesn't exist yet
  }
}

export async function removeFromQueue(params: RemoveFromQueueParams): Promise<void> {
  try {
    const oldestEntry = await prisma.validatorQueue.findFirst({
      where: {
        attester_address: params.attesterAddress,
        withdrawer_address: params.withdrawerAddress,
      },
      orderBy: {
        queued_at: 'asc',
      },
    });

    if (oldestEntry) {
      await prisma.validatorQueue.delete({
        where: {
          id: oldestEntry.id,
        },
      });

      logger.debug(
        `${params.eventType}: attester ${params.attesterAddress}, withdrawer ${params.withdrawerAddress}, removed from queue (FIFO)`
      );
    } else {
      logger.warn(
        `${params.eventType}: no matching ValidatorQueue entry found for attester ${params.attesterAddress}, withdrawer ${params.withdrawerAddress}`
      );
    }
  } catch (error) {
    logger.error(`Error removing from ValidatorQueue (${params.eventType})`, { error });
    throw error;
  }
}
