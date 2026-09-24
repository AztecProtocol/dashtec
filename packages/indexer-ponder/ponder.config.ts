import { createConfig } from 'ponder';
import { http, fallback } from 'viem';
import { config } from './src/config';
import {
  RollupABI,
  TallySlashingProposerABI,
  EmpireBaseABI,
  GovernorContractABI,
  GseABI,
  StakingRegistryABI,
  RegistryABI,
} from './src/abis';

/**
 * Ponder configuration for indexing Aztec event-based contracts
 */

// startBlock is per-contract: a rollup upgrade redeploys the rollup and its
// slashing proposer, while the GSE, registry, governance and staking registry
// keep their addresses. Indexing the survivors from the new rollup's block
// discards their earlier events — which is how every GSE-staked validator went
// missing from the registry after V5. discover-contracts.js finds each
// deployment block; the ?? fallback covers configs written before it did.
export default createConfig({
  database: {
    kind: 'postgres',
    connectionString: config.DATABASE_URL,
  },
  chains: {
    [config.NETWORK_TYPE]: {
      id: config.CHAIN_ID,
      // Wrap each RPC URL in an http transport with a 30s timeout (viem's default
      // is 10s, which abandons requests the upstream RPC/eRPC would still complete
      // within its ~30s budget). fallback() keeps multi-URL failover.
      rpc: fallback(config.RPC_URLS.map((url) => http(url, { timeout: 30_000 }))),
    },
  },
  contracts: {
    /**
     * Rollup Contract
     * Events: Deposit, FailedDeposit, WithdrawInitiated, WithdrawFinalized
     */
    Rollup: {
      chain: config.NETWORK_TYPE,
      address: config.ROLLUP_CONTRACT_ADDRESS as `0x${string}`,
      abi: RollupABI,
      startBlock: config.START_BLOCK,
    },

    /**
     * Governance Proposer Contract
     * Events: ProposerVote, ProposerPayloadSubmittable, ProposerPayloadSubmitted, GovernanceProposerPayload
     */
    GovernanceProposer: {
      chain: config.NETWORK_TYPE,
      address: config.GOVERNANCE_PROPOSER_CONTRACT_ADDRESS as `0x${string}`,
      abi: EmpireBaseABI,
      startBlock: config.START_BLOCK_GOVERNANCE_PROPOSER ?? config.START_BLOCK,
    },

    /**
     * Slashing Proposer Contract
     * Upstream name in Aztec V5 is `SlashingProposer`; V4's Empire-flavoured
     * slashing proposer was deleted, so only this tally-based ABI is registered
     * against SLASHING_PROPOSER_CONTRACT_ADDRESS.
     * Events: VoteCast, RoundExecuted, Slashed
     */
    TallySlashingProposer: {
      chain: config.NETWORK_TYPE,
      address: config.SLASHING_PROPOSER_CONTRACT_ADDRESS as `0x${string}`,
      abi: TallySlashingProposerABI,
      startBlock: config.START_BLOCK_SLASHING_PROPOSER ?? config.START_BLOCK,
    },

    /**
     * Governor Contract
     * For governance-related events
     */
    GovernorContract: {
      chain: config.NETWORK_TYPE,
      address: config.GOVERNANCE_CONTRACT_ADDRESS as `0x${string}`,
      abi: GovernorContractABI,
      startBlock: config.START_BLOCK_GOVERNANCE ?? config.START_BLOCK,
    },

    /**
     * GSE Contract
     * Events: Deposit (with instance + moveWithLatestRollup)
     */
    GSEContract: {
      chain: config.NETWORK_TYPE,
      address: config.GSE_CONTRACT_ADDRESS as `0x${string}`,
      abi: GseABI,
      startBlock: config.START_BLOCK_GSE ?? config.START_BLOCK,
    },

    /**
     * Staking Registry Contract
     * Events: StakedWithProvider, AttestersAddedToProvider, ProviderRegistered,
     *         ProviderQueueDripped, ProviderTakeRateUpdated, ProviderRewardsRecipientUpdated,
     *         ProviderAdminUpdateInitiated, ProviderAdminUpdated
     */
    StakingRegistry: {
      chain: config.NETWORK_TYPE,
      address: config.STAKING_REGISTRY_CONTRACT_ADDRESS as `0x${string}`,
      abi: StakingRegistryABI,
      startBlock: config.START_BLOCK_STAKING_REGISTRY ?? config.START_BLOCK,
    },

    /**
     * Registry Contract
     * Events: CanonicalRollupUpdated
     */
    Registry: {
      chain: config.NETWORK_TYPE,
      address: config.REGISTRY_CONTRACT_ADDRESS as `0x${string}`,
      abi: RegistryABI,
      startBlock: config.START_BLOCK_REGISTRY ?? config.START_BLOCK,
    },
  },
});
