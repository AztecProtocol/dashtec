import prisma from '@/lib/prisma'

/**
 * Calculate network-wide statistics for a given round
 * This includes total signals, total sequencers, active signaling sequencers, and total proposer slots
 */
export async function calculateNetworkStats(
  roundNumber: number,
  proposerSlotCounts: Map<string, number>
): Promise<{
  totalNetworkSignals: number;
  totalNetworkSequencers: number;
  totalNetworkActiveSignalingSequencers: number;
  totalNetworkProposerSlots: number;
}> {
  // Query for all signals in this round
  const signals = await prisma.proposerVote.findMany({
    where: { round_number: roundNumber },
    select: {
      signaler_address: true,
      payload_address: true,
    },
  });

  // Query for all validators (sequencers)
  const validators = await prisma.validator.findMany({
    select: { address: true },
  });

  // Calculate totals
  const totalNetworkSignals = signals.length;
  const totalNetworkSequencers = validators.length;
  const uniqueSignalers = new Set(signals.map(s => s.signaler_address.toLowerCase()));
  const totalNetworkActiveSignalingSequencers = uniqueSignalers.size;

  // Calculate total network proposer slots
  const totalNetworkProposerSlots = Array.from(proposerSlotCounts.values())
    .reduce((sum, count) => sum + count, 0);

  return {
    totalNetworkSignals,
    totalNetworkSequencers,
    totalNetworkActiveSignalingSequencers,
    totalNetworkProposerSlots,
  };
}
