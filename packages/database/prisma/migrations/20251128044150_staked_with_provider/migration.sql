-- CreateTable
CREATE TABLE "StakedWithProvider" (
    "id" CHAR(36) NOT NULL,
    "providerIdentifier" VARCHAR(78) NOT NULL,
    "rollupAddress" CHAR(42) NOT NULL,
    "attesterAddress" CHAR(42) NOT NULL,
    "coinbaseSplitContractAddress" CHAR(42) NOT NULL,
    "stakerAddress" CHAR(42) NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "txHash" CHAR(66) NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "timestamp" BIGINT NOT NULL,

    CONSTRAINT "StakedWithProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StakedWithProvider_providerIdentifier_idx" ON "StakedWithProvider"("providerIdentifier");

-- CreateIndex
CREATE INDEX "StakedWithProvider_attesterAddress_idx" ON "StakedWithProvider"("attesterAddress");

-- CreateIndex
CREATE INDEX "StakedWithProvider_stakerAddress_idx" ON "StakedWithProvider"("stakerAddress");

-- CreateIndex
CREATE UNIQUE INDEX "StakedWithProvider_txHash_logIndex_key" ON "StakedWithProvider"("txHash", "logIndex");
