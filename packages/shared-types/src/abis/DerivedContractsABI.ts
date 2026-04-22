/** Slasher contract — used to derive slashing proposer from rollup */
export const SlasherABI = [
  {
    name: 'PROPOSER',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

/** GSE contract — used to derive governance from rollup */
export const GseViewABI = [
  {
    name: 'getGovernance',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

/** Governance contract — used to derive governance proposer */
export const GovernanceABI = [
  {
    name: 'governanceProposer',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;
