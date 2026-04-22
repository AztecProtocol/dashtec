import { onchainTable, onchainEnum, index } from 'ponder';

/**
 * Ponder schema for Aztec event-based indexing
 * Maps to existing Prisma tables in @dashtec/database
 */

/**
 * Block hash log for reorg detection.
 * Every event handler upserts the block it processed into this table.
 * The materializer compares these hashes against its own cache to detect reorgs.
 */
export const blockHashLog = onchainTable('block_hash_log', (t) => ({
  blockNumber: t.bigint().primaryKey(),
  blockHash: t.hex().notNull(),
}));

/**
 * ProposerVoteType enum
 */
export const proposerVoteType = onchainEnum('proposer_vote_type', ['GOVERNANCE_PROPOSER', 'SLASHING_PROPOSER']);

/**
 * ValidatorQueue - GSE ValidatorQueued event
 * Event params: attester, withdrawer
 */
export const validatorQueue = onchainTable('validator_queue', (t) => ({
  id: t.text().primaryKey(),
  attester_address: t.hex().notNull(),
  withdrawer_address: t.hex().notNull(),
  block_number: t.text().notNull(),
  transaction_hash: t.hex().notNull(),
  log_index: t.text().notNull(),
  rollup_address: t.hex().notNull(),
  // Derived columns for materializer
  timestamp: t.bigint(),
}), (table) => ({
  attesterAddressIdx: index().on(table.attester_address),
}));

/**
 * ProposerVote - EmpireBase SignalCast event
 * Event params: payload, round, signaler
 */
export const proposerVote = onchainTable('proposer_vote', (t) => ({
  id: t.text().primaryKey(),
  vote_type: proposerVoteType('vote_type').notNull(),
  signaler_address: t.hex().notNull(),
  payload_address: t.hex().notNull(),
  round_number: t.integer().notNull(),
  block_number: t.text().notNull(),
  transaction_hash: t.hex().notNull(),
  log_index: t.text().notNull(),
  rollup_address: t.hex().notNull(),
  // Derived columns for materializer
  timestamp: t.bigint(),
  contract_address: t.hex(),
}), (table) => ({
  payloadAddressIdx: index().on(table.payload_address),
}));

/**
 * ProposerPayloadSubmittable - EmpireBase PayloadSubmittable event
 * Event params: payload, round
 */
export const proposerPayloadSubmittable = onchainTable('proposer_payload_submittable', (t) => ({
  id: t.text().primaryKey(),
  payload_address: t.hex().notNull(),
  round_number: t.integer().notNull(),
  block_number: t.text().notNull(),
  transaction_hash: t.hex().notNull(),
  log_index: t.text().notNull(),
  rollup_address: t.hex().notNull(),
  // Derived columns for materializer
  timestamp: t.bigint(),
  contract_address: t.hex(),
}), (table) => ({
  payloadAddressIdx: index().on(table.payload_address),
}));

/**
 * ProposerPayloadSubmitted - EmpireBase PayloadSubmitted event
 * Event params: payload, round
 */
export const proposerPayloadSubmitted = onchainTable('proposer_payload_submitted', (t) => ({
  id: t.text().primaryKey(),
  payload_address: t.hex().notNull(),
  round_number: t.integer().notNull(),
  block_number: t.text().notNull(),
  transaction_hash: t.hex().notNull(),
  log_index: t.text().notNull(),
  rollup_address: t.hex().notNull(),
  // Derived columns for materializer
  timestamp: t.bigint(),
  contract_address: t.hex(),
  submitter_address: t.hex(),
}), (table) => ({
  payloadAddressIdx: index().on(table.payload_address),
}));

/**
 * GovernanceProposerPayload - NOT AN EVENT (placeholder/unused)
 * Keeping minimal structure
 */
export const governanceProposerPayload = onchainTable('governance_proposer_payload', (t) => ({
  id: t.text().primaryKey(),
  payload_address: t.hex().notNull(),
  block_number: t.text().notNull(),
  transaction_hash: t.hex().notNull(),
  log_index: t.text().notNull(),
}), (table) => ({
  payloadAddressIdx: index().on(table.payload_address),
}));

/**
 * GovernanceProposerGSEPayload - NOT AN EVENT (placeholder/unused)
 * Keeping minimal structure
 */
export const governanceProposerGSEPayload = onchainTable('governance_proposer_gse_payload', (t) => ({
  id: t.text().primaryKey(),
  payload_address: t.hex().notNull(),
  gse_payload_address: t.hex().notNull(),
  proposal_id: t.text().notNull(),
}), (table) => ({
  payloadAddressIdx: index().on(table.payload_address),
}));

/**
 * SlashFactoryPayload - NOT AN EVENT (placeholder/unused)
 * Keeping minimal structure
 */
export const slashFactoryPayload = onchainTable('slash_factory_payload', (t) => ({
  id: t.text().primaryKey(),
  payload_address: t.hex().notNull(),
  block_number: t.text().notNull(),
  transaction_hash: t.hex().notNull(),
  log_index: t.text().notNull(),
}), (table) => ({
  payloadAddressIdx: index().on(table.payload_address),
}));

/**
 * SlashSlashed - TallySlashingProposer Slashed event
 * Event params: attester, amount
 * Note: round_number and payload_address are nullable and updated later when RoundExecuted is processed
 */
export const slashSlashed = onchainTable('slash_slashed', (t) => ({
  id: t.text().primaryKey(),
  attester_address: t.hex().notNull(),
  amount: t.text().notNull(),
  round_number: t.integer(),
  payload_address: t.hex(),
  block_number: t.text().notNull(),
  transaction_hash: t.hex().notNull(),
  log_index: t.text().notNull(),
  rollup_address: t.hex().notNull(),
  // Derived columns for materializer
  timestamp: t.bigint(),
  contract_address: t.hex(),
}), (table) => ({
  attesterAddressIdx: index().on(table.attester_address),
  roundNumberIdx: index().on(table.round_number),
}));

/**
 * TallyVoteCast - TallySlashingProposer VoteCast event
 * Event params: round, slot, proposer
 */
export const tallyVoteCast = onchainTable('tally_vote_cast', (t) => ({
  id: t.text().primaryKey(),
  round_number: t.integer().notNull(),
  slot_number: t.bigint().notNull(),
  proposer_address: t.hex().notNull(),
  block_number: t.text().notNull(),
  transaction_hash: t.hex().notNull(),
  log_index: t.text().notNull(),
  rollup_address: t.hex().notNull(),
  // Derived columns for materializer
  epoch_number: t.bigint(),
  timestamp: t.bigint(),
  contract_address: t.hex(),
}), (table) => ({
  roundNumberIdx: index().on(table.round_number),
  proposerAddressIdx: index().on(table.proposer_address),
}));

/**
 * TallyRoundExecuted - TallySlashingProposer RoundExecuted event
 * Event params: round, slashCount
 */
export const tallyRoundExecuted = onchainTable('tally_round_executed', (t) => ({
  id: t.text().primaryKey(),
  round_number: t.integer().notNull(),
  slash_count: t.integer().notNull(),
  block_number: t.text().notNull(),
  transaction_hash: t.hex().notNull(),
  log_index: t.text().notNull(),
  rollup_address: t.hex().notNull(),
  // Derived columns for materializer
  payload_address: t.hex(),
  total_slash_amount: t.text(),
  vote_count: t.integer(),
  tally_results: t.text(),           // JSON: [{attester, amount}]
  target_committees: t.text(),       // JSON: [[addr, addr], [addr]]
  timestamp: t.bigint(),
  contract_address: t.hex(),
}), (table) => ({
  roundNumberIdx: index().on(table.round_number),
}));

/**
 * Deposit (Rollup)
 */
export const deposit = onchainTable('deposit', (t) => ({
  id: t.text().primaryKey(),
  attester_address: t.hex().notNull(),
  withdrawer_address: t.hex().notNull(),
  rollup_address: t.hex().notNull(),
  public_key_g1_x: t.bigint().notNull(),
  public_key_g1_y: t.bigint().notNull(),
  public_key_g2_x0: t.bigint().notNull(),
  public_key_g2_x1: t.bigint().notNull(),
  public_key_g2_y0: t.bigint().notNull(),
  public_key_g2_y1: t.bigint().notNull(),
  proof_of_possession_x: t.bigint().notNull(),
  proof_of_possession_y: t.bigint().notNull(),
  amount: t.bigint().notNull(),
  tx_hash: t.hex().notNull(),
  block_number: t.bigint().notNull(),
  log_index: t.integer().notNull(),
  timestamp: t.bigint().notNull(),
  // Derived columns from getAttesterView for materializer
  attester_status: t.text(),
  effective_balance: t.text(),
  validator_hex_index: t.text(),
}), (table) => ({
  attesterAddressIdx: index().on(table.attester_address),
}));

