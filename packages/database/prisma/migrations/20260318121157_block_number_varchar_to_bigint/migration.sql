-- CanonicalRollupUpdated
ALTER TABLE "CanonicalRollupUpdated" ALTER COLUMN "block_number" TYPE BIGINT USING block_number::bigint;
ALTER TABLE "CanonicalRollupUpdated" ALTER COLUMN "log_index" TYPE INTEGER USING log_index::integer;

-- GovernanceProposerPayload
ALTER TABLE "GovernanceProposerPayload" ALTER COLUMN "block_number" TYPE BIGINT USING block_number::bigint;
ALTER TABLE "GovernanceProposerPayload" ALTER COLUMN "log_index" TYPE INTEGER USING log_index::integer;

-- MaterializedValidatorDeposit
ALTER TABLE "MaterializedValidatorDeposit" ALTER COLUMN "block_number" TYPE BIGINT USING block_number::bigint;
ALTER TABLE "MaterializedValidatorDeposit" ALTER COLUMN "log_index" TYPE INTEGER USING log_index::integer;

-- MaterializedValidatorFailedDeposit
ALTER TABLE "MaterializedValidatorFailedDeposit" ALTER COLUMN "block_number" TYPE BIGINT USING block_number::bigint;
ALTER TABLE "MaterializedValidatorFailedDeposit" ALTER COLUMN "log_index" TYPE INTEGER USING log_index::integer;

-- MaterializedValidatorGseDeposit
ALTER TABLE "MaterializedValidatorGseDeposit" ALTER COLUMN "block_number" TYPE BIGINT USING block_number::bigint;
ALTER TABLE "MaterializedValidatorGseDeposit" ALTER COLUMN "log_index" TYPE INTEGER USING log_index::integer;

-- MaterializedValidatorQueued
ALTER TABLE "MaterializedValidatorQueued" ALTER COLUMN "block_number" TYPE BIGINT USING block_number::bigint;
ALTER TABLE "MaterializedValidatorQueued" ALTER COLUMN "log_index" TYPE INTEGER USING log_index::integer;

-- MaterializedValidatorStakeHistory
ALTER TABLE "MaterializedValidatorStakeHistory" ALTER COLUMN "block_number" TYPE BIGINT USING block_number::bigint;
ALTER TABLE "MaterializedValidatorStakeHistory" ALTER COLUMN "log_index" TYPE INTEGER USING log_index::integer;

-- MaterializedValidatorWithdrawFinalized
ALTER TABLE "MaterializedValidatorWithdrawFinalized" ALTER COLUMN "block_number" TYPE BIGINT USING block_number::bigint;
ALTER TABLE "MaterializedValidatorWithdrawFinalized" ALTER COLUMN "log_index" TYPE INTEGER USING log_index::integer;

-- MaterializedValidatorWithdrawInitiated
ALTER TABLE "MaterializedValidatorWithdrawInitiated" ALTER COLUMN "block_number" TYPE BIGINT USING block_number::bigint;
ALTER TABLE "MaterializedValidatorWithdrawInitiated" ALTER COLUMN "log_index" TYPE INTEGER USING log_index::integer;

-- ProposerPayloadSubmittable
ALTER TABLE "ProposerPayloadSubmittable" ALTER COLUMN "block_number" TYPE BIGINT USING block_number::bigint;
ALTER TABLE "ProposerPayloadSubmittable" ALTER COLUMN "log_index" TYPE INTEGER USING log_index::integer;

-- ProposerPayloadSubmitted
ALTER TABLE "ProposerPayloadSubmitted" ALTER COLUMN "block_number" TYPE BIGINT USING block_number::bigint;
ALTER TABLE "ProposerPayloadSubmitted" ALTER COLUMN "log_index" TYPE INTEGER USING log_index::integer;

-- ProposerVote
ALTER TABLE "ProposerVote" ALTER COLUMN "block_number" TYPE BIGINT USING block_number::bigint;
ALTER TABLE "ProposerVote" ALTER COLUMN "log_index" TYPE INTEGER USING log_index::integer;

-- SlashFactoryPayload
ALTER TABLE "SlashFactoryPayload" ALTER COLUMN "block_number" TYPE BIGINT USING block_number::bigint;
ALTER TABLE "SlashFactoryPayload" ALTER COLUMN "log_index" TYPE INTEGER USING log_index::integer;

-- SlashSlashed
ALTER TABLE "SlashSlashed" ALTER COLUMN "block_number" TYPE BIGINT USING block_number::bigint;
ALTER TABLE "SlashSlashed" ALTER COLUMN "log_index" TYPE INTEGER USING log_index::integer;

-- TallyRoundExecuted
ALTER TABLE "TallyRoundExecuted" ALTER COLUMN "block_number" TYPE BIGINT USING block_number::bigint;
ALTER TABLE "TallyRoundExecuted" ALTER COLUMN "log_index" TYPE INTEGER USING log_index::integer;

-- TallySlashAction
ALTER TABLE "TallySlashAction" ALTER COLUMN "deployment_block" TYPE BIGINT USING deployment_block::bigint;
ALTER TABLE "TallySlashAction" ALTER COLUMN "tally_block_number" TYPE BIGINT USING tally_block_number::bigint;

-- TallySlashTargetCommittee
ALTER TABLE "TallySlashTargetCommittee" ALTER COLUMN "block_number" TYPE BIGINT USING block_number::bigint;

-- TallyVoteCast
ALTER TABLE "TallyVoteCast" ALTER COLUMN "block_number" TYPE BIGINT USING block_number::bigint;
ALTER TABLE "TallyVoteCast" ALTER COLUMN "log_index" TYPE INTEGER USING log_index::integer;

-- ValidatorQueue
ALTER TABLE "ValidatorQueue" ALTER COLUMN "block_number" TYPE BIGINT USING block_number::bigint;
ALTER TABLE "ValidatorQueue" ALTER COLUMN "log_index" TYPE INTEGER USING log_index::integer;

-- ValidatorRollup
ALTER TABLE "ValidatorRollup" ALTER COLUMN "block_number" TYPE BIGINT USING block_number::bigint;
ALTER TABLE "ValidatorRollup" ALTER COLUMN "log_index" TYPE INTEGER USING log_index::integer;
