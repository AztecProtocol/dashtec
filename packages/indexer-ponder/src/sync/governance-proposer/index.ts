import { prisma } from '../../lib/prisma';
import { createLogger } from '@dashtec/shared-utils';
import {
  SyncSignalCastParams,
  SyncPayloadSubmittableParams,
  SyncPayloadSubmittedParams,
} from './types';

const logger = createLogger('GovernanceProposerSync');

/**
 * Sync SignalCast event to Prisma (ProposerVote table)
 */
export async function syncSignalCast(params: SyncSignalCastParams): Promise<void> {
  try {
    await prisma.proposerVote.upsert({
      where: {
        unique_vote_transaction_log: {
          transaction_hash: params.transactionHash,
          log_index: params.logIndex,
        },
      },
      create: {
        vote_type: 'GOVERNANCE_PROPOSER',
        signaler_address: params.signalerAddress,
        payload_address: params.payloadAddress,
        round_number: params.roundNumber,
        slot_number: null,
        epoch_number: null,
        block_number: params.blockNumber,
        transaction_hash: params.transactionHash,
        log_index: params.logIndex,
        timestamp: params.timestamp,
        vote_date: new Date(Number(params.voteDate) * 1000),
        contract_address: params.contractAddress,
      },
      update: {
        signaler_address: params.signalerAddress,
        payload_address: params.payloadAddress,
        round_number: params.roundNumber,
        block_number: params.blockNumber,
        timestamp: params.timestamp,
        vote_date: new Date(Number(params.voteDate) * 1000),
        contract_address: params.contractAddress,
      },
    });

    logger.debug(
      `SignalCast synced: round ${params.roundNumber}, signaler ${params.signalerAddress}, payload ${params.payloadAddress}`
    );
  } catch (error) {
    logger.error('Error syncing SignalCast', { error });
    throw error;
  }
}

/**
 * Sync PayloadSubmittable event to Prisma
 */
export async function syncPayloadSubmittable(params: SyncPayloadSubmittableParams): Promise<void> {
  try {
    await prisma.proposerPayloadSubmittable.upsert({
      where: {
        unique_proposer_payload_submittable_transaction_log: {
          transaction_hash: params.transactionHash,
          log_index: params.logIndex,
        },
      },
      create: {
        payload_address: params.payloadAddress,
        round_number: params.roundNumber,
        slot_number: null,
        epoch_number: null,
        block_number: params.blockNumber,
        transaction_hash: params.transactionHash,
        log_index: params.logIndex,
        timestamp: params.timestamp,
        contract_address: params.contractAddress,
      },
      update: {
        payload_address: params.payloadAddress,
        round_number: params.roundNumber,
        block_number: params.blockNumber,
        timestamp: params.timestamp,
        contract_address: params.contractAddress,
      },
    });

    logger.debug(
      `PayloadSubmittable synced: round ${params.roundNumber}, payload ${params.payloadAddress}`
    );
  } catch (error) {
    logger.error('Error syncing PayloadSubmittable', { error });
    throw error;
  }
}

/**
 * Sync PayloadSubmitted event to Prisma
 */
export async function syncPayloadSubmitted(params: SyncPayloadSubmittedParams): Promise<void> {
  try {
    await prisma.proposerPayloadSubmitted.upsert({
      where: {
        unique_proposer_payload_submitted_transaction_log: {
          transaction_hash: params.transactionHash,
          log_index: params.logIndex,
        },
      },
      create: {
        payload_address: params.payloadAddress,
        round_number: params.roundNumber,
        slot_number: null,
        epoch_number: null,
        block_number: params.blockNumber,
        transaction_hash: params.transactionHash,
        log_index: params.logIndex,
        timestamp: params.timestamp,
        contract_address: params.contractAddress,
        submitter_address: params.submitterAddress,
      },
      update: {
        payload_address: params.payloadAddress,
        round_number: params.roundNumber,
        block_number: params.blockNumber,
        timestamp: params.timestamp,
        contract_address: params.contractAddress,
        submitter_address: params.submitterAddress,
      },
    });

    logger.debug(
      `PayloadSubmitted synced: round ${params.roundNumber}, payload ${params.payloadAddress}, submitter ${params.submitterAddress}`
    );
  } catch (error) {
    logger.error('Error syncing PayloadSubmitted', { error });
    throw error;
  }
}
