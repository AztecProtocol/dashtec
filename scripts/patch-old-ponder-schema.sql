-- Patch ponder_prod schema to match current ponder.schema.ts
-- Run against: target database (e.g. dashtec)
-- Purpose: Allow materializers to read from old Ponder data that predates multi-rollup migration

-- ============================================================
-- validator_queue: add rollup_address, timestamp
-- ============================================================
ALTER TABLE ponder_prod.validator_queue
  ADD COLUMN IF NOT EXISTS rollup_address text,
  ADD COLUMN IF NOT EXISTS timestamp bigint;

-- ============================================================
-- deposit: add attester_status, effective_balance, validator_hex_index
-- ============================================================
ALTER TABLE ponder_prod.deposit
  ADD COLUMN IF NOT EXISTS attester_status text,
  ADD COLUMN IF NOT EXISTS effective_balance text,
  ADD COLUMN IF NOT EXISTS validator_hex_index text;

-- ============================================================
-- gse_deposit: add attester_status, effective_balance, validator_hex_index, timestamp
-- ============================================================
ALTER TABLE ponder_prod.gse_deposit
  ADD COLUMN IF NOT EXISTS attester_status text,
  ADD COLUMN IF NOT EXISTS effective_balance text,
  ADD COLUMN IF NOT EXISTS validator_hex_index text,
  ADD COLUMN IF NOT EXISTS timestamp bigint;

-- ============================================================
-- slash_slashed: add rollup_address, timestamp, contract_address
-- ============================================================
ALTER TABLE ponder_prod.slash_slashed
  ADD COLUMN IF NOT EXISTS rollup_address text,
  ADD COLUMN IF NOT EXISTS timestamp bigint,
  ADD COLUMN IF NOT EXISTS contract_address text;

-- ============================================================
-- l2_block_proposed: add payload_digest, attestations_hash
-- ============================================================
ALTER TABLE ponder_prod.l2_block_proposed
  ADD COLUMN IF NOT EXISTS payload_digest text,
  ADD COLUMN IF NOT EXISTS attestations_hash text;

-- ============================================================
-- l2_proof_verified: add rollup_address, epoch_number
-- ============================================================
ALTER TABLE ponder_prod.l2_proof_verified
  ADD COLUMN IF NOT EXISTS rollup_address text,
  ADD COLUMN IF NOT EXISTS epoch_number text;

-- ============================================================
-- staked_with_provider: add timestamp
-- ============================================================
ALTER TABLE ponder_prod.staked_with_provider
  ADD COLUMN IF NOT EXISTS timestamp bigint;

-- ============================================================
-- provider_queue_dripped: add rollup_address, timestamp
-- ============================================================
ALTER TABLE ponder_prod.provider_queue_dripped
  ADD COLUMN IF NOT EXISTS rollup_address text,
  ADD COLUMN IF NOT EXISTS timestamp bigint;

-- ============================================================
-- proposer_vote: add rollup_address, timestamp, contract_address
-- ============================================================
ALTER TABLE ponder_prod.proposer_vote
  ADD COLUMN IF NOT EXISTS rollup_address text,
  ADD COLUMN IF NOT EXISTS timestamp bigint,
  ADD COLUMN IF NOT EXISTS contract_address text;

-- ============================================================
-- proposer_payload_submittable: add rollup_address, timestamp, contract_address
-- ============================================================
ALTER TABLE ponder_prod.proposer_payload_submittable
  ADD COLUMN IF NOT EXISTS rollup_address text,
  ADD COLUMN IF NOT EXISTS timestamp bigint,
  ADD COLUMN IF NOT EXISTS contract_address text;

-- ============================================================
-- proposer_payload_submitted: add rollup_address, timestamp, contract_address, submitter_address
-- ============================================================
ALTER TABLE ponder_prod.proposer_payload_submitted
  ADD COLUMN IF NOT EXISTS rollup_address text,
  ADD COLUMN IF NOT EXISTS timestamp bigint,
  ADD COLUMN IF NOT EXISTS contract_address text,
  ADD COLUMN IF NOT EXISTS submitter_address text;

-- ============================================================
-- tally_vote_cast: add rollup_address, epoch_number, timestamp, contract_address
-- ============================================================
ALTER TABLE ponder_prod.tally_vote_cast
  ADD COLUMN IF NOT EXISTS rollup_address text,
  ADD COLUMN IF NOT EXISTS epoch_number bigint,
  ADD COLUMN IF NOT EXISTS timestamp bigint,
  ADD COLUMN IF NOT EXISTS contract_address text;

-- ============================================================
-- provider_take_rate_updated: add rollup_address
-- ============================================================
ALTER TABLE ponder_prod.provider_take_rate_updated
  ADD COLUMN IF NOT EXISTS rollup_address text;

