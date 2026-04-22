export interface ProviderWithCounts {
  identifier: string;
  name: string;
  logoUrl: string | null;
  totalSequencers: number;
  selectedAsProposer: number;
  totalProposerSlots: number;
  signalingSequencers: number;
  totalSignals: number;
  totalPossibleSignals: number;
  participationRate: number;
  networkParticipationRate: number;
  payloadSignals: Map<string, { supportCount: number; noSignalCount: number; totalSignals: number }>;
  sequencerAddresses: string[];
}
