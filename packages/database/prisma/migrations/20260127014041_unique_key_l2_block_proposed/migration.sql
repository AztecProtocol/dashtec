/*
  Warnings:

  - A unique constraint covering the columns `[transaction_hash,log_index]` on the table `L2BlockProposed` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "stream_processor_checkpoint" (
    "id" TEXT NOT NULL,
    "last_block_number" BIGINT NOT NULL,
    "last_block_hash" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stream_processor_checkpoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "L2BlockProposed_transaction_hash_log_index_key" ON "L2BlockProposed"("transaction_hash", "log_index");
