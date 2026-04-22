/*
  Warnings:

  - You are about to drop the column `blocks_mined` on the `ValidatorEpochPerformance` table. All the data in the column will be lost.
  - You are about to drop the column `blocks_proposed` on the `ValidatorEpochPerformance` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ValidatorEpochPerformance" DROP COLUMN "blocks_mined",
DROP COLUMN "blocks_proposed",
ADD COLUMN     "checkpoints_mined" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "checkpoints_missed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "checkpoints_proposed" INTEGER NOT NULL DEFAULT 0;
