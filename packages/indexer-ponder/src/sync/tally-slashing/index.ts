import { prisma } from '../../lib/prisma';
import { createLogger, normalizeAddress } from '@dashtec/shared-utils';
import {
  SyncVoteCastParams,
  SyncRoundExecutedParams,
  SyncSlashSlashedParams,
  SyncTallySlashTargetCommitteesParams,
  SyncTallySlashActionsParams,
} from './types';
import { computeEpochFromSlot } from './service';

const logger = createLogger('TallySlashingSync');

export async function syncVoteCast(params: SyncVoteCastParams): Promise<void> {
  try {
    const epochNumber = await computeEpochFromSlot(params.client, params.slotNumber);

    await prisma.tallyVoteCast.upsert({
      where: {
        unique_tally_vote_cast_transaction_log: {
          transaction_hash: params.transactionHash,
          log_index: params.logIndex,
        },
      },
      create: {
        round_number: params.roundNumber,
        slot_number: params.slotNumber,
        proposer_address: params.proposerAddress,
        epoch_number: epochNumber,
        block_number: params.blockNumber,
        transaction_hash: params.transactionHash,
        log_index: params.logIndex,
        timestamp: params.timestamp,
        vote_date: new Date(Number(params.voteDate) * 1000),
        contract_address: params.contractAddress,
      },
      update: {
        round_number: params.roundNumber,
        slot_number: params.slotNumber,
        proposer_address: params.proposerAddress,
        epoch_number: epochNumber,
        block_number: params.blockNumber,
        timestamp: params.timestamp,
        vote_date: new Date(Number(params.voteDate) * 1000),
        contract_address: params.contractAddress,
      },
    });

    logger.debug(`TallyVoteCast synced: round ${params.roundNumber}, proposer ${params.proposerAddress}`);
  } catch (error) {
    logger.error('Error syncing TallyVoteCast', { error });
    throw error;
  }
}

export async function syncRoundExecuted(params: SyncRoundExecutedParams): Promise<void> {
  try {
    const voteCount = await prisma.tallyVoteCast.count({
      where: {
        round_number: params.roundNumber,
      },
    });

    await prisma.tallyRoundExecuted.upsert({
      where: {
        unique_tally_round_executed_transaction_log: {
          transaction_hash: params.transactionHash,
          log_index: params.logIndex,
        },
      },
      create: {
        round_number: params.roundNumber,
        slash_count: params.slashCount,
        slot_number: null,
        epoch_number: null,
        payload_address: params.payloadAddress,
        total_slash_amount: params.totalSlashAmount,
        vote_count: voteCount,
        quorum_threshold: null,
        block_number: params.blockNumber,
        transaction_hash: params.transactionHash,
        log_index: params.logIndex,
        timestamp: params.timestamp,
        executed_date: new Date(Number(params.executedDate) * 1000),
        contract_address: params.contractAddress,
      },
      update: {
        round_number: params.roundNumber,
        slash_count: params.slashCount,
        payload_address: params.payloadAddress,
        total_slash_amount: params.totalSlashAmount,
        vote_count: voteCount,
        block_number: params.blockNumber,
        timestamp: params.timestamp,
        executed_date: new Date(Number(params.executedDate) * 1000),
        contract_address: params.contractAddress,
      },
    });

    logger.debug(`TallyRoundExecuted synced: round ${params.roundNumber}, slashCount ${params.slashCount}`);
  } catch (error) {
    logger.error('Error syncing TallyRoundExecuted', { error });
    throw error;
  }
}

export async function syncSlashSlashed(params: SyncSlashSlashedParams): Promise<void> {
  try {
    const recentRound = await prisma.tallyRoundExecuted.findFirst({
      where: {
        block_number: {
          lte: params.blockNumber,
        },
      },
      orderBy: [
        { block_number: 'desc' },
        { log_index: 'desc' },
      ],
    });

    const payloadAddress = recentRound?.payload_address || null;

    await prisma.slashSlashed.upsert({
      where: {
        unique_slash_slashed_transaction_log: {
          transaction_hash: params.transactionHash,
          log_index: params.logIndex,
        },
      },
      create: {
        payload_address: payloadAddress,
        attester_address: params.attesterAddress,
        amount: params.amount,
        block_number: params.blockNumber,
        transaction_hash: params.transactionHash,
        log_index: params.logIndex,
        timestamp: params.timestamp,
        slashed_date: new Date(Number(params.slashedDate) * 1000),
        contract_address: params.contractAddress,
      },
      update: {
        payload_address: payloadAddress,
        attester_address: params.attesterAddress,
        amount: params.amount,
        block_number: params.blockNumber,
        timestamp: params.timestamp,
        slashed_date: new Date(Number(params.slashedDate) * 1000),
        contract_address: params.contractAddress,
      },
    });

    logger.debug(`SlashSlashed synced: attester ${params.attesterAddress}, amount ${params.amount}`);
  } catch (error) {
    logger.error('Error syncing SlashSlashed', { error });
    throw error;
  }
}

