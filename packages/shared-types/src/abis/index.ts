import { RollupABI, ProposeABI } from './RollupABI';
import { SlashFactoryABI } from './SlashFactoryABI';
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

export { RollupABI, ProposeABI, SlashFactoryABI, TallySlashingProposerABI, EmpireBaseABI, GovernorContractABI, StakingRegistryABI, RegistryABI, GseABI, ERC20ABI, PayloadABI, Multicall3ABI, SlasherABI, GseViewABI, GovernanceABI };

export const ABIS = {
  Rollup: RollupABI,
  SlashFactory: SlashFactoryABI,
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

