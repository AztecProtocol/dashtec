-- CreateTable
CREATE TABLE "L2BlockProposed" (
    "id" TEXT NOT NULL,
    "l2_block_number" BIGINT NOT NULL,
    "archive" CHAR(66) NOT NULL,
    "versioned_blob_hashes" TEXT NOT NULL,
    "rollup_address" CHAR(42) NOT NULL,
    "block_number" BIGINT NOT NULL,
    "transaction_hash" CHAR(66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "slot_number" BIGINT NOT NULL,
    "coinbase" CHAR(42) NOT NULL,

    CONSTRAINT "L2BlockProposed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "L2BlockProposed_coinbase_idx" ON "L2BlockProposed"("coinbase");

-- CreateIndex
CREATE INDEX "L2BlockProposed_l2_block_number_idx" ON "L2BlockProposed"("l2_block_number");

-- CreateIndex
CREATE INDEX "L2BlockProposed_archive_idx" ON "L2BlockProposed"("archive");
