-- CreateTable
CREATE TABLE "TokenPrice" (
    "id" UUID NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "price_usd" DOUBLE PRECISION NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "source" VARCHAR(50) NOT NULL DEFAULT 'hyperliquid',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TokenPrice_symbol_idx" ON "TokenPrice"("symbol");

-- CreateIndex
CREATE INDEX "TokenPrice_timestamp_idx" ON "TokenPrice"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "TokenPrice_symbol_timestamp_key" ON "TokenPrice"("symbol", "timestamp");
