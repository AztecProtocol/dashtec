/*
  Warnings:

  - Added the required column `block_number` to the `TallySlashTargetCommittee` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TallySlashTargetCommittee" ADD COLUMN     "block_number" VARCHAR(20) NOT NULL;

-- CreateIndex
CREATE INDEX "TallySlashTargetCommittee_block_number_idx" ON "TallySlashTargetCommittee"("block_number");