/**
 * GSE Deposit (GSEContract)
 * Event params: instance, attester, withdrawer, publicKeyInG1, publicKeyInG2, proofOfPossession, moveWithLatestRollup
 */
export const gseDeposit = onchainTable('gse_deposit', (t) => ({
  id: t.text().primaryKey(),
  instance_address: t.hex().notNull(),
  attester_address: t.hex().notNull(),
  withdrawer_address: t.hex().notNull(),
  public_key_g1_x: t.text().notNull(),
  public_key_g1_y: t.text().notNull(),
  public_key_g2_x0: t.text().notNull(),
  public_key_g2_x1: t.text().notNull(),
  public_key_g2_y0: t.text().notNull(),
  public_key_g2_y1: t.text().notNull(),
  proof_of_possession_x: t.text().notNull(),
  proof_of_possession_y: t.text().notNull(),
  move_with_latest_rollup: t.integer().notNull(),
  block_number: t.text().notNull(),
  transaction_hash: t.hex().notNull(),
  log_index: t.text().notNull(),
  // Derived columns from getAttesterView for materializer
  attester_status: t.text(),
  effective_balance: t.text(),
  validator_hex_index: t.text(),
  timestamp: t.bigint(),
}), (table) => ({
  instanceAddressIdx: index().on(table.instance_address),
  attesterAddressIdx: index().on(table.attester_address),
  withdrawerAddressIdx: index().on(table.withdrawer_address),
}));

/**
 * FailedDeposit (Rollup)
 */
export const failedDeposit = onchainTable('failed_deposit', (t) => ({
  id: t.text().primaryKey(),
  attester_address: t.hex().notNull(),
  withdrawer_address: t.hex().notNull(),
  rollup_address: t.hex().notNull(),
  public_key_g1_x: t.bigint().notNull(),
  public_key_g1_y: t.bigint().notNull(),
  public_key_g2_x0: t.bigint().notNull(),
  public_key_g2_x1: t.bigint().notNull(),
  public_key_g2_y0: t.bigint().notNull(),
  public_key_g2_y1: t.bigint().notNull(),
  proof_of_possession_x: t.bigint().notNull(),
  proof_of_possession_y: t.bigint().notNull(),
  tx_hash: t.hex().notNull(),
  block_number: t.bigint().notNull(),
  log_index: t.integer().notNull(),
  timestamp: t.bigint().notNull(),
}), (table) => ({
  attesterAddressIdx: index().on(table.attester_address),
}));

/**
 * WithdrawInitiated (Rollup)
 */
export const withdrawInitiated = onchainTable('withdraw_initiated', (t) => ({
  id: t.text().primaryKey(),
  attester_address: t.hex().notNull(),
  recipient_address: t.hex().notNull(),
  rollup_address: t.hex().notNull(),
  amount: t.bigint().notNull(),
  tx_hash: t.hex().notNull(),
  block_number: t.bigint().notNull(),
  log_index: t.integer().notNull(),
  timestamp: t.bigint().notNull(),
}), (table) => ({
  attesterAddressIdx: index().on(table.attester_address),
  recipientAddressIdx: index().on(table.recipient_address),
}));

/**
 * WithdrawFinalized (Rollup)
 */
export const withdrawFinalized = onchainTable('withdraw_finalized', (t) => ({
  id: t.text().primaryKey(),
  attester_address: t.hex().notNull(),
  recipient_address: t.hex().notNull(),
  rollup_address: t.hex().notNull(),
  amount: t.bigint().notNull(),
  tx_hash: t.hex().notNull(),
  block_number: t.bigint().notNull(),
  log_index: t.integer().notNull(),
  timestamp: t.bigint().notNull(),
}), (table) => ({
  attesterAddressIdx: index().on(table.attester_address),
  recipientAddressIdx: index().on(table.recipient_address),
}));

/**
 * StakedWithProvider (StakingRegistry)
 * Event params: providerIdentifier, rollupAddress, attester, coinbaseSplitContractAddress, stakerAddress
 */