export async function syncTallySlashTargetCommittees(
  params: SyncTallySlashTargetCommitteesParams
): Promise<void> {
  try {
    const { roundNumber, committees, contractAddress, rollupInstance, rollupAddress, blockNumber } = params;

    for (let epochIndex = 0; epochIndex < committees.length; epochIndex++) {
      const committee = committees[epochIndex];
      const normalizedMembers = committee.map((addr) => normalizeAddress(addr));

      // Calculate target epoch - committee at index 0 is for current epoch - 1, index 1 is for current epoch - 2, etc.
      const targetEpochNumber = BigInt(roundNumber - epochIndex - 1);

      await prisma.tallySlashTargetCommittee.upsert({
        where: {
          unique_slash_target_committee: {
            round_number: roundNumber,
            epoch_index: epochIndex,
            rollup_address: normalizeAddress(rollupAddress),
          },
        },
        create: {
          round_number: roundNumber,
          epoch_index: epochIndex,
          target_epoch_number: targetEpochNumber,
          committee_members: normalizedMembers,
          committee_size: committee.length,
          block_number: blockNumber,
          contract_address: normalizeAddress(contractAddress),
          rollup_instance: normalizeAddress(rollupInstance),
          rollup_address: normalizeAddress(rollupAddress),
        },
        update: {
          target_epoch_number: targetEpochNumber,
          committee_members: normalizedMembers,
          committee_size: committee.length,
          block_number: blockNumber,
          contract_address: normalizeAddress(contractAddress),
          rollup_instance: normalizeAddress(rollupInstance),
        },
      });
    }

    logger.debug(
      `TallySlashTargetCommittees synced: round ${roundNumber}, ${committees.length} committees`
    );
  } catch (error) {
    logger.error('Error syncing TallySlashTargetCommittees', { error });
    throw error;
  }
}

export async function syncTallySlashActions(
  params: SyncTallySlashActionsParams
): Promise<void> {
  try {
    const {
      roundNumber,
      tallyResults,
      payloadAddress,
      deploymentTxHash,
      deploymentBlock,
      executedAt,
      contractAddress,
      tallyBlockNumber,
      rollupAddress,
    } = params;

    for (let actionIndex = 0; actionIndex < tallyResults.length; actionIndex++) {
      const action = tallyResults[actionIndex];
      const validatorAddress = normalizeAddress(action.attester);

      await prisma.tallySlashAction.upsert({
        where: {
          unique_slash_action_per_round: {
            round_number: roundNumber,
            action_index: actionIndex,
            validator_address: validatorAddress,
            rollup_address: normalizeAddress(rollupAddress),
          },
        },
        create: {
          round_number: roundNumber,
          action_index: actionIndex,
          validator_address: validatorAddress,
          slash_amount: action.amount.toString(),
          vote_count: null,
          quorum_threshold: null,
          payload_address: payloadAddress ? normalizeAddress(payloadAddress) : null,
          deployment_tx_hash: deploymentTxHash,
          deployment_block: deploymentBlock,
          executed_at: executedAt,
          contract_address: normalizeAddress(contractAddress),
          tally_block_number: tallyBlockNumber,
          rollup_address: normalizeAddress(rollupAddress),
        },
        update: {
          slash_amount: action.amount.toString(),
          payload_address: payloadAddress ? normalizeAddress(payloadAddress) : null,
          deployment_tx_hash: deploymentTxHash,
          deployment_block: deploymentBlock,
          executed_at: executedAt,
          contract_address: normalizeAddress(contractAddress),
          tally_block_number: tallyBlockNumber,
        },
      });
    }

    logger.debug(
      `TallySlashActions synced: round ${roundNumber}, ${tallyResults.length} actions`
    );
  } catch (error) {
    logger.error('Error syncing TallySlashActions', { error });
    throw error;
  }
}
