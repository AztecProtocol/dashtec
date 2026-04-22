/**
 * Database queries for sequencer governance signals
 */

import { prisma } from '@/lib/prisma';
import { Prisma, ProposerVoteType } from '@dashtec/database';
import { getRollupBlockRange, rollupBlockRangeClause } from '@/lib/rollupParam';

export interface SequencerSignalData {
  payloadAddress: string;
  transactionHash: string;
  roundNumber: number;
  timestamp: number | null;
  slotNumber: number | null;
  l2BlockNumber: string | null;
  coinbase: string | null;
}

/**
 * Get governance signals filtered by sequencer address and optionally by payload address
 * Joins with L2ProposedBlock to get l2BlockNumber/coinbase and ValidatorAttestation to get epoch/slot
 */
export async function getFilteredSequencerSignals(
  sequencerAddress: string,
  roundNumber: number,
  payloadAddress?: string,
  rollupAddresses?: string[]
): Promise<SequencerSignalData[]> {
  const blockRange = rollupAddresses?.length ? await getRollupBlockRange(rollupAddresses) : null;
  const blockRangeRaw = blockRange
    ? Prisma.sql`AND ${rollupBlockRangeClause('pv', blockRange)}`
    : Prisma.empty;

  const signals = await prisma.$queryRaw<Array<{
    payload_address: string;
    transaction_hash: string;
    round_number: number;
    timestamp: number | null;
    slot_number: number | null;
    l2_block_number: string | null;
    coinbase: string | null;
  }>>`
    SELECT
      pv.payload_address,
      pv.transaction_hash,
      pv.round_number,
      pv.timestamp,
      l2pb.slot_number,
      l2pb.l2_block_number,
      l2pb.coinbase
    FROM "ProposerVote" pv
    LEFT JOIN LATERAL (
      SELECT slot_number, l2_block_number, coinbase
      FROM "L2BlockProposed"
      WHERE transaction_hash = pv.transaction_hash
      ORDER BY log_index ASC
      LIMIT 1
    ) l2pb ON true
    WHERE pv.vote_type = ${ProposerVoteType.GOVERNANCE_PROPOSER}
      AND pv.signaler_address = ${sequencerAddress}
      AND pv.round_number = ${roundNumber}
      ${payloadAddress ? Prisma.sql`AND pv.payload_address = ${payloadAddress}` : Prisma.sql``}
      ${blockRangeRaw}
    ORDER BY pv.round_number ASC, pv.block_number ASC, pv.log_index ASC
  `;

  return signals.map(signal => ({
    payloadAddress: signal.payload_address,
    transactionHash: signal.transaction_hash,
    roundNumber: signal.round_number,
    timestamp: signal.timestamp,
    slotNumber: signal.slot_number,
    l2BlockNumber: signal.l2_block_number,
    coinbase: signal.coinbase,
  }));
}