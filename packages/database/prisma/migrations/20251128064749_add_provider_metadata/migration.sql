-- CreateTable
CREATE TABLE "ProviderMetadata" (
    "id" CHAR(36) NOT NULL,
    "providerIdentifier" VARCHAR(78) NOT NULL,
    "name" VARCHAR(255),
    "description" TEXT,
    "website" VARCHAR(512),
    "logoUrl" VARCHAR(512),
    "email" VARCHAR(255),
    "discord" VARCHAR(255),
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderMetadata_providerIdentifier_key" ON "ProviderMetadata"("providerIdentifier");

-- CreateIndex
CREATE INDEX "ProviderMetadata_providerIdentifier_idx" ON "ProviderMetadata"("providerIdentifier");

-- CreateIndex
CREATE INDEX "ProviderMetadata_lastUpdated_idx" ON "ProviderMetadata"("lastUpdated");
