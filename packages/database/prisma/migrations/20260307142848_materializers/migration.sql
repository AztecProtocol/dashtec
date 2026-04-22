-- CreateTable
CREATE TABLE "MaterializedValidatorDeposit" (
    "id" TEXT NOT NULL,
    "attester_address" VARCHAR(42) NOT NULL,
    "withdrawer_address" VARCHAR(42) NOT NULL,
    "rollup_address" VARCHAR(42) NOT NULL,
    "amount" VARCHAR(30) NOT NULL,
    "block_number" VARCHAR(20) NOT NULL,
    "log_index" VARCHAR(10) NOT NULL,
    "transaction_hash" CHAR(66) NOT NULL,
    "timestamp" BIGINT,
    "extra" JSONB,

    CONSTRAINT "MaterializedValidatorDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterializedValidatorGseDeposit" (
    "id" TEXT NOT NULL,
    "attester_address" VARCHAR(42) NOT NULL,
    "withdrawer_address" VARCHAR(42) NOT NULL,
    "instance_address" VARCHAR(42) NOT NULL,
    "move_with_latest_rollup" BOOLEAN NOT NULL,
    "block_number" VARCHAR(20) NOT NULL,
    "log_index" VARCHAR(10) NOT NULL,
    "transaction_hash" CHAR(66) NOT NULL,
    "timestamp" BIGINT,
    "extra" JSONB,

    CONSTRAINT "MaterializedValidatorGseDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterializedValidatorFailedDeposit" (
    "id" TEXT NOT NULL,
    "attester_address" VARCHAR(42) NOT NULL,
    "withdrawer_address" VARCHAR(42) NOT NULL,
    "rollup_address" VARCHAR(42) NOT NULL,
    "block_number" VARCHAR(20) NOT NULL,
    "log_index" VARCHAR(10) NOT NULL,
    "transaction_hash" CHAR(66) NOT NULL,
    "timestamp" BIGINT,
    "extra" JSONB,

    CONSTRAINT "MaterializedValidatorFailedDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterializedValidatorQueued" (
    "id" TEXT NOT NULL,
    "attester_address" VARCHAR(42) NOT NULL,
    "withdrawer_address" VARCHAR(42) NOT NULL,
    "rollup_address" VARCHAR(42) NOT NULL,
    "block_number" VARCHAR(20) NOT NULL,
    "log_index" VARCHAR(10) NOT NULL,
    "transaction_hash" CHAR(66) NOT NULL,
    "timestamp" BIGINT,

    CONSTRAINT "MaterializedValidatorQueued_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterializedValidatorWithdrawInitiated" (
    "id" TEXT NOT NULL,
    "attester_address" VARCHAR(42) NOT NULL,
    "recipient_address" VARCHAR(42) NOT NULL,
    "rollup_address" VARCHAR(42) NOT NULL,
    "amount" VARCHAR(30) NOT NULL,
    "block_number" VARCHAR(20) NOT NULL,
    "log_index" VARCHAR(10) NOT NULL,
    "transaction_hash" CHAR(66) NOT NULL,
    "timestamp" BIGINT,

    CONSTRAINT "MaterializedValidatorWithdrawInitiated_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterializedValidatorWithdrawFinalized" (
    "id" TEXT NOT NULL,
    "attester_address" VARCHAR(42) NOT NULL,
    "recipient_address" VARCHAR(42) NOT NULL,
    "rollup_address" VARCHAR(42) NOT NULL,
    "amount" VARCHAR(30) NOT NULL,
    "block_number" VARCHAR(20) NOT NULL,
    "log_index" VARCHAR(10) NOT NULL,
    "transaction_hash" CHAR(66) NOT NULL,
    "timestamp" BIGINT,

    CONSTRAINT "MaterializedValidatorWithdrawFinalized_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterializedValidatorStakeHistory" (
    "id" TEXT NOT NULL,
    "attester_address" VARCHAR(42) NOT NULL,
    "rollup_address" VARCHAR(42) NOT NULL,
    "event_type" VARCHAR(20) NOT NULL,
    "amount" VARCHAR(30) NOT NULL,
    "block_number" VARCHAR(20) NOT NULL,
    "log_index" VARCHAR(10) NOT NULL,
    "transaction_hash" CHAR(66) NOT NULL,
    "timestamp" BIGINT,

    CONSTRAINT "MaterializedValidatorStakeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterializedValidatorDeposit_attester_address_idx" ON "MaterializedValidatorDeposit"("attester_address");

-- CreateIndex
CREATE INDEX "MaterializedValidatorDeposit_rollup_address_idx" ON "MaterializedValidatorDeposit"("rollup_address");

-- CreateIndex
CREATE INDEX "MaterializedValidatorDeposit_block_number_idx" ON "MaterializedValidatorDeposit"("block_number");

-- CreateIndex
CREATE UNIQUE INDEX "MaterializedValidatorDeposit_transaction_hash_log_index_key" ON "MaterializedValidatorDeposit"("transaction_hash", "log_index");

-- CreateIndex
CREATE INDEX "MaterializedValidatorGseDeposit_attester_address_idx" ON "MaterializedValidatorGseDeposit"("attester_address");

-- CreateIndex
CREATE INDEX "MaterializedValidatorGseDeposit_instance_address_idx" ON "MaterializedValidatorGseDeposit"("instance_address");

-- CreateIndex
CREATE INDEX "MaterializedValidatorGseDeposit_block_number_idx" ON "MaterializedValidatorGseDeposit"("block_number");

-- CreateIndex
CREATE UNIQUE INDEX "MaterializedValidatorGseDeposit_transaction_hash_log_index_key" ON "MaterializedValidatorGseDeposit"("transaction_hash", "log_index");

-- CreateIndex
CREATE INDEX "MaterializedValidatorFailedDeposit_attester_address_idx" ON "MaterializedValidatorFailedDeposit"("attester_address");

-- CreateIndex
CREATE INDEX "MaterializedValidatorFailedDeposit_rollup_address_idx" ON "MaterializedValidatorFailedDeposit"("rollup_address");

-- CreateIndex
CREATE INDEX "MaterializedValidatorFailedDeposit_block_number_idx" ON "MaterializedValidatorFailedDeposit"("block_number");

-- CreateIndex
CREATE UNIQUE INDEX "MaterializedValidatorFailedDeposit_transaction_hash_log_ind_key" ON "MaterializedValidatorFailedDeposit"("transaction_hash", "log_index");

-- CreateIndex
CREATE INDEX "MaterializedValidatorQueued_attester_address_idx" ON "MaterializedValidatorQueued"("attester_address");

-- CreateIndex
CREATE INDEX "MaterializedValidatorQueued_rollup_address_idx" ON "MaterializedValidatorQueued"("rollup_address");

-- CreateIndex
CREATE INDEX "MaterializedValidatorQueued_block_number_idx" ON "MaterializedValidatorQueued"("block_number");

-- CreateIndex
CREATE UNIQUE INDEX "MaterializedValidatorQueued_transaction_hash_log_index_key" ON "MaterializedValidatorQueued"("transaction_hash", "log_index");

-- CreateIndex
CREATE INDEX "MaterializedValidatorWithdrawInitiated_attester_address_idx" ON "MaterializedValidatorWithdrawInitiated"("attester_address");

-- CreateIndex
CREATE INDEX "MaterializedValidatorWithdrawInitiated_rollup_address_idx" ON "MaterializedValidatorWithdrawInitiated"("rollup_address");

-- CreateIndex
CREATE INDEX "MaterializedValidatorWithdrawInitiated_block_number_idx" ON "MaterializedValidatorWithdrawInitiated"("block_number");

-- CreateIndex
CREATE UNIQUE INDEX "MaterializedValidatorWithdrawInitiated_transaction_hash_log_key" ON "MaterializedValidatorWithdrawInitiated"("transaction_hash", "log_index");

-- CreateIndex
CREATE INDEX "MaterializedValidatorWithdrawFinalized_attester_address_idx" ON "MaterializedValidatorWithdrawFinalized"("attester_address");

-- CreateIndex
CREATE INDEX "MaterializedValidatorWithdrawFinalized_rollup_address_idx" ON "MaterializedValidatorWithdrawFinalized"("rollup_address");

-- CreateIndex
CREATE INDEX "MaterializedValidatorWithdrawFinalized_block_number_idx" ON "MaterializedValidatorWithdrawFinalized"("block_number");

-- CreateIndex
CREATE UNIQUE INDEX "MaterializedValidatorWithdrawFinalized_transaction_hash_log_key" ON "MaterializedValidatorWithdrawFinalized"("transaction_hash", "log_index");

-- CreateIndex
CREATE INDEX "MaterializedValidatorStakeHistory_attester_address_idx" ON "MaterializedValidatorStakeHistory"("attester_address");

-- CreateIndex
CREATE INDEX "MaterializedValidatorStakeHistory_rollup_address_idx" ON "MaterializedValidatorStakeHistory"("rollup_address");

-- CreateIndex
CREATE INDEX "MaterializedValidatorStakeHistory_block_number_idx" ON "MaterializedValidatorStakeHistory"("block_number");

-- CreateIndex
CREATE INDEX "MaterializedValidatorStakeHistory_event_type_idx" ON "MaterializedValidatorStakeHistory"("event_type");

-- CreateIndex
CREATE UNIQUE INDEX "MaterializedValidatorStakeHistory_transaction_hash_log_inde_key" ON "MaterializedValidatorStakeHistory"("transaction_hash", "log_index");
