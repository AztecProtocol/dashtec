export interface RollupVersion {
  address: string;
  label: string;
  startBlock: number;
  endBlock: number | null;
  deprecated: boolean;
}

/** A version as /api/rollups returns it, with what has been indexed for it. */
export interface RollupVersionStats extends RollupVersion {
  validatorCount: number;
  epochCount: number;
  frozenAtBlock: string | null;
  /** L1 block of the newest checkpoint indexed for this rollup. */
  lastCheckpointBlock: string | null;
  /** Still producing checkpoints; a replaced rollup can keep running. */
  isLive: boolean;
}

export interface RollupRegistry {
  versions: RollupVersion[];
  activeAddress: string;
}

export interface RollupDerivedAddresses {
  rollupAddress: string;
  slasherAddress: string;
  slashingProposerAddress: string;
  governanceProposerAddress: string;
}
