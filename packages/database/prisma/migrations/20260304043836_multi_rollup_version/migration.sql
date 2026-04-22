-- AlterTable
ALTER TABLE "Epoch" ADD COLUMN     "rollup_address" VARCHAR(42);

-- AlterTable
ALTER TABLE "L2ProofVerified" ADD COLUMN     "rollup_address" VARCHAR(42);

-- AlterTable
ALTER TABLE "MaterializerCheckpoint" ADD COLUMN     "rollup_address" VARCHAR(42);

-- AlterTable
ALTER TABLE "ProposerPayloadSubmittable" ADD COLUMN     "rollup_address" VARCHAR(42);

-- AlterTable
ALTER TABLE "ProposerPayloadSubmitted" ADD COLUMN     "rollup_address" VARCHAR(42);

-- AlterTable
ALTER TABLE "ProposerVote" ADD COLUMN     "rollup_address" VARCHAR(42);

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "rollup_address" VARCHAR(42);

-- AlterTable
ALTER TABLE "ProviderAttester" ADD COLUMN     "rollup_address" VARCHAR(42);

-- AlterTable
ALTER TABLE "ProviderQueueDrip" ADD COLUMN     "rollup_address" VARCHAR(42);

-- AlterTable
ALTER TABLE "SlashSlashed" ADD COLUMN     "rollup_address" VARCHAR(42);

-- AlterTable
ALTER TABLE "TallyRoundExecuted" ADD COLUMN     "rollup_address" VARCHAR(42);

-- AlterTable
ALTER TABLE "TallyVoteCast" ADD COLUMN     "rollup_address" VARCHAR(42);

-- AlterTable
ALTER TABLE "ValidatorAttestation" ADD COLUMN     "rollup_address" VARCHAR(42);

-- AlterTable
ALTER TABLE "ValidatorEpochPerformance" ADD COLUMN     "rollup_address" VARCHAR(42);

-- CreateTable
CREATE TABLE "CanonicalRollupUpdated" (
    "id" TEXT NOT NULL,
    "instance_address" CHAR(42) NOT NULL,
    "version" VARCHAR(20) NOT NULL,
    "block_number" VARCHAR(20) NOT NULL,
    "transaction_hash" CHAR(66) NOT NULL,
    "log_index" VARCHAR(10) NOT NULL,
    "timestamp" BIGINT,

    CONSTRAINT "CanonicalRollupUpdated_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CanonicalRollupUpdated_instance_address_idx" ON "CanonicalRollupUpdated"("instance_address");

-- CreateIndex
CREATE INDEX "CanonicalRollupUpdated_version_idx" ON "CanonicalRollupUpdated"("version");

-- CreateIndex
CREATE UNIQUE INDEX "CanonicalRollupUpdated_transaction_hash_log_index_key" ON "CanonicalRollupUpdated"("transaction_hash", "log_index");

-- CreateIndex
CREATE INDEX "Epoch_rollup_address_idx" ON "Epoch"("rollup_address");

-- CreateIndex
CREATE INDEX "L2ProofVerified_rollup_address_idx" ON "L2ProofVerified"("rollup_address");

-- CreateIndex
CREATE INDEX "MaterializerCheckpoint_rollup_address_idx" ON "MaterializerCheckpoint"("rollup_address");

-- CreateIndex
CREATE INDEX "ProposerPayloadSubmittable_rollup_address_idx" ON "ProposerPayloadSubmittable"("rollup_address");

-- CreateIndex
CREATE INDEX "ProposerPayloadSubmitted_rollup_address_idx" ON "ProposerPayloadSubmitted"("rollup_address");

-- CreateIndex
CREATE INDEX "ProposerVote_rollup_address_idx" ON "ProposerVote"("rollup_address");

-- CreateIndex
CREATE INDEX "Provider_rollup_address_idx" ON "Provider"("rollup_address");

-- CreateIndex
CREATE INDEX "ProviderAttester_rollup_address_idx" ON "ProviderAttester"("rollup_address");

-- CreateIndex
CREATE INDEX "ProviderQueueDrip_rollup_address_idx" ON "ProviderQueueDrip"("rollup_address");

-- CreateIndex
CREATE INDEX "SlashSlashed_rollup_address_idx" ON "SlashSlashed"("rollup_address");

-- CreateIndex
CREATE INDEX "TallyRoundExecuted_rollup_address_idx" ON "TallyRoundExecuted"("rollup_address");

-- CreateIndex
CREATE INDEX "TallyVoteCast_rollup_address_idx" ON "TallyVoteCast"("rollup_address");

-- CreateIndex
CREATE INDEX "ValidatorAttestation_rollup_address_idx" ON "ValidatorAttestation"("rollup_address");

-- CreateIndex
CREATE INDEX "ValidatorEpochPerformance_rollup_address_idx" ON "ValidatorEpochPerformance"("rollup_address");
