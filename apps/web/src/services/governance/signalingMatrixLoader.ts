import { getResolvedContracts } from '@/lib/contracts';
import {
  getPayloadsForRound,
  getPayloadSignalCounts,
  getProvidersWithSignalCounts,
  getProposerSlotsForRound,
} from '@/db/queries/signaling-matrix';
import type { PayloadInfo } from '@/types/api/signaling-matrix';
import { deriveRoundEpochRange, type RoundEpochRange } from './roundEpochRange';

export interface SignalingMatrixParams {
  roundNumber: number;       // 0 = "use current"
  page: number;
  limit: number;
  sortBy: 'name' | 'support';
  filterStatus: 'all' | 'signaled' | 'no_signal';
  search: string | undefined;
  rollupAddresses: string[];
}

export interface SignalingMatrixBundle {
  currentRoundNumber: number;
  targetRound: number;
  roundSizeNum: number;
  quorumSize: bigint;
  range: RoundEpochRange;
  payloads: PayloadInfo[];   // already sorted (leading first, then by signalCount desc)
  payloadAddresses: string[];
  providerResult: Awaited<ReturnType<typeof getProvidersWithSignalCounts>>;
  proposerSlotCounts: Awaited<ReturnType<typeof getProposerSlotsForRound>>;
}

/** Build & sort the per-payload status/leading/signalCount view from raw fetch results. */
function buildPayloads(
  payloadInfos: Awaited<ReturnType<typeof getPayloadsForRound>>,
  signalCounts: Awaited<ReturnType<typeof getPayloadSignalCounts>>,
  roundData: Awaited<ReturnType<Awaited<ReturnType<typeof getResolvedContracts>>['empireBase']['getRoundData']>>,
  quorumSize: bigint,
  currentRoundNumber: number,
  targetRound: number,
  lifetimeInRounds: bigint,
): PayloadInfo[] {
  const leadingAddress = roundData.payloadWithMostSignals?.toLowerCase();
  const tooOld = currentRoundNumber > targetRound + Number(lifetimeInRounds);

  return payloadInfos
    .map((p): PayloadInfo => {
      const signalCount = signalCounts.get(p.payloadAddress) || 0;
      let status: PayloadInfo['status'] = 'Active';
      if (p.isSubmitted) status = 'Submitted';
      else if (tooOld) status = 'Expired';
      else if (p.isSubmittable) status = 'Submittable';

      return {
        address: p.payloadAddress,
        signalCount,
        hasQuorum: signalCount >= Number(quorumSize),
        isLeading: leadingAddress === p.payloadAddress.toLowerCase(),
        status,
      };
    })
    .sort((a, b) => {
      if (a.isLeading && !b.isLeading) return -1;
      if (!a.isLeading && b.isLeading) return 1;
      return b.signalCount - a.signalCount;
    });
}

/**
 * Loads everything needed to render the signaling matrix:
 * 1. Round metadata + payload metadata in parallel from the chain
 * 2. Payload signal counts and proposer slots from the DB in parallel
 * 3. Per-provider signal counts (depends on payload addresses, so sequential)
 */
export async function loadSignalingMatrix(params: SignalingMatrixParams): Promise<SignalingMatrixBundle> {
  const rollupContracts = await getResolvedContracts(params.rollupAddresses[0]);

  const [currentRound, quorumSize, roundSize, lifetimeInRounds, slotsPerEpoch] = await Promise.all([
    rollupContracts.empireBase.getCurrentRound(),
    rollupContracts.empireBase.getQuorumSize(),
    rollupContracts.empireBase.getRoundSize(),
    rollupContracts.empireBase.getLifetimeInRounds(),
    rollupContracts.rollup.getEpochDuration(),
  ]);
  const roundData = await rollupContracts.empireBase.getRoundData(currentRound);

  const currentRoundNumber = Number(currentRound);
  const roundSizeNum = Number(roundSize);
  const targetRound = params.roundNumber || currentRoundNumber;
  const range = deriveRoundEpochRange(targetRound, roundSizeNum, Number(slotsPerEpoch));

  const [payloadInfos, signalCounts, proposerSlotCounts] = await Promise.all([
    getPayloadsForRound(targetRound, params.rollupAddresses),
    getPayloadSignalCounts(targetRound, params.rollupAddresses),
    getProposerSlotsForRound(range.startSlot, range.endSlot, params.rollupAddresses),
  ]);

  const payloads = buildPayloads(
    payloadInfos,
    signalCounts,
    roundData,
    quorumSize,
    currentRoundNumber,
    targetRound,
    lifetimeInRounds,
  );
  const payloadAddresses = payloads.map(p => p.address);

  const providerResult = await getProvidersWithSignalCounts(
    targetRound,
    payloadAddresses,
    proposerSlotCounts,
    {
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,
      filterStatus: params.filterStatus,
      search: params.search,
    },
    params.rollupAddresses,
  );

  return {
    currentRoundNumber,
    targetRound,
    roundSizeNum,
    quorumSize,
    range,
    payloads,
    payloadAddresses,
    providerResult,
    proposerSlotCounts,
  };
}
