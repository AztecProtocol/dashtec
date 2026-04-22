-- CreateEnum
CREATE TYPE "ProposerVoteType" AS ENUM ('GOVERNANCE_PROPOSER', 'SLASHING_PROPOSER');

-- CreateTable
CREATE TABLE "Epoch" (
    "epoch_number" BIGINT NOT NULL,
    "start_timestamp" TIMESTAMP(3),
    "end_timestamp" TIMESTAMP(3),
    "planned_proposals" INTEGER,
    "actual_proposals" INTEGER,
    "missed_proposals" INTEGER,
    "total_blocks_proposed" BIGINT,
    "total_blocks_mined" BIGINT,
    "total_blocks_missed" BIGINT,
    "total_attestations_expected" BIGINT,
    "total_attestations_successful" BIGINT,
    "total_attestations_missed" BIGINT,

    CONSTRAINT "Epoch_pkey" PRIMARY KEY ("epoch_number")
);

-- CreateTable
CREATE TABLE "EpochIntegrityStats" (
    "epoch_number" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expected_validators" INTEGER NOT NULL DEFAULT 48,
    "actual_validators" INTEGER NOT NULL DEFAULT 0,
    "block_missed_validators" INTEGER NOT NULL DEFAULT 0,
    "block_mined_validators" INTEGER NOT NULL DEFAULT 0,
    "block_proposed_validators" INTEGER NOT NULL DEFAULT 0,
    "attestation_sent_validators" INTEGER NOT NULL DEFAULT 0,
    "attestation_missed_validators" INTEGER NOT NULL DEFAULT 0,
    "empty_validators" INTEGER NOT NULL DEFAULT 0,
    "integrity_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "integrity_status" VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN',
    "issues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EpochIntegrityStats_pkey" PRIMARY KEY ("epoch_number")
);

