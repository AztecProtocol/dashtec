import prisma from '@/lib/prisma';
import { ProposerVoteType, SLASHING_PROPOSER, CHECKPOINT_MINED, CHECKPOINT_PROPOSED, CHECKPOINT_MISSED, BLOCKS_MISSED, ATTESTATION_SENT, ATTESTATION_MISSED } from '@dashtec/shared-types';
import type { ProposalHistoryEntry, AttestationHistoryEntry, VotingHistoryEntry, TallyVotingHistoryEntry, ValidatorHistoryEnum } from '@/types';
import { getRollupBlockRange } from '@/lib/rollupParam';

/** Fetch recent proposal history with L2 block data */
export async function fetchProposalHistory(address: string, rollupAddresses: string[]): Promise<ProposalHistoryEntry[]> {
  const proposals = await prisma.validatorAttestation.findMany({
    where: {
      validator_address: address,
      rollup_address: { in: rollupAddresses },
      status: { in: [CHECKPOINT_PROPOSED, CHECKPOINT_MINED, CHECKPOINT_MISSED, BLOCKS_MISSED] },
    },
    orderBy: { slot_number: 'desc' },
    take: 10,
  });

  const withBlocks = await Promise.all(proposals.map(async p => {
    const block = await prisma.l2BlockProposed.findFirst({
      where: { slot_number: p.slot_number, rollup_address: { in: rollupAddresses } },
    });
    return {
      epoch: Number(p.epoch_number),
      slot: Number(p.slot_number),
      status: p.status.toLocaleLowerCase() as ValidatorHistoryEnum,
      l1TransactionHash: block?.transaction_hash,
      l2BlockNumber: Number(block?.l2_block_number),
    };
  }));

  return withBlocks;
}

/** Fetch recent attestation history */
export async function fetchAttestationHistory(address: string, rollupAddresses: string[]): Promise<AttestationHistoryEntry[]> {
  const attestations = await prisma.validatorAttestation.findMany({
    where: {
      validator_address: address,
      rollup_address: { in: rollupAddresses },
      status: { in: [ATTESTATION_SENT, ATTESTATION_MISSED] },
    },
    orderBy: { slot_number: 'desc' },
    take: 10,
  });

  return attestations.map(att => ({
    epoch: Number(att.epoch_number),
    slot: Number(att.slot_number),
    status: att.status.toLocaleLowerCase() === ATTESTATION_SENT ? 'Success' as const : 'Missed' as const,
  }));
}

/** Fetch governance voting history */
export async function fetchGovernanceVotingHistory(address: string, rollupAddresses: string[]): Promise<VotingHistoryEntry[]> {
  const blockRange = rollupAddresses?.length ? await getRollupBlockRange(rollupAddresses) : null;
  const blockFilter = blockRange ? {
    block_number: { gte: BigInt(blockRange.startBlock), ...(blockRange.endBlock ? { lt: BigInt(blockRange.endBlock) } : {}) }
  } : {};

  const votes = await prisma.proposerVote.findMany({
    where: { signaler_address: address, ...blockFilter },
    orderBy: { vote_date: 'desc' },
    take: 10,
  });

  return votes.map(vote => ({
    epoch: Number(vote.epoch_number),
    voted: true,
    timestamp: vote.vote_date ? vote.vote_date.toISOString() : new Date().toISOString(),
    slot_number: Number(vote.slot_number),
    round_number: Number(vote.round_number),
    proposal_address: vote.payload_address,
    vote_type: vote.vote_type as ProposerVoteType,
    transaction_hash: vote.transaction_hash,
  }));
}

/** Fetch tally/slashing voting history */
export async function fetchTallyVotingHistory(address: string, rollupAddresses: string[]): Promise<TallyVotingHistoryEntry[]> {
  const votes = await prisma.tallyVoteCast.findMany({
    where: { proposer_address: address, rollup_address: { in: rollupAddresses } },
    orderBy: { vote_date: 'desc' },
    take: 10,
  });

  return Promise.all(votes.map(async vote => {
    const payload = await prisma.tallyRoundExecuted.findFirst({
      where: { round_number: vote.round_number },
    });
    return {
      id: vote.id,
      round_number: vote.round_number,
      voted: true,
      timestamp: vote.vote_date ? vote.vote_date.toISOString() : vote.created_at.toISOString(),
      transaction_hash: vote.transaction_hash,
      block_number: String(vote.block_number),
      vote_type: SLASHING_PROPOSER,
      ...(payload && {
        payload: {
          address: payload.payload_address,
          transaction_hash: payload.transaction_hash,
          timestamp: payload.timestamp,
        },
      }),
    };
  }));
}
