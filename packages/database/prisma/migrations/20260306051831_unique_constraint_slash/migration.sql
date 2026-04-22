/*
  Warnings:

  - A unique constraint covering the columns `[round_number,action_index,validator_address,rollup_address]` on the table `TallySlashAction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[round_number,epoch_index,rollup_address]` on the table `TallySlashTargetCommittee` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TallySlashAction_round_number_action_index_validator_addres_key";

-- DropIndex
DROP INDEX "TallySlashTargetCommittee_round_number_epoch_index_key";

-- AlterTable
ALTER TABLE "CheckpointInvalidated" ADD COLUMN     "rollup_address" VARCHAR(42) NOT NULL DEFAULT '0x0000000000000000000000000000000000000000';

-- AlterTable
ALTER TABLE "GovernanceProposerPayload" ADD COLUMN     "rollup_address" VARCHAR(42) NOT NULL DEFAULT '0x0000000000000000000000000000000000000000';

-- AlterTable
ALTER TABLE "SlashFactoryPayload" ADD COLUMN     "rollup_address" VARCHAR(42) NOT NULL DEFAULT '0x0000000000000000000000000000000000000000';

-- AlterTable
ALTER TABLE "TallySlashAction" ADD COLUMN     "rollup_address" VARCHAR(42) NOT NULL DEFAULT '0x0000000000000000000000000000000000000000';

-- AlterTable
ALTER TABLE "TallySlashTargetCommittee" ADD COLUMN     "rollup_address" VARCHAR(42) NOT NULL DEFAULT '0x0000000000000000000000000000000000000000';

-- AlterTable
ALTER TABLE "ValidatorQueue" ADD COLUMN     "rollup_address" VARCHAR(42) NOT NULL DEFAULT '0x0000000000000000000000000000000000000000';

-- CreateIndex
CREATE INDEX "CheckpointInvalidated_rollup_address_idx" ON "CheckpointInvalidated"("rollup_address");

-- CreateIndex
CREATE INDEX "GovernanceProposerPayload_rollup_address_idx" ON "GovernanceProposerPayload"("rollup_address");

-- CreateIndex
CREATE INDEX "SlashFactoryPayload_rollup_address_idx" ON "SlashFactoryPayload"("rollup_address");

-- CreateIndex
CREATE INDEX "TallySlashAction_rollup_address_idx" ON "TallySlashAction"("rollup_address");

-- CreateIndex
CREATE UNIQUE INDEX "TallySlashAction_round_number_action_index_validator_addres_key" ON "TallySlashAction"("round_number", "action_index", "validator_address", "rollup_address");

-- CreateIndex
CREATE INDEX "TallySlashTargetCommittee_rollup_address_idx" ON "TallySlashTargetCommittee"("rollup_address");

-- CreateIndex
CREATE UNIQUE INDEX "TallySlashTargetCommittee_round_number_epoch_index_rollup_a_key" ON "TallySlashTargetCommittee"("round_number", "epoch_index", "rollup_address");

-- CreateIndex
CREATE INDEX "ValidatorQueue_rollup_address_idx" ON "ValidatorQueue"("rollup_address");
