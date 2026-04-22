export interface RollupVersion {
  address: string;
  label: string;
  startBlock: number;
  endBlock: number | null;
  deprecated: boolean;
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
