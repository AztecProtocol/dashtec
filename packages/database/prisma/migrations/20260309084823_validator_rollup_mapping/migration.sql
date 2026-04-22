-- CreateTable
CREATE TABLE "ValidatorRollup" (
    "id" UUID NOT NULL,
    "address" VARCHAR(42) NOT NULL,
    "rollup_address" VARCHAR(42) NOT NULL,
    "migration_status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "deposit_type" VARCHAR(20) NOT NULL,
    "block_number" VARCHAR(20) NOT NULL,
    "transaction_hash" VARCHAR(66) NOT NULL,
    "log_index" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValidatorRollup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ValidatorRollup_rollup_address_idx" ON "ValidatorRollup"("rollup_address");

-- CreateIndex
CREATE INDEX "ValidatorRollup_address_idx" ON "ValidatorRollup"("address");

-- CreateIndex
CREATE INDEX "ValidatorRollup_migration_status_idx" ON "ValidatorRollup"("migration_status");

-- CreateIndex
CREATE UNIQUE INDEX "ValidatorRollup_address_rollup_address_key" ON "ValidatorRollup"("address", "rollup_address");

-- CreateIndex
CREATE UNIQUE INDEX "ValidatorRollup_transaction_hash_log_index_key" ON "ValidatorRollup"("transaction_hash", "log_index");
