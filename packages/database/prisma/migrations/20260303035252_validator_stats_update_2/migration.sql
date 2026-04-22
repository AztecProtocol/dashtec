/*
  Warnings:

  - You are about to drop the column `total_blocks_mined` on the `Epoch` table. All the data in the column will be lost.
  - You are about to drop the column `total_blocks_proposed` on the `Epoch` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Epoch" DROP COLUMN "total_blocks_mined",
DROP COLUMN "total_blocks_proposed",
ADD COLUMN     "total_checkpoints_mined" BIGINT,
ADD COLUMN     "total_checkpoints_missed" BIGINT,
ADD COLUMN     "total_checkpoints_proposed" BIGINT;