-- ============================================================
-- provider_rewards_recipient_updated: add rollup_address
-- ============================================================
ALTER TABLE ponder_prod.provider_rewards_recipient_updated
  ADD COLUMN IF NOT EXISTS rollup_address text;

-- ============================================================
-- provider_admin_updated: add rollup_address
-- ============================================================
ALTER TABLE ponder_prod.provider_admin_updated
  ADD COLUMN IF NOT EXISTS rollup_address text;

-- ============================================================
-- provider_admin_update_initiated: add rollup_address
-- ============================================================
ALTER TABLE ponder_prod.provider_admin_update_initiated
  ADD COLUMN IF NOT EXISTS rollup_address text;

-- ============================================================
-- attesters_added_to_provider: add rollup_address
-- ============================================================
ALTER TABLE ponder_prod.attesters_added_to_provider
  ADD COLUMN IF NOT EXISTS rollup_address text;

-- ============================================================
-- tally_round_executed: add rollup_address, payload_address, total_slash_amount, vote_count, tally_results, target_committees, timestamp, contract_address
-- ============================================================
ALTER TABLE ponder_prod.tally_round_executed
  ADD COLUMN IF NOT EXISTS rollup_address text,
  ADD COLUMN IF NOT EXISTS payload_address text,
  ADD COLUMN IF NOT EXISTS total_slash_amount text,
  ADD COLUMN IF NOT EXISTS vote_count integer,
  ADD COLUMN IF NOT EXISTS tally_results text,
  ADD COLUMN IF NOT EXISTS target_committees text,
  ADD COLUMN IF NOT EXISTS timestamp bigint,
  ADD COLUMN IF NOT EXISTS contract_address text;

-- ============================================================
-- provider_registered: add rollup_address, rewards_recipient, timestamp
-- ============================================================
ALTER TABLE ponder_prod.provider_registered
  ADD COLUMN IF NOT EXISTS rollup_address text,
  ADD COLUMN IF NOT EXISTS rewards_recipient text,
  ADD COLUMN IF NOT EXISTS timestamp bigint;

-- ============================================================
-- Create missing tables
-- ============================================================
CREATE TABLE IF NOT EXISTS ponder_prod.canonical_rollup_updated (
  id text PRIMARY KEY,
  instance_address text NOT NULL,
  version text NOT NULL,
  block_number text NOT NULL,
  transaction_hash text NOT NULL,
  log_index text NOT NULL,
  timestamp bigint
);

CREATE TABLE IF NOT EXISTS ponder_prod.checkpoint_invalidated (
  id text PRIMARY KEY,
  checkpoint_number bigint NOT NULL,
  block_number bigint NOT NULL,
  transaction_hash text NOT NULL,
  log_index integer NOT NULL,
  timestamp bigint NOT NULL,
  rollup_address text NOT NULL
);

CREATE TABLE IF NOT EXISTS ponder_prod.block_hash_log (
  block_number bigint PRIMARY KEY,
  block_hash text NOT NULL
);

-- ============================================================
-- Backfill rollup_address with default (disable triggers to avoid Ponder live_query errors)
-- ============================================================
DO $$
DECLARE
  default_rollup text := '0x66a41cb55f9a1e38a45a2ac8685f12a61fbfab77';
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'validator_queue', 'slash_slashed', 'l2_proof_verified',
    'provider_queue_dripped', 'proposer_vote', 'proposer_payload_submittable',
    'proposer_payload_submitted', 'tally_vote_cast', 'tally_round_executed',
    'provider_registered', 'provider_take_rate_updated', 'provider_rewards_recipient_updated',
    'provider_admin_updated', 'provider_admin_update_initiated', 'attesters_added_to_provider'
  ] LOOP
    EXECUTE format('ALTER TABLE ponder_prod.%I DISABLE TRIGGER ALL', tbl);
    EXECUTE format('UPDATE ponder_prod.%I SET rollup_address = $1 WHERE rollup_address IS NULL', tbl) USING default_rollup;
    EXECUTE format('ALTER TABLE ponder_prod.%I ENABLE TRIGGER ALL', tbl);
  END LOOP;
END $$;

-- ============================================================
-- Verify
-- ============================================================
SELECT 'validator_queue' as tbl, COUNT(*) FROM ponder_prod.validator_queue WHERE rollup_address IS NOT NULL
UNION ALL SELECT 'slash_slashed', COUNT(*) FROM ponder_prod.slash_slashed WHERE rollup_address IS NOT NULL
UNION ALL SELECT 'l2_proof_verified', COUNT(*) FROM ponder_prod.l2_proof_verified WHERE rollup_address IS NOT NULL
UNION ALL SELECT 'proposer_vote', COUNT(*) FROM ponder_prod.proposer_vote WHERE rollup_address IS NOT NULL
UNION ALL SELECT 'tally_vote_cast', COUNT(*) FROM ponder_prod.tally_vote_cast WHERE rollup_address IS NOT NULL
ORDER BY 1;