export const stakedWithProvider = onchainTable('staked_with_provider', (t) => ({
  id: t.text().primaryKey(),
  provider_identifier: t.text().notNull(),
  rollup_address: t.hex().notNull(),
  attester_address: t.hex().notNull(),
  coinbase_split_contract_address: t.hex().notNull(),
  staker_address: t.hex().notNull(),
  block_number: t.text().notNull(),
  transaction_hash: t.hex().notNull(),
  log_index: t.text().notNull(),
  // Derived columns for materializer
  timestamp: t.bigint(),
}), (table) => ({
  providerIdentifierIdx: index().on(table.provider_identifier),
  attesterAddressIdx: index().on(table.attester_address),
}));

/**
 * AttestersAddedToProvider (StakingRegistry)
 * Event params: providerIdentifier, attesters[]
 */
export const attestersAddedToProvider = onchainTable('attesters_added_to_provider', (t) => ({
  id: t.text().primaryKey(),
  provider_identifier: t.text().notNull(),
  attesters: t.text().notNull(), // JSON array of addresses
  block_number: t.text().notNull(),
  transaction_hash: t.hex().notNull(),
  log_index: t.text().notNull(),
  rollup_address: t.hex().notNull(),
}), (table) => ({
  providerIdentifierIdx: index().on(table.provider_identifier),
}));

/**
 * ProviderRegistered (StakingRegistry)
 * Event params: providerIdentifier, providerAdmin, providerTakeRate
 */
export const providerRegistered = onchainTable('provider_registered', (t) => ({
  id: t.text().primaryKey(),
  provider_identifier: t.text().notNull(),
  provider_admin: t.hex().notNull(),
  provider_take_rate: t.integer().notNull(),
  block_number: t.text().notNull(),
  transaction_hash: t.hex().notNull(),
  log_index: t.text().notNull(),
  rollup_address: t.hex().notNull(),
  // Derived column from providerConfigurations call
  rewards_recipient: t.hex(),
  timestamp: t.bigint(),
}), (table) => ({
  providerIdentifierIdx: index().on(table.provider_identifier),
  providerAdminIdx: index().on(table.provider_admin),
}));

/**
 * ProviderQueueDripped (StakingRegistry)
 * Event params: providerIdentifier, attester
 */
export const providerQueueDripped = onchainTable('provider_queue_dripped', (t) => ({
  id: t.text().primaryKey(),
  provider_identifier: t.text().notNull(),
  attester_address: t.hex().notNull(),
  block_number: t.text().notNull(),
  transaction_hash: t.hex().notNull(),
  log_index: t.text().notNull(),
  rollup_address: t.hex().notNull(),
  // Derived columns for materializer
  timestamp: t.bigint(),
}), (table) => ({
  providerIdentifierIdx: index().on(table.provider_identifier),
  attesterAddressIdx: index().on(table.attester_address),
}));

/**
 * ProviderTakeRateUpdated (StakingRegistry)
 * Event params: providerIdentifier, newTakeRate
 */
export const providerTakeRateUpdated = onchainTable('provider_take_rate_updated', (t) => ({
  id: t.text().primaryKey(),
  provider_identifier: t.text().notNull(),
  new_take_rate: t.integer().notNull(),
  block_number: t.text().notNull(),
  transaction_hash: t.hex().notNull(),
  log_index: t.text().notNull(),
  rollup_address: t.hex().notNull(),
}), (table) => ({
  providerIdentifierIdx: index().on(table.provider_identifier),
}));

/**
 * ProviderRewardsRecipientUpdated (StakingRegistry)
 * Event params: providerIdentifier, newRewardsRecipient
 */
export const providerRewardsRecipientUpdated = onchainTable('provider_rewards_recipient_updated', (t) => ({
  id: t.text().primaryKey(),
  provider_identifier: t.text().notNull(),
  new_rewards_recipient: t.hex().notNull(),
  block_number: t.text().notNull(),
  transaction_hash: t.hex().notNull(),
  log_index: t.text().notNull(),
  rollup_address: t.hex().notNull(),
}), (table) => ({
  providerIdentifierIdx: index().on(table.provider_identifier),
  newRewardsRecipientIdx: index().on(table.new_rewards_recipient),
}));

/**
 * ProviderAdminUpdateInitiated (StakingRegistry)
 * Event params: providerIdentifier, newAdmin
 */
export const providerAdminUpdateInitiated = onchainTable('provider_admin_update_initiated', (t) => ({
  id: t.text().primaryKey(),
  provider_identifier: t.text().notNull(),
  new_admin: t.hex().notNull(),
  block_number: t.text().notNull(),
  transaction_hash: t.hex().notNull(),
  log_index: t.text().notNull(),
  rollup_address: t.hex().notNull(),
}), (table) => ({
  providerIdentifierIdx: index().on(table.provider_identifier),
  newAdminIdx: index().on(table.new_admin),
}));

