import type {
  EpochInfo,
  PaginationMeta,
  ProviderInfo,
  ProviderSignalCounts,
  SignalingMatrixResponse,
} from '@/types/api/signaling-matrix';
import type { SignalingMatrixBundle, SignalingMatrixParams } from './signalingMatrixLoader';

/** Pure mapper: bundle + params → API response shape. */
export function formatSignalingMatrixResponse(
  bundle: SignalingMatrixBundle,
  params: SignalingMatrixParams,
  benchmark: { total: string; details: Record<string, string> },
): SignalingMatrixResponse {
  const epoch: EpochInfo = {
    startEpoch: bundle.range.startEpoch,
    endEpoch: bundle.range.endEpoch,
    startSlot: bundle.range.startSlot,
    endSlot: bundle.range.endSlot,
  };

  const providers: ProviderInfo[] = bundle.providerResult.providers.map(provider => {
    const payloadSignals: ProviderSignalCounts = {};
    provider.payloadSignals.forEach((counts, payloadAddress) => {
      payloadSignals[payloadAddress] = counts;
    });

    return {
      identifier: provider.identifier,
      name: provider.name,
      logoUrl: provider.logoUrl || undefined,
      totalSequencers: provider.totalSequencers,
      selectedAsProposer: provider.selectedAsProposer,
      totalProposerSlots: provider.totalProposerSlots,
      signalingSequencers: provider.signalingSequencers,
      totalSignals: provider.totalSignals,
      totalPossibleSignals: provider.totalPossibleSignals,
      participationRate: provider.participationRate,
      networkParticipationRate: provider.networkParticipationRate,
      payloadSignals,
    };
  });

  const pagination: PaginationMeta = {
    page: params.page,
    limit: params.limit,
    totalCount: bundle.providerResult.totalCount,
    totalPages: Math.ceil(bundle.providerResult.totalCount / params.limit),
  };

  const totalNetworkPossibleSignals =
    bundle.providerResult.totalNetworkSequencers * bundle.payloadAddresses.length;

  return {
    currentRound: bundle.currentRoundNumber,
    epoch,
    payloads: bundle.payloads,
    providers,
    pagination,
    quorumSize: Number(bundle.quorumSize),
    roundSize: bundle.roundSizeNum,
    totalNetwork: {
      signals: bundle.providerResult.totalNetworkSignals,
      possibleSignals: totalNetworkPossibleSignals,
      activeSignalingSequencers: bundle.providerResult.totalNetworkActiveSignalingSequencers,
      activeProviders: bundle.providerResult.totalNetworkActiveProviders,
    },
    benchmark: benchmark.total,
    benchmarkDetails: benchmark,
    status: 'ok',
  };
}
