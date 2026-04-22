/**
 * API types for sequencer signals endpoint
 */

export interface SequencerSignalDetail {
  payloadAddress: string;
  timestamp: number | null;
  transactionHash: string;
  roundNumber: number;
  slotNumber: number | null;
  l2BlockNumber: number | null;
  coinbase: string | null;
}

export interface SequencerSignalsResponse {
  sequencerAddress: string;
  payloadAddress?: string;
  signals: SequencerSignalDetail[];
  totalSignals: number;
  benchmark: string;
  status: 'ok' | 'error';
}