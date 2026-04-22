/**
 * API types for the Signaling Matrix endpoints
 */

export interface PayloadInfo {
  address: string;
  signalCount: number;
  hasQuorum: boolean;
  isLeading: boolean;
  status: 'Active' | 'Submittable' | 'Submitted' | 'Expired';
}

export interface ProviderSignalCounts {
  [payloadAddress: string]: {
    supportCount: number; // Number of unique sequencers who signaled
    noSignalCount: number; // Number of sequencers who didn't signal
    totalSignals: number; // Total number of signal transactions (can be > supportCount)
  };
}

export interface ProviderInfo {
  identifier: string;
  name: string;
  logoUrl?: string;
  totalSequencers: number;
  selectedAsProposer: number;
  totalProposerSlots: number;
  signalingSequencers: number;
  totalSignals: number;
  totalPossibleSignals: number;
  participationRate: number;
  networkParticipationRate: number;
  payloadSignals: ProviderSignalCounts;
}

export interface EpochInfo {
  startEpoch: number;
  endEpoch: number;
  startSlot: number;
  endSlot: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export interface SignalingMatrixResponse {
  currentRound: number;
  epoch: EpochInfo;
  payloads: PayloadInfo[];
  providers: ProviderInfo[];
  pagination: PaginationMeta;
  quorumSize: number;
  roundSize: number;
  totalNetwork: {
    signals: number;
    possibleSignals: number;
    activeSignalingSequencers: number;
    activeProviders: number;
  };
  benchmark: string;
  benchmarkDetails: {
    total: string;
    details: Record<string, string>;
  };
  status: 'ok' | 'error';
}