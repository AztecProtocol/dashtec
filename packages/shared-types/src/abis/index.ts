import { RollupABI, ProposeABI } from './RollupABI';
// Aztec V5 renamed this contract to SlashingProposer (l1-contracts/src/core/slashing/
// SlashingProposer.sol) and deleted EmpireSlashingProposer. The events and view
// functions are byte-identical, so the ABI is unchanged.
import { TallySlashingProposerABI } from './TallySlashingProposerABI';
import { EmpireBaseABI } from './EmpireBaseABI';
import { GovernorContractABI } from './GovernorContractABI';
import { StakingRegistryABI } from './StakingRegistryABI';
import { RegistryABI } from './RegistryABI';
import { GseABI } from './GseABI';
import { ERC20ABI } from './ERC20ABI';
import { PayloadABI } from './PayloadABI';
import { Multicall3ABI } from './Multicall3ABI';
import { SlasherABI, GseViewABI, GovernanceABI } from './DerivedContractsABI';

export { RollupABI, ProposeABI, TallySlashingProposerABI, EmpireBaseABI, GovernorContractABI, StakingRegistryABI, RegistryABI, GseABI, ERC20ABI, PayloadABI, Multicall3ABI, SlasherABI, GseViewABI, GovernanceABI };

export const ABIS = {
  Rollup: RollupABI,
  TallySlashingProposer: TallySlashingProposerABI,
  EmpireBase: EmpireBaseABI,
  GovernorContract: GovernorContractABI,
  StakingRegistry: StakingRegistryABI,
  Registry: RegistryABI,
  Gse: GseABI,
  ERC20: ERC20ABI,
  Payload: PayloadABI,
  Multicall3: Multicall3ABI,
} as const;

export type ABIName = keyof typeof ABIS;