/**
 * ProviderAdminUpdated (StakingRegistry)
 * Event params: providerIdentifier, newAdmin
 */
export const providerAdminUpdated = onchainTable('provider_admin_updated', (t) => ({
  id: t.text().primaryKey(),
  provider_identifier: t.text().notNull(),
  new_admin: t.hex().notNull(),
  block_number: t.text().notNull(),
  transaction_hash: t.hex().notNull(),
  log_index: t.text().notNull(),
  rollup_address: t.hex().notNull(),
}), (table) => ({
  providerIdentifierIdx: index().on(table.provider_identifier),
  newAdminIdx: index().on(table.new_admin),
}));

/**
 * L2ProofVerified (Rollup)
 * Event params: blockNumber, proverId
 * Includes transaction data: from, to, gas used, gas price, value, nonce
 */
export const l2ProofVerified = onchainTable('l2_proof_verified', (t) => ({
  id: t.text().primaryKey(),
  l2_block_number: t.bigint().notNull(),
  prover_id: t.hex().notNull(),
  block_number: t.bigint().notNull(),
  transaction_hash: t.hex().notNull(),
  log_index: t.integer().notNull(),
  timestamp: t.bigint().notNull(),
  rollup_address: t.hex().notNull(),
  epoch_number: t.text(),
  // Transaction data
  transaction_from: t.hex().notNull(),
  transaction_to: t.hex(),
  transaction_gas: t.bigint().notNull(),
  transaction_gas_price: t.bigint(),
  transaction_value: t.bigint().notNull(),
  transaction_nonce: t.integer().notNull(),
  transaction_max_fee_per_gas: t.bigint(),
  transaction_max_priority_fee_per_gas: t.bigint(),
}), (table) => ({
  l2BlockNumberIdx: index().on(table.l2_block_number),
  proverIdIdx: index().on(table.prover_id),
  transactionFromIdx: index().on(table.transaction_from),
}));

/**
 * L2BlockProposed (Rollup)
 * Event params: blockNumber, archive, versionedBlobHashes
 */
export const l2BlockProposed = onchainTable('l2_block_proposed', (t) => ({
  id: t.text().primaryKey(),
  l2_block_number: t.bigint().notNull(),
  archive: t.hex().notNull(),
  versioned_blob_hashes: t.text().notNull(), // JSON array
  payload_digest: t.hex(),
  attestations_hash: t.hex(),
  rollup_address: t.hex().notNull(),
  block_number: t.bigint().notNull(),
  transaction_hash: t.hex().notNull(),
  log_index: t.integer().notNull(),
  timestamp: t.bigint().notNull(),
  slot_number: t.bigint().notNull(),
  coinbase: t.hex().notNull(),
}), (table) => ({
  l2BlockNumberIdx: index().on(table.l2_block_number),
  slotNumberIdx: index().on(table.slot_number),
  coinbaseIdx: index().on(table.coinbase),
}));

/**
 * CheckpointInvalidated (Rollup)
 * Event params: checkpointNumber
 */
/**
 * CanonicalRollupUpdated (Registry)
 * Event params: instance, version
 */
export const canonicalRollupUpdated = onchainTable('canonical_rollup_updated', (t) => ({
  id: t.text().primaryKey(),
  instance_address: t.hex().notNull(),
  version: t.text().notNull(),
  block_number: t.text().notNull(),
  transaction_hash: t.hex().notNull(),
  log_index: t.text().notNull(),
  timestamp: t.bigint(),
}), (table) => ({
  instanceAddressIdx: index().on(table.instance_address),
  versionIdx: index().on(table.version),
}));

/**
 * CheckpointInvalidated (Rollup)
 * Event params: checkpointNumber
 */
export const checkpointInvalidated = onchainTable('checkpoint_invalidated', (t) => ({
  id: t.text().primaryKey(),
  checkpoint_number: t.bigint().notNull(),
  block_number: t.bigint().notNull(),
  transaction_hash: t.hex().notNull(),
  log_index: t.integer().notNull(),
  timestamp: t.bigint().notNull(),
  rollup_address: t.hex().notNull(),
}), (table) => ({
  checkpointNumberIdx: index().on(table.checkpoint_number),
}));


