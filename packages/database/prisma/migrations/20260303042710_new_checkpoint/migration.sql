-- AlterTable
ALTER TABLE "L2BlockProposed" ADD COLUMN     "attestations_hash" CHAR(66),
ADD COLUMN     "payload_digest" CHAR(66);

-- CreateTable
CREATE TABLE "CheckpointInvalidated" (
    "id" TEXT NOT NULL,
    "checkpoint_number" BIGINT NOT NULL,
    "block_number" BIGINT NOT NULL,
    "transaction_hash" CHAR(66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "timestamp" BIGINT NOT NULL,

    CONSTRAINT "CheckpointInvalidated_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckpointInvalidated_checkpoint_number_idx" ON "CheckpointInvalidated"("checkpoint_number");

-- CreateIndex
CREATE UNIQUE INDEX "CheckpointInvalidated_transaction_hash_log_index_key" ON "CheckpointInvalidated"("transaction_hash", "log_index");
