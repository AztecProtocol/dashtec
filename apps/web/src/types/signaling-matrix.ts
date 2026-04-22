/**
 * Types for the Signaling Matrix components
 * Components now use useSignalingMatrix hook directly, no prop drilling
 */

import type { PayloadInfo, ProviderInfo, EpochInfo } from '@/types/api/signaling-matrix';

// Re-export API types
export type Payload = PayloadInfo;
export type Provider = ProviderInfo;
export type { EpochInfo };

export type SortBy = 'name' | 'support' | 'opportunities';
export type ProviderSequencerSortBy = 'name' | 'signals' | 'opportunities'
export type FilterStatus = 'all' | 'signaled' | 'no_signal';
