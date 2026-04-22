/*
  Warnings:

  - The primary key for the `Epoch` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `EpochIntegrityStats` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `MaterializerCheckpoint` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[slot_number,validator_address,rollup_address]` on the table `ValidatorAttestation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[epoch_number,validator_address,rollup_address]` on the table `ValidatorEpochPerformance` will be added. If there are existing duplicate values, this will fail.
  - Made the column `rollup_address` on table `Epoch` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rollup_address` on table `L2ProofVerified` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rollup_address` on table `MaterializerCheckpoint` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rollup_address` on table `ProposerPayloadSubmittable` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rollup_address` on table `ProposerPayloadSubmitted` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rollup_address` on table `ProposerVote` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rollup_address` on table `Provider` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rollup_address` on table `ProviderAttester` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rollup_address` on table `ProviderQueueDrip` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rollup_address` on table `SlashSlashed` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rollup_address` on table `TallyRoundExecuted` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rollup_address` on table `TallyVoteCast` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rollup_address` on table `Validator` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rollup_address` on table `ValidatorAttestation` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rollup_address` on table `ValidatorEpochPerformance` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "EpochIntegrityStats" DROP CONSTRAINT "EpochIntegrityStats_epoch_number_fkey";

-- DropForeignKey
ALTER TABLE "ValidatorAttestation" DROP CONSTRAINT "ValidatorAttestation_epoch_number_fkey";

-- DropForeignKey
ALTER TABLE "ValidatorEpochPerformance" DROP CONSTRAINT "ValidatorEpochPerformance_epoch_number_fkey";

-- DropIndex
DROP INDEX "ValidatorAttestation_slot_number_validator_address_key";

-- DropIndex
DROP INDEX "ValidatorEpochPerformance_epoch_number_validator_address_key";

-- AlterTable
ALTER TABLE "Epoch" DROP CONSTRAINT "Epoch_pkey",
ALTER COLUMN "rollup_address" SET NOT NULL,
ALTER COLUMN "rollup_address" SET DEFAULT '0x0000000000000000000000000000000000000000',
ADD CONSTRAINT "Epoch_pkey" PRIMARY KEY ("epoch_number", "rollup_address");

-- AlterTable
ALTER TABLE "EpochIntegrityStats" DROP CONSTRAINT "EpochIntegrityStats_pkey",
ADD COLUMN     "rollup_address" VARCHAR(42) NOT NULL DEFAULT '0x0000000000000000000000000000000000000000',
ADD CONSTRAINT "EpochIntegrityStats_pkey" PRIMARY KEY ("epoch_number", "rollup_address");

-- AlterTable
ALTER TABLE "L2ProofVerified" ALTER COLUMN "rollup_address" SET NOT NULL,
ALTER COLUMN "rollup_address" SET DEFAULT '0x0000000000000000000000000000000000000000';

-- AlterTable
ALTER TABLE "MaterializerCheckpoint" DROP CONSTRAINT "MaterializerCheckpoint_pkey",
ALTER COLUMN "rollup_address" SET NOT NULL,
ALTER COLUMN "rollup_address" SET DEFAULT '0x0000000000000000000000000000000000000000',
ADD CONSTRAINT "MaterializerCheckpoint_pkey" PRIMARY KEY ("checkpointName", "rollup_address");

-- AlterTable
ALTER TABLE "ProposerPayloadSubmittable" ALTER COLUMN "rollup_address" SET NOT NULL,
ALTER COLUMN "rollup_address" SET DEFAULT '0x0000000000000000000000000000000000000000';

-- AlterTable
ALTER TABLE "ProposerPayloadSubmitted" ALTER COLUMN "rollup_address" SET NOT NULL,
ALTER COLUMN "rollup_address" SET DEFAULT '0x0000000000000000000000000000000000000000';

-- AlterTable
ALTER TABLE "ProposerVote" ALTER COLUMN "rollup_address" SET NOT NULL,
ALTER COLUMN "rollup_address" SET DEFAULT '0x0000000000000000000000000000000000000000';

-- AlterTable
ALTER TABLE "Provider" ALTER COLUMN "rollup_address" SET NOT NULL,
ALTER COLUMN "rollup_address" SET DEFAULT '0x0000000000000000000000000000000000000000';

-- AlterTable
ALTER TABLE "ProviderAttester" ALTER COLUMN "rollup_address" SET NOT NULL,
ALTER COLUMN "rollup_address" SET DEFAULT '0x0000000000000000000000000000000000000000';

-- AlterTable
ALTER TABLE "ProviderQueueDrip" ALTER COLUMN "rollup_address" SET NOT NULL,
ALTER COLUMN "rollup_address" SET DEFAULT '0x0000000000000000000000000000000000000000';

-- AlterTable
ALTER TABLE "SlashSlashed" ALTER COLUMN "rollup_address" SET NOT NULL,
ALTER COLUMN "rollup_address" SET DEFAULT '0x0000000000000000000000000000000000000000';

-- AlterTable
ALTER TABLE "TallyRoundExecuted" ALTER COLUMN "rollup_address" SET NOT NULL,
ALTER COLUMN "rollup_address" SET DEFAULT '0x0000000000000000000000000000000000000000';

-- AlterTable
ALTER TABLE "TallyVoteCast" ALTER COLUMN "rollup_address" SET NOT NULL,
ALTER COLUMN "rollup_address" SET DEFAULT '0x0000000000000000000000000000000000000000';

-- AlterTable
ALTER TABLE "Validator" ALTER COLUMN "rollup_address" SET NOT NULL,
ALTER COLUMN "rollup_address" SET DEFAULT '0x0000000000000000000000000000000000000000';

-- AlterTable
ALTER TABLE "ValidatorAttestation" ALTER COLUMN "rollup_address" SET NOT NULL,
ALTER COLUMN "rollup_address" SET DEFAULT '0x0000000000000000000000000000000000000000';

-- AlterTable
ALTER TABLE "ValidatorEpochPerformance" ALTER COLUMN "rollup_address" SET NOT NULL,
ALTER COLUMN "rollup_address" SET DEFAULT '0x0000000000000000000000000000000000000000';

-- CreateIndex
CREATE INDEX "EpochIntegrityStats_rollup_address_idx" ON "EpochIntegrityStats"("rollup_address");

-- CreateIndex
CREATE UNIQUE INDEX "ValidatorAttestation_slot_number_validator_address_rollup_a_key" ON "ValidatorAttestation"("slot_number", "validator_address", "rollup_address");

-- CreateIndex
CREATE UNIQUE INDEX "ValidatorEpochPerformance_epoch_number_validator_address_ro_key" ON "ValidatorEpochPerformance"("epoch_number", "validator_address", "rollup_address");

-- AddForeignKey
ALTER TABLE "EpochIntegrityStats" ADD CONSTRAINT "EpochIntegrityStats_epoch_number_rollup_address_fkey" FOREIGN KEY ("epoch_number", "rollup_address") REFERENCES "Epoch"("epoch_number", "rollup_address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidatorAttestation" ADD CONSTRAINT "ValidatorAttestation_epoch_number_rollup_address_fkey" FOREIGN KEY ("epoch_number", "rollup_address") REFERENCES "Epoch"("epoch_number", "rollup_address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidatorEpochPerformance" ADD CONSTRAINT "ValidatorEpochPerformance_epoch_number_rollup_address_fkey" FOREIGN KEY ("epoch_number", "rollup_address") REFERENCES "Epoch"("epoch_number", "rollup_address") ON DELETE RESTRICT ON UPDATE CASCADE;
