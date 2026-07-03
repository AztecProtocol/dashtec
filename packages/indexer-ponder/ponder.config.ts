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
      startBlock: config.START_BLOCK,
    },

    /**
     * Slashing Proposer Contract
     * Events: ProposerVote, ProposerPayloadSubmittable, ProposerPayloadSubmitted
     */
    SlashingProposer: {
      chain: config.NETWORK_TYPE,
      address: config.SLASHING_PROPOSER_CONTRACT_ADDRESS as `0x${string}`,
      abi: EmpireBaseABI,
      startBlock: config.START_BLOCK,
    },

    /**
     * Tally Slashing Proposer Contract
     * Events: TallyVoteCast, TallyRoundExecuted, SlashSlashed
     */
    TallySlashingProposer: {
      chain: config.NETWORK_TYPE,
      address: config.SLASHING_PROPOSER_CONTRACT_ADDRESS as `0x${string}`,
      abi: TallySlashingProposerABI,
      startBlock: config.START_BLOCK,
    },

    /**
     * Governor Contract
     * For governance-related events
     */
    GovernorContract: {
      chain: config.NETWORK_TYPE,
      address: config.GOVERNANCE_CONTRACT_ADDRESS as `0x${string}`,
      abi: GovernorContractABI,
      startBlock: config.START_BLOCK,
    },

    /**
     * GSE Contract
     * Events: Deposit (with instance + moveWithLatestRollup)
     */
    GSEContract: {
      chain: config.NETWORK_TYPE,
      address: config.GSE_CONTRACT_ADDRESS as `0x${string}`,
      abi: GseABI,
      startBlock: config.START_BLOCK,
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
      startBlock: config.START_BLOCK,
    },

    /**
     * Registry Contract
     * Events: CanonicalRollupUpdated
     */
    Registry: {
      chain: config.NETWORK_TYPE,
      address: config.REGISTRY_CONTRACT_ADDRESS as `0x${string}`,
      abi: RegistryABI,
      startBlock: config.START_BLOCK,
    },
  },
});
