/*
  Warnings:

  - The primary key for the `MaterializerProviderValidatorList` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `timestamp` column on the `MaterializerProviderValidatorList` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[providerIdentifier,attesterAddress]` on the table `MaterializerProviderValidatorList` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `MaterializerProviderValidatorList` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Changed the type of `blockNumber` on the `MaterializerProviderValidatorList` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `logIndex` on the `MaterializerProviderValidatorList` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- Truncate old event-log data before restructuring to state table
TRUNCATE TABLE "MaterializerProviderValidatorList";

-- DropIndex
DROP INDEX "MaterializerProviderValidatorList_providerIdentifier_attest_idx";

-- AlterTable
ALTER TABLE "MaterializerProviderValidatorList" DROP CONSTRAINT "MaterializerProviderValidatorList_pkey",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "blockNumber",
ADD COLUMN     "blockNumber" BIGINT NOT NULL,
DROP COLUMN "logIndex",
ADD COLUMN     "logIndex" INTEGER NOT NULL,
DROP COLUMN "timestamp",
ADD COLUMN     "timestamp" BIGINT,
ADD CONSTRAINT "MaterializerProviderValidatorList_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "MaterializerProviderValidatorList_providerIdentifier_attest_key" ON "MaterializerProviderValidatorList"("providerIdentifier", "attesterAddress");
