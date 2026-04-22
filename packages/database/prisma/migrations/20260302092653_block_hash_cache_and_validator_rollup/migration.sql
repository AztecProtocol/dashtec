-- AlterTable
ALTER TABLE "Validator" ADD COLUMN     "rollup_address" VARCHAR(42);

-- CreateTable
CREATE TABLE "BlockHashCache" (
    "blockNumber" BIGINT NOT NULL,
    "blockHash" CHAR(66) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockHashCache_pkey" PRIMARY KEY ("blockNumber")
);
