-- CreateTable
CREATE TABLE "L2ProofVerified" (
    "id" TEXT NOT NULL,
    "l2_block_number" BIGINT NOT NULL,
    "prover_id" CHAR(42) NOT NULL,
    "block_number" BIGINT NOT NULL,
    "transaction_hash" CHAR(66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "epoch_number" TEXT,
    "transaction_from" CHAR(42) NOT NULL,
    "transaction_to" CHAR(42),
    "transaction_gas" BIGINT NOT NULL,
    "transaction_gas_price" BIGINT,
    "transaction_value" BIGINT NOT NULL,
    "transaction_nonce" INTEGER NOT NULL,
    "transaction_max_fee_per_gas" BIGINT,
    "transaction_max_priority_fee_per_gas" BIGINT,

    CONSTRAINT "L2ProofVerified_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterializerProviderValidatorList" (
    "providerIdentifier" VARCHAR(78) NOT NULL,
    "attesterAddress" VARCHAR(42) NOT NULL,
    "blockNumber" VARCHAR(20) NOT NULL,
    "logIndex" VARCHAR(10) NOT NULL,
    "timestamp" VARCHAR(30),
    "txHash" VARCHAR(66),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterializerProviderValidatorList_pkey" PRIMARY KEY ("blockNumber","logIndex")
);

-- CreateTable
CREATE TABLE "MaterializerValidatorStatusHistory" (
    "attesterAddress" VARCHAR(42) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "blockNumber" VARCHAR(20) NOT NULL,
    "logIndex" VARCHAR(10) NOT NULL,
    "timestamp" VARCHAR(30),
    "txHash" VARCHAR(66),

    CONSTRAINT "MaterializerValidatorStatusHistory_pkey" PRIMARY KEY ("attesterAddress")
);

-- CreateTable
CREATE TABLE "MaterializerValidatorBalanceHistory" (
    "attesterAddress" VARCHAR(42) NOT NULL,
    "balance" DECIMAL(30,2) NOT NULL,
    "blockNumber" VARCHAR(20) NOT NULL,
    "logIndex" VARCHAR(10) NOT NULL,
    "timestamp" VARCHAR(30),
    "txHash" VARCHAR(66),

    CONSTRAINT "MaterializerValidatorBalanceHistory_pkey" PRIMARY KEY ("attesterAddress")
);

-- CreateTable
CREATE TABLE "MaterializerCheckpoint" (
    "checkpointName" VARCHAR(100) NOT NULL,
    "blockNumber" VARCHAR(20) NOT NULL DEFAULT '0',
    "logIndex" VARCHAR(10) NOT NULL DEFAULT '0',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterializerCheckpoint_pkey" PRIMARY KEY ("checkpointName")
);

-- CreateIndex
CREATE INDEX "L2ProofVerified_l2_block_number_idx" ON "L2ProofVerified"("l2_block_number");

-- CreateIndex
CREATE INDEX "L2ProofVerified_prover_id_idx" ON "L2ProofVerified"("prover_id");

-- CreateIndex
CREATE INDEX "L2ProofVerified_transaction_from_idx" ON "L2ProofVerified"("transaction_from");

-- CreateIndex
CREATE INDEX "idx_prover_epoch" ON "L2ProofVerified"("prover_id", "epoch_number" DESC);

-- CreateIndex
CREATE INDEX "idx_prover_timestamp" ON "L2ProofVerified"("prover_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_prover_gas" ON "L2ProofVerified"("prover_id", "transaction_gas", "transaction_gas_price");

-- CreateIndex
CREATE UNIQUE INDEX "L2ProofVerified_transaction_hash_log_index_key" ON "L2ProofVerified"("transaction_hash", "log_index");

-- CreateIndex
CREATE INDEX "MaterializerProviderValidatorList_providerIdentifier_attest_idx" ON "MaterializerProviderValidatorList"("providerIdentifier", "attesterAddress");

-- CreateIndex
CREATE INDEX "MaterializerProviderValidatorList_providerIdentifier_idx" ON "MaterializerProviderValidatorList"("providerIdentifier");

-- CreateIndex
CREATE INDEX "MaterializerProviderValidatorList_attesterAddress_idx" ON "MaterializerProviderValidatorList"("attesterAddress");

-- CreateIndex
CREATE INDEX "MaterializerValidatorStatusHistory_attesterAddress_status_idx" ON "MaterializerValidatorStatusHistory"("attesterAddress", "status");

-- CreateIndex
CREATE INDEX "MaterializerValidatorStatusHistory_attesterAddress_idx" ON "MaterializerValidatorStatusHistory"("attesterAddress");

-- CreateIndex
CREATE INDEX "MaterializerValidatorStatusHistory_status_idx" ON "MaterializerValidatorStatusHistory"("status");

-- CreateIndex
CREATE INDEX "MaterializerValidatorStatusHistory_blockNumber_logIndex_idx" ON "MaterializerValidatorStatusHistory"("blockNumber", "logIndex");

-- CreateIndex
CREATE INDEX "MaterializerValidatorBalanceHistory_attesterAddress_balance_idx" ON "MaterializerValidatorBalanceHistory"("attesterAddress", "balance");

-- CreateIndex
CREATE INDEX "MaterializerValidatorBalanceHistory_attesterAddress_idx" ON "MaterializerValidatorBalanceHistory"("attesterAddress");

-- CreateIndex
CREATE INDEX "MaterializerValidatorBalanceHistory_balance_idx" ON "MaterializerValidatorBalanceHistory"("balance");

-- CreateIndex
CREATE INDEX "MaterializerValidatorBalanceHistory_blockNumber_logIndex_idx" ON "MaterializerValidatorBalanceHistory"("blockNumber", "logIndex");
