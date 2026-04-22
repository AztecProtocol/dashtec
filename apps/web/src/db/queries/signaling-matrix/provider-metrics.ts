import type { ProviderWithCounts } from './types';

/**
 * Calculate metrics for each provider including proposer slots, signals, and participation rates
 * Returns the providers array with calculated metrics
 */
export function calculateProviderMetrics(
  allProviders: ProviderWithCounts[],
  payloadAddresses: string[],
  proposerSlotCounts: Map<string, number>,
  signalLookup: Map<string, Map<string, number>>,
  totalNetworkProposerSlots: number
): ProviderWithCounts[] {
  allProviders.forEach(provider => {
    provider.totalSequencers = provider.sequencerAddresses.length;

    let selectedAsProposer = 0;
    let totalProposerSlots = 0;
    const signalingSequencersSet = new Set<string>();

    provider.sequencerAddresses.forEach(sequencerAddress => {
      const slotCount = proposerSlotCounts.get(sequencerAddress) || 0;
      if (slotCount > 0) {
        selectedAsProposer++;
        totalProposerSlots += slotCount;
      }
    });

    provider.selectedAsProposer = selectedAsProposer;
    provider.totalProposerSlots = totalProposerSlots;

    payloadAddresses.forEach(payloadAddress => {
      let supportCount = 0;
      let noSignalCount = 0;

      provider.sequencerAddresses.forEach(sequencerAddress => {
        const slotCount = proposerSlotCounts.get(sequencerAddress) || 0;

        if (slotCount > 0) {
          const sequencerPayloadMap = signalLookup.get(sequencerAddress);
          const signalCount = sequencerPayloadMap?.get(payloadAddress) || 0;

          if (signalCount > 0) {
            supportCount += signalCount;
            provider.totalSignals += signalCount;
            signalingSequencersSet.add(sequencerAddress);
          } else {
            noSignalCount += slotCount;
          }
        }
      });

      provider.payloadSignals.set(payloadAddress, {
        supportCount,
        noSignalCount,
        totalSignals: supportCount,
      });
    });

    provider.signalingSequencers = signalingSequencersSet.size;
    provider.totalPossibleSignals = totalProposerSlots * payloadAddresses.length;
    provider.participationRate =
      provider.totalPossibleSignals > 0
        ? (provider.totalSignals / provider.totalPossibleSignals) * 100
        : 0;

    provider.networkParticipationRate =
      totalNetworkProposerSlots > 0
        ? (provider.totalSignals / totalNetworkProposerSlots) * 100
        : 0;


  });

  return allProviders;
}