-- CreateTable
CREATE TABLE "ProposerVote" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vote_type" "ProposerVoteType" NOT NULL,
    "signaler_address" VARCHAR(42) NOT NULL,
    "payload_address" VARCHAR(42) NOT NULL,
    "round_number" INTEGER NOT NULL,
    "slot_number" BIGINT,
    "epoch_number" BIGINT,
    "block_number" VARCHAR(20) NOT NULL,
    "transaction_hash" VARCHAR(66) NOT NULL,
    "log_index" VARCHAR(10) NOT NULL,
    "timestamp" VARCHAR(30),
    "vote_date" TIMESTAMP(3),
    "contract_address" VARCHAR(42),

    CONSTRAINT "ProposerVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposerPayloadSubmittable" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload_address" VARCHAR(42) NOT NULL,
    "round_number" INTEGER NOT NULL,
    "slot_number" BIGINT,
    "epoch_number" BIGINT,
    "block_number" VARCHAR(20) NOT NULL,
    "transaction_hash" VARCHAR(66) NOT NULL,
    "log_index" VARCHAR(10) NOT NULL,
    "timestamp" VARCHAR(30),
    "contract_address" VARCHAR(42),

    CONSTRAINT "ProposerPayloadSubmittable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposerPayloadSubmitted" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload_address" VARCHAR(42) NOT NULL,
    "round_number" INTEGER NOT NULL,
    "slot_number" BIGINT,
    "epoch_number" BIGINT,
    "block_number" VARCHAR(20) NOT NULL,
    "transaction_hash" VARCHAR(66) NOT NULL,
    "log_index" VARCHAR(10) NOT NULL,
    "timestamp" VARCHAR(30),
    "contract_address" VARCHAR(42),
    "submitter_address" VARCHAR(42),

    CONSTRAINT "ProposerPayloadSubmitted_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceProposerPayload" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload_address" VARCHAR(42) NOT NULL,
    "block_number" VARCHAR(20) NOT NULL,
    "transaction_hash" VARCHAR(66) NOT NULL,
    "log_index" VARCHAR(10) NOT NULL,
    "timestamp" VARCHAR(30),
    "first_signal_timestamp" VARCHAR(30),
    "creator_address" VARCHAR(42),

    CONSTRAINT "GovernanceProposerPayload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceProposerGSEPayload" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload_address" VARCHAR(42) NOT NULL,
    "gse_payload_address" VARCHAR(42) NOT NULL,
    "proposal_id" VARCHAR(50) NOT NULL,

    CONSTRAINT "GovernanceProposerGSEPayload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" CHAR(36) NOT NULL,
    "providerIdentifier" VARCHAR(78) NOT NULL,
    "providerAdmin" CHAR(42) NOT NULL,
    "providerTakeRate" SMALLINT NOT NULL,
    "rewardsRecipient" CHAR(42) NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "txHash" CHAR(66) NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "timestamp" BIGINT NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderAttester" (
    "id" CHAR(36) NOT NULL,
    "providerIdentifier" VARCHAR(78) NOT NULL,
    "attesterAddress" CHAR(42) NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "txHash" CHAR(66) NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "timestamp" BIGINT NOT NULL,

    CONSTRAINT "ProviderAttester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderQueueDrip" (
    "id" CHAR(36) NOT NULL,
    "providerIdentifier" VARCHAR(78) NOT NULL,
    "attesterAddress" CHAR(42) NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "txHash" CHAR(66) NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "timestamp" BIGINT NOT NULL,

    CONSTRAINT "ProviderQueueDrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlashFactoryPayload" (
    "id" TEXT NOT NULL,
    "payload_address" VARCHAR(42) NOT NULL,
    "creator_address" VARCHAR(42) NOT NULL,
    "block_number" VARCHAR(20) NOT NULL,
    "transaction_hash" VARCHAR(66) NOT NULL,
    "log_index" VARCHAR(10) NOT NULL,
    "timestamp" VARCHAR(30),
    "first_signal_timestamp" VARCHAR(30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlashFactoryPayload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlashPayloadData" (
    "id" TEXT NOT NULL,
    "payload_address" VARCHAR(42) NOT NULL,
    "attester_address" VARCHAR(42) NOT NULL,
    "offenses" INTEGER NOT NULL,
    "amount" DECIMAL(30,2) NOT NULL,

    CONSTRAINT "SlashPayloadData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlashSlashed" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload_address" VARCHAR(42),
    "attester_address" VARCHAR(42) NOT NULL,
    "amount" DECIMAL(30,2) NOT NULL,
    "block_number" VARCHAR(20) NOT NULL,
    "transaction_hash" VARCHAR(66) NOT NULL,
    "log_index" VARCHAR(10) NOT NULL,
    "timestamp" VARCHAR(20),
    "slashed_date" TIMESTAMP(3) NOT NULL,
    "contract_address" VARCHAR(42) NOT NULL,

    CONSTRAINT "SlashSlashed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyVoteCast" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "round_number" INTEGER NOT NULL,
    "slot_number" BIGINT,
    "proposer_address" VARCHAR(42) NOT NULL,
    "epoch_number" BIGINT,
    "block_number" VARCHAR(20) NOT NULL,
    "transaction_hash" VARCHAR(66) NOT NULL,
    "log_index" VARCHAR(10) NOT NULL,
    "timestamp" VARCHAR(30),
    "vote_date" TIMESTAMP(3),
    "contract_address" VARCHAR(42) NOT NULL,

    CONSTRAINT "TallyVoteCast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyRoundExecuted" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "round_number" INTEGER NOT NULL,
    "slash_count" INTEGER NOT NULL,
    "slot_number" INTEGER,
    "epoch_number" INTEGER,
    "payload_address" VARCHAR(42),
    "total_slash_amount" DECIMAL(30,2),
    "vote_count" INTEGER,
    "quorum_threshold" INTEGER,
    "block_number" VARCHAR(20) NOT NULL,
    "transaction_hash" VARCHAR(66) NOT NULL,
    "log_index" VARCHAR(10) NOT NULL,
    "timestamp" VARCHAR(30),
    "executed_date" TIMESTAMP(3),
    "contract_address" VARCHAR(42) NOT NULL,

    CONSTRAINT "TallyRoundExecuted_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallySlashTargetCommittee" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "round_number" INTEGER NOT NULL,
    "epoch_index" INTEGER NOT NULL,
    "target_epoch_number" BIGINT NOT NULL,
    "committee_members" TEXT[],
    "committee_size" INTEGER NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contract_address" VARCHAR(42) NOT NULL,
    "rollup_instance" VARCHAR(42) NOT NULL,

    CONSTRAINT "TallySlashTargetCommittee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallySlashAction" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "round_number" INTEGER NOT NULL,
    "action_index" INTEGER NOT NULL DEFAULT 0,
    "validator_address" VARCHAR(42) NOT NULL,
    "slash_amount" DECIMAL(30,2) NOT NULL,
    "vote_count" INTEGER,
    "quorum_threshold" INTEGER,
    "payload_address" VARCHAR(42),
    "deployment_tx_hash" VARCHAR(66),
    "deployment_block" VARCHAR(20),
    "executed_at" TIMESTAMP(3),
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contract_address" VARCHAR(42) NOT NULL,
    "tally_block_number" VARCHAR(20),

    CONSTRAINT "TallySlashAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthChallenge" (
    "id" TEXT NOT NULL,
    "address" VARCHAR(42) NOT NULL,
    "challenge" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppErrorLog" (
    "id" UUID NOT NULL,
    "error_code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack_trace" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Validator" (
    "address" VARCHAR(42) NOT NULL,
    "validator_hex_index" VARCHAR(66) NOT NULL,
    "withdrawer_address" VARCHAR(42),
    "withdrawable_balance" DECIMAL(30,2),
    "activation_date" TIMESTAMP(3),
    "exit_date" TIMESTAMP(3),
    "status" VARCHAR(20) NOT NULL,
    "stake_balance" DECIMAL(30,2),
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated_at" TIMESTAMP(3) NOT NULL,
    "x_handle" VARCHAR(50),
    "x_user_id" VARCHAR(50),
    "x_image_url" VARCHAR(500),
    "discordId" VARCHAR(50),
    "discordUsername" VARCHAR(100),
    "discordAvatar" VARCHAR(500),
    "name" VARCHAR(100),

    CONSTRAINT "Validator_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "ValidatorQueue" (
    "id" UUID NOT NULL,
    "attester_address" VARCHAR(42) NOT NULL,
    "withdrawer_address" VARCHAR(42) NOT NULL,
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "block_number" VARCHAR(20) NOT NULL,
    "transaction_hash" VARCHAR(66) NOT NULL,
    "log_index" VARCHAR(10) NOT NULL,

    CONSTRAINT "ValidatorQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidatorAttestation" (
    "id" UUID NOT NULL,
    "slot_number" BIGINT NOT NULL,
    "epoch_number" BIGINT NOT NULL,
    "validator_address" VARCHAR(42) NOT NULL,
    "committee_index" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL,

    CONSTRAINT "ValidatorAttestation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidatorEpochPerformance" (
    "id" UUID NOT NULL,
    "epoch_number" BIGINT NOT NULL,
    "validator_address" VARCHAR(42) NOT NULL,
    "attestations_successful" INTEGER NOT NULL DEFAULT 0,
    "attestations_missed" INTEGER NOT NULL DEFAULT 0,
    "blocks_proposed" INTEGER NOT NULL DEFAULT 0,
    "blocks_mined" INTEGER NOT NULL DEFAULT 0,
    "blocks_missed" INTEGER NOT NULL DEFAULT 0,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValidatorEpochPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidatorMigration" (
    "id" UUID NOT NULL,
    "validator_address" VARCHAR(42) NOT NULL,
    "found_in_source" BOOLEAN NOT NULL DEFAULT false,
    "had_social_data" BOOLEAN NOT NULL DEFAULT false,
    "was_updated" BOOLEAN NOT NULL DEFAULT false,
    "already_had_social" BOOLEAN NOT NULL DEFAULT false,
    "updated_fields" JSONB,
    "migration_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_by" VARCHAR(100) NOT NULL DEFAULT 'validator-migration-collector',

    CONSTRAINT "ValidatorMigration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EpochIntegrityStats_epoch_number_idx" ON "EpochIntegrityStats"("epoch_number");

-- CreateIndex
CREATE INDEX "EpochIntegrityStats_integrity_status_idx" ON "EpochIntegrityStats"("integrity_status");

-- CreateIndex
CREATE INDEX "EpochIntegrityStats_integrity_score_idx" ON "EpochIntegrityStats"("integrity_score");

-- CreateIndex
CREATE INDEX "EpochIntegrityStats_last_checked_at_idx" ON "EpochIntegrityStats"("last_checked_at");

-- CreateIndex
CREATE INDEX "ProposerVote_vote_type_idx" ON "ProposerVote"("vote_type");

-- CreateIndex
CREATE INDEX "ProposerVote_signaler_address_idx" ON "ProposerVote"("signaler_address");

-- CreateIndex
CREATE INDEX "ProposerVote_payload_address_idx" ON "ProposerVote"("payload_address");

-- CreateIndex
CREATE INDEX "ProposerVote_block_number_idx" ON "ProposerVote"("block_number");

-- CreateIndex
CREATE INDEX "ProposerVote_vote_date_idx" ON "ProposerVote"("vote_date");

-- CreateIndex
CREATE INDEX "ProposerVote_contract_address_idx" ON "ProposerVote"("contract_address");

-- CreateIndex
CREATE UNIQUE INDEX "ProposerVote_transaction_hash_log_index_key" ON "ProposerVote"("transaction_hash", "log_index");

-- CreateIndex
CREATE INDEX "ProposerPayloadSubmittable_block_number_idx" ON "ProposerPayloadSubmittable"("block_number");

-- CreateIndex
CREATE INDEX "ProposerPayloadSubmittable_transaction_hash_idx" ON "ProposerPayloadSubmittable"("transaction_hash");

-- CreateIndex
CREATE INDEX "ProposerPayloadSubmittable_payload_address_idx" ON "ProposerPayloadSubmittable"("payload_address");

-- CreateIndex
CREATE INDEX "ProposerPayloadSubmittable_log_index_idx" ON "ProposerPayloadSubmittable"("log_index");

-- CreateIndex
CREATE INDEX "ProposerPayloadSubmittable_timestamp_idx" ON "ProposerPayloadSubmittable"("timestamp");

-- CreateIndex
CREATE INDEX "ProposerPayloadSubmittable_contract_address_idx" ON "ProposerPayloadSubmittable"("contract_address");

-- CreateIndex
CREATE UNIQUE INDEX "ProposerPayloadSubmittable_transaction_hash_log_index_key" ON "ProposerPayloadSubmittable"("transaction_hash", "log_index");

-- CreateIndex
CREATE INDEX "ProposerPayloadSubmitted_block_number_idx" ON "ProposerPayloadSubmitted"("block_number");

-- CreateIndex
CREATE INDEX "ProposerPayloadSubmitted_transaction_hash_idx" ON "ProposerPayloadSubmitted"("transaction_hash");

-- CreateIndex
CREATE INDEX "ProposerPayloadSubmitted_payload_address_idx" ON "ProposerPayloadSubmitted"("payload_address");

-- CreateIndex
CREATE INDEX "ProposerPayloadSubmitted_log_index_idx" ON "ProposerPayloadSubmitted"("log_index");

-- CreateIndex
CREATE INDEX "ProposerPayloadSubmitted_timestamp_idx" ON "ProposerPayloadSubmitted"("timestamp");

-- CreateIndex
CREATE INDEX "ProposerPayloadSubmitted_contract_address_idx" ON "ProposerPayloadSubmitted"("contract_address");

-- CreateIndex
CREATE INDEX "ProposerPayloadSubmitted_submitter_address_idx" ON "ProposerPayloadSubmitted"("submitter_address");

-- CreateIndex
CREATE UNIQUE INDEX "ProposerPayloadSubmitted_transaction_hash_log_index_key" ON "ProposerPayloadSubmitted"("transaction_hash", "log_index");

-- CreateIndex
CREATE INDEX "GovernanceProposerPayload_creator_address_idx" ON "GovernanceProposerPayload"("creator_address");

-- CreateIndex
CREATE INDEX "GovernanceProposerPayload_block_number_idx" ON "GovernanceProposerPayload"("block_number");

-- CreateIndex
CREATE INDEX "GovernanceProposerPayload_transaction_hash_idx" ON "GovernanceProposerPayload"("transaction_hash");

-- CreateIndex
CREATE INDEX "GovernanceProposerPayload_log_index_idx" ON "GovernanceProposerPayload"("log_index");

-- CreateIndex
CREATE INDEX "GovernanceProposerPayload_timestamp_idx" ON "GovernanceProposerPayload"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "GovernanceProposerPayload_payload_address_key" ON "GovernanceProposerPayload"("payload_address");

-- CreateIndex
CREATE INDEX "GovernanceProposerGSEPayload_payload_address_idx" ON "GovernanceProposerGSEPayload"("payload_address");

-- CreateIndex
CREATE INDEX "GovernanceProposerGSEPayload_proposal_id_idx" ON "GovernanceProposerGSEPayload"("proposal_id");

-- CreateIndex
CREATE INDEX "GovernanceProposerGSEPayload_gse_payload_address_idx" ON "GovernanceProposerGSEPayload"("gse_payload_address");

-- CreateIndex
CREATE UNIQUE INDEX "GovernanceProposerGSEPayload_payload_address_gse_payload_ad_key" ON "GovernanceProposerGSEPayload"("payload_address", "gse_payload_address", "proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_providerIdentifier_key" ON "Provider"("providerIdentifier");

-- CreateIndex
CREATE INDEX "Provider_providerAdmin_idx" ON "Provider"("providerAdmin");

-- CreateIndex
CREATE INDEX "ProviderAttester_providerIdentifier_idx" ON "ProviderAttester"("providerIdentifier");

-- CreateIndex
CREATE INDEX "ProviderAttester_attesterAddress_idx" ON "ProviderAttester"("attesterAddress");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderAttester_txHash_logIndex_providerIdentifier_atteste_key" ON "ProviderAttester"("txHash", "logIndex", "providerIdentifier", "attesterAddress");

-- CreateIndex
CREATE INDEX "ProviderQueueDrip_providerIdentifier_idx" ON "ProviderQueueDrip"("providerIdentifier");

-- CreateIndex
CREATE INDEX "ProviderQueueDrip_attesterAddress_idx" ON "ProviderQueueDrip"("attesterAddress");

-- CreateIndex
CREATE INDEX "ProviderQueueDrip_blockNumber_idx" ON "ProviderQueueDrip"("blockNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderQueueDrip_txHash_logIndex_key" ON "ProviderQueueDrip"("txHash", "logIndex");

-- CreateIndex
CREATE INDEX "SlashFactoryPayload_creator_address_idx" ON "SlashFactoryPayload"("creator_address");

-- CreateIndex
CREATE INDEX "SlashFactoryPayload_block_number_idx" ON "SlashFactoryPayload"("block_number");

-- CreateIndex
CREATE INDEX "SlashFactoryPayload_transaction_hash_idx" ON "SlashFactoryPayload"("transaction_hash");

-- CreateIndex
CREATE INDEX "SlashFactoryPayload_log_index_idx" ON "SlashFactoryPayload"("log_index");

-- CreateIndex
CREATE INDEX "SlashFactoryPayload_timestamp_idx" ON "SlashFactoryPayload"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "SlashFactoryPayload_payload_address_key" ON "SlashFactoryPayload"("payload_address");

-- CreateIndex
CREATE INDEX "SlashPayloadData_payload_address_attester_address_idx" ON "SlashPayloadData"("payload_address", "attester_address");

-- CreateIndex
CREATE INDEX "SlashPayloadData_attester_address_idx" ON "SlashPayloadData"("attester_address");

-- CreateIndex
CREATE INDEX "SlashPayloadData_payload_address_idx" ON "SlashPayloadData"("payload_address");

-- CreateIndex
CREATE INDEX "SlashPayloadData_offenses_idx" ON "SlashPayloadData"("offenses");

-- CreateIndex
CREATE UNIQUE INDEX "SlashPayloadData_payload_address_attester_address_offenses_key" ON "SlashPayloadData"("payload_address", "attester_address", "offenses");

-- CreateIndex
CREATE INDEX "SlashSlashed_attester_address_idx" ON "SlashSlashed"("attester_address");

-- CreateIndex
CREATE INDEX "SlashSlashed_transaction_hash_idx" ON "SlashSlashed"("transaction_hash");

-- CreateIndex
CREATE INDEX "SlashSlashed_block_number_idx" ON "SlashSlashed"("block_number");

-- CreateIndex
CREATE INDEX "SlashSlashed_slashed_date_idx" ON "SlashSlashed"("slashed_date");

-- CreateIndex
CREATE INDEX "SlashSlashed_payload_address_idx" ON "SlashSlashed"("payload_address");

-- CreateIndex
CREATE UNIQUE INDEX "SlashSlashed_transaction_hash_log_index_key" ON "SlashSlashed"("transaction_hash", "log_index");

-- CreateIndex
CREATE INDEX "TallyVoteCast_round_number_idx" ON "TallyVoteCast"("round_number");

-- CreateIndex
CREATE INDEX "TallyVoteCast_slot_number_idx" ON "TallyVoteCast"("slot_number");

-- CreateIndex
CREATE INDEX "TallyVoteCast_proposer_address_idx" ON "TallyVoteCast"("proposer_address");

-- CreateIndex
CREATE INDEX "TallyVoteCast_epoch_number_idx" ON "TallyVoteCast"("epoch_number");

-- CreateIndex
CREATE INDEX "TallyVoteCast_block_number_idx" ON "TallyVoteCast"("block_number");

-- CreateIndex
CREATE INDEX "TallyVoteCast_vote_date_idx" ON "TallyVoteCast"("vote_date");

-- CreateIndex
CREATE INDEX "TallyVoteCast_contract_address_idx" ON "TallyVoteCast"("contract_address");

-- CreateIndex
CREATE UNIQUE INDEX "TallyVoteCast_transaction_hash_log_index_key" ON "TallyVoteCast"("transaction_hash", "log_index");

-- CreateIndex
CREATE INDEX "TallyRoundExecuted_round_number_idx" ON "TallyRoundExecuted"("round_number");

-- CreateIndex
CREATE INDEX "TallyRoundExecuted_slash_count_idx" ON "TallyRoundExecuted"("slash_count");

-- CreateIndex
CREATE INDEX "TallyRoundExecuted_block_number_idx" ON "TallyRoundExecuted"("block_number");

-- CreateIndex
CREATE INDEX "TallyRoundExecuted_executed_date_idx" ON "TallyRoundExecuted"("executed_date");

-- CreateIndex
CREATE INDEX "TallyRoundExecuted_contract_address_idx" ON "TallyRoundExecuted"("contract_address");

-- CreateIndex
CREATE UNIQUE INDEX "TallyRoundExecuted_transaction_hash_log_index_key" ON "TallyRoundExecuted"("transaction_hash", "log_index");

-- CreateIndex
CREATE INDEX "TallySlashTargetCommittee_round_number_idx" ON "TallySlashTargetCommittee"("round_number");

-- CreateIndex
CREATE INDEX "TallySlashTargetCommittee_target_epoch_number_idx" ON "TallySlashTargetCommittee"("target_epoch_number");

-- CreateIndex
CREATE INDEX "TallySlashTargetCommittee_committee_size_idx" ON "TallySlashTargetCommittee"("committee_size");

-- CreateIndex
CREATE INDEX "TallySlashTargetCommittee_computed_at_idx" ON "TallySlashTargetCommittee"("computed_at");

-- CreateIndex
CREATE INDEX "TallySlashTargetCommittee_contract_address_idx" ON "TallySlashTargetCommittee"("contract_address");

-- CreateIndex
CREATE UNIQUE INDEX "TallySlashTargetCommittee_round_number_epoch_index_key" ON "TallySlashTargetCommittee"("round_number", "epoch_index");

-- CreateIndex
CREATE INDEX "TallySlashAction_round_number_idx" ON "TallySlashAction"("round_number");

-- CreateIndex
CREATE INDEX "TallySlashAction_action_index_idx" ON "TallySlashAction"("action_index");

-- CreateIndex
CREATE INDEX "TallySlashAction_validator_address_idx" ON "TallySlashAction"("validator_address");

-- CreateIndex
CREATE INDEX "TallySlashAction_slash_amount_idx" ON "TallySlashAction"("slash_amount");

-- CreateIndex
CREATE INDEX "TallySlashAction_payload_address_idx" ON "TallySlashAction"("payload_address");

-- CreateIndex
CREATE INDEX "TallySlashAction_deployment_tx_hash_idx" ON "TallySlashAction"("deployment_tx_hash");

-- CreateIndex
CREATE INDEX "TallySlashAction_executed_at_idx" ON "TallySlashAction"("executed_at");

-- CreateIndex
CREATE INDEX "TallySlashAction_computed_at_idx" ON "TallySlashAction"("computed_at");

-- CreateIndex
CREATE INDEX "TallySlashAction_contract_address_idx" ON "TallySlashAction"("contract_address");

-- CreateIndex
CREATE UNIQUE INDEX "TallySlashAction_round_number_action_index_validator_addres_key" ON "TallySlashAction"("round_number", "action_index", "validator_address");

-- CreateIndex
CREATE UNIQUE INDEX "AuthChallenge_address_key" ON "AuthChallenge"("address");

-- CreateIndex
CREATE UNIQUE INDEX "AuthChallenge_challenge_key" ON "AuthChallenge"("challenge");

-- CreateIndex
CREATE INDEX "AuthChallenge_createdAt_idx" ON "AuthChallenge"("createdAt");

-- CreateIndex
CREATE INDEX "AppErrorLog_created_at_idx" ON "AppErrorLog"("created_at");

-- CreateIndex
CREATE INDEX "AppErrorLog_error_code_idx" ON "AppErrorLog"("error_code");

-- CreateIndex
CREATE INDEX "Validator_status_idx" ON "Validator"("status");

-- CreateIndex
CREATE INDEX "Validator_address_idx" ON "Validator"("address");

-- CreateIndex
CREATE INDEX "Validator_validator_hex_index_idx" ON "Validator"("validator_hex_index");

-- CreateIndex
CREATE INDEX "ValidatorQueue_attester_address_idx" ON "ValidatorQueue"("attester_address");

-- CreateIndex
CREATE INDEX "ValidatorQueue_queued_at_idx" ON "ValidatorQueue"("queued_at");

-- CreateIndex
CREATE INDEX "ValidatorQueue_block_number_idx" ON "ValidatorQueue"("block_number");

-- CreateIndex
CREATE UNIQUE INDEX "ValidatorQueue_transaction_hash_log_index_key" ON "ValidatorQueue"("transaction_hash", "log_index");

-- CreateIndex
CREATE INDEX "ValidatorAttestation_slot_number_idx" ON "ValidatorAttestation"("slot_number");

-- CreateIndex
CREATE INDEX "ValidatorAttestation_epoch_number_idx" ON "ValidatorAttestation"("epoch_number");

-- CreateIndex
CREATE INDEX "ValidatorAttestation_validator_address_idx" ON "ValidatorAttestation"("validator_address");

-- CreateIndex
CREATE UNIQUE INDEX "ValidatorAttestation_slot_number_validator_address_key" ON "ValidatorAttestation"("slot_number", "validator_address");

-- CreateIndex
CREATE INDEX "ValidatorEpochPerformance_epoch_number_idx" ON "ValidatorEpochPerformance"("epoch_number");

-- CreateIndex
CREATE INDEX "ValidatorEpochPerformance_validator_address_idx" ON "ValidatorEpochPerformance"("validator_address");

-- CreateIndex
CREATE UNIQUE INDEX "ValidatorEpochPerformance_epoch_number_validator_address_key" ON "ValidatorEpochPerformance"("epoch_number", "validator_address");

-- CreateIndex
CREATE UNIQUE INDEX "ValidatorMigration_validator_address_key" ON "ValidatorMigration"("validator_address");

-- CreateIndex
CREATE INDEX "ValidatorMigration_validator_address_idx" ON "ValidatorMigration"("validator_address");

-- CreateIndex
CREATE INDEX "ValidatorMigration_migration_timestamp_idx" ON "ValidatorMigration"("migration_timestamp");

-- CreateIndex
CREATE INDEX "ValidatorMigration_found_in_source_idx" ON "ValidatorMigration"("found_in_source");

-- CreateIndex
CREATE INDEX "ValidatorMigration_was_updated_idx" ON "ValidatorMigration"("was_updated");

-- AddForeignKey
ALTER TABLE "EpochIntegrityStats" ADD CONSTRAINT "EpochIntegrityStats_epoch_number_fkey" FOREIGN KEY ("epoch_number") REFERENCES "Epoch"("epoch_number") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlashPayloadData" ADD CONSTRAINT "SlashPayloadData_payload_address_fkey" FOREIGN KEY ("payload_address") REFERENCES "SlashFactoryPayload"("payload_address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidatorAttestation" ADD CONSTRAINT "ValidatorAttestation_epoch_number_fkey" FOREIGN KEY ("epoch_number") REFERENCES "Epoch"("epoch_number") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidatorAttestation" ADD CONSTRAINT "ValidatorAttestation_validator_address_fkey" FOREIGN KEY ("validator_address") REFERENCES "Validator"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidatorEpochPerformance" ADD CONSTRAINT "ValidatorEpochPerformance_epoch_number_fkey" FOREIGN KEY ("epoch_number") REFERENCES "Epoch"("epoch_number") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidatorEpochPerformance" ADD CONSTRAINT "ValidatorEpochPerformance_validator_address_fkey" FOREIGN KEY ("validator_address") REFERENCES "Validator"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
