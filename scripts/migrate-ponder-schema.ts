#!/usr/bin/env tsx
/**
 * Ponder Schema Migration Script
 *
 * Migrates ponder_prod data from an old database dump into a new database,
 * patching columns to match the current ponder.schema.ts.
 * Creates target schema and tables if they don't exist.
 *
 * Usage:
 *   SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... tsx scripts/migrate-ponder-schema.ts
 *
 * Environment:
 *   SOURCE_DATABASE_URL   - Old DB with ponder_prod schema (required)
 *   TARGET_DATABASE_URL   - New DB where data will be migrated (required)
 *   OLD_ROLLUP_ADDRESS    - Rollup address for tables missing it (default: from deposit table)
 *   SOURCE_SCHEMA         - Source ponder schema name (default: "ponder_prod")
 *   TARGET_SCHEMA         - Target ponder schema name (default: "ponder_prod")
 *   DRY_RUN               - "true" to preview without writing (default: "true")
 *   BATCH_SIZE            - Rows per batch (default: 1000)
 *   RESUME_FROM           - Table name to resume from (skips tables before it)
 */

import { Client } from 'pg';

const SOURCE_DATABASE_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_DATABASE_URL = process.env.TARGET_DATABASE_URL;
const DRY_RUN = (process.env.DRY_RUN ?? 'true') !== 'false';
const BATCH_SIZE = Number(process.env.BATCH_SIZE) || 1000;
const RESUME_FROM = process.env.RESUME_FROM;
const SOURCE_SCHEMA = process.env.SOURCE_SCHEMA || 'ponder_prod';
const TARGET_SCHEMA = process.env.TARGET_SCHEMA || 'ponder_prod';

let OLD_ROLLUP_ADDRESS = process.env.OLD_ROLLUP_ADDRESS?.toLowerCase();

// ─── Validation ───────────────────────────────────────────────────────────────

function validateEnv(): void {
  const missing: string[] = [];
  if (!SOURCE_DATABASE_URL) missing.push('SOURCE_DATABASE_URL');
  if (!TARGET_DATABASE_URL) missing.push('TARGET_DATABASE_URL');
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TableMigration {
  /** Table name (no schema prefix, no quotes) */
  name: string;
  /** ORDER BY for deterministic batching */
  orderBy: string;
  /** Extra columns to add with default values (column → SQL default expression) */
  addColumns?: Record<string, string>;
  /** DDL to create the table in the new schema */
  ddl: string;
}

// ─── Logging ──────────────────────────────────────────────────────────────────

function maskUrl(url: string): string {
  return url.replace(/:[^:@]*@/, ':***@');
}

function log(msg: string): void {
  console.log(`[ponder-migrate] ${msg}`);
}

function logError(msg: string): void {
  console.error(`[ponder-migrate] ERROR: ${msg}`);
}

// ─── Rollup Address Discovery ─────────────────────────────────────────────────

/** Detect the rollup address from existing data if not provided via env */
async function detectRollupAddress(source: Client): Promise<string> {
  if (OLD_ROLLUP_ADDRESS) return OLD_ROLLUP_ADDRESS;

  const result = await source.query(
    `SELECT DISTINCT rollup_address FROM ${SOURCE_SCHEMA}.deposit LIMIT 1`
  );
  if (result.rows.length === 0) {
    logError('Cannot detect rollup address — no deposits in source and OLD_ROLLUP_ADDRESS not set');
    process.exit(1);
  }
  const addr = result.rows[0].rollup_address.toLowerCase();
  log(`Detected rollup address from deposit table: ${addr}`);
  return addr;
}

// ─── Table Configs ────────────────────────────────────────────────────────────

/** Build table migration configs with DDL matching ponder.schema.ts */
function buildTableMigrations(rollupAddr: string): TableMigration[] {
  const r = `'${rollupAddr}'`;

  return [
    {
      name: 'deposit',
      orderBy: 'block_number, log_index',
      addColumns: { attester_status: 'NULL', effective_balance: 'NULL', validator_hex_index: 'NULL' },
      ddl: `CREATE TABLE IF NOT EXISTS S."deposit" (
        "id" text PRIMARY KEY, "attester_address" text NOT NULL, "withdrawer_address" text NOT NULL,
        "rollup_address" text NOT NULL, "public_key_g1_x" numeric NOT NULL, "public_key_g1_y" numeric NOT NULL,
        "public_key_g2_x0" numeric NOT NULL, "public_key_g2_x1" numeric NOT NULL, "public_key_g2_y0" numeric NOT NULL,
        "public_key_g2_y1" numeric NOT NULL, "proof_of_possession_x" numeric NOT NULL, "proof_of_possession_y" numeric NOT NULL,
        "amount" numeric NOT NULL, "tx_hash" text NOT NULL, "block_number" numeric NOT NULL, "log_index" integer NOT NULL,
        "timestamp" numeric NOT NULL, "attester_status" text, "effective_balance" text, "validator_hex_index" text
      )`,
    },
    {
      name: 'failed_deposit',
      orderBy: 'block_number, log_index',
      ddl: `CREATE TABLE IF NOT EXISTS S."failed_deposit" (
        "id" text PRIMARY KEY, "attester_address" text NOT NULL, "withdrawer_address" text NOT NULL,
        "rollup_address" text NOT NULL, "public_key_g1_x" numeric NOT NULL, "public_key_g1_y" numeric NOT NULL,
        "public_key_g2_x0" numeric NOT NULL, "public_key_g2_x1" numeric NOT NULL, "public_key_g2_y0" numeric NOT NULL,
        "public_key_g2_y1" numeric NOT NULL, "proof_of_possession_x" numeric NOT NULL, "proof_of_possession_y" numeric NOT NULL,
        "tx_hash" text NOT NULL, "block_number" numeric NOT NULL, "log_index" integer NOT NULL, "timestamp" numeric NOT NULL
      )`,
    },
    {
      name: 'gse_deposit',
      orderBy: 'id',
      addColumns: { attester_status: 'NULL', effective_balance: 'NULL', validator_hex_index: 'NULL', timestamp: 'NULL' },
      ddl: `CREATE TABLE IF NOT EXISTS S."gse_deposit" (
        "id" text PRIMARY KEY, "instance_address" text NOT NULL, "attester_address" text NOT NULL,
        "withdrawer_address" text NOT NULL, "public_key_g1_x" text NOT NULL, "public_key_g1_y" text NOT NULL,
        "public_key_g2_x0" text NOT NULL, "public_key_g2_x1" text NOT NULL, "public_key_g2_y0" text NOT NULL,
        "public_key_g2_y1" text NOT NULL, "proof_of_possession_x" text NOT NULL, "proof_of_possession_y" text NOT NULL,
        "move_with_latest_rollup" integer NOT NULL, "block_number" text NOT NULL, "transaction_hash" text NOT NULL,
        "log_index" text NOT NULL, "attester_status" text, "effective_balance" text, "validator_hex_index" text, "timestamp" numeric
      )`,
    },
    {
      name: 'withdraw_initiated',
      orderBy: 'block_number, log_index',
      ddl: `CREATE TABLE IF NOT EXISTS S."withdraw_initiated" (
        "id" text PRIMARY KEY, "attester_address" text NOT NULL, "recipient_address" text NOT NULL,
        "rollup_address" text NOT NULL, "amount" numeric NOT NULL, "tx_hash" text NOT NULL,
        "block_number" numeric NOT NULL, "log_index" integer NOT NULL, "timestamp" numeric NOT NULL
      )`,
    },
    {
      name: 'withdraw_finalized',
      orderBy: 'id',
      ddl: `CREATE TABLE IF NOT EXISTS S."withdraw_finalized" (
        "id" text PRIMARY KEY, "attester_address" text NOT NULL, "recipient_address" text NOT NULL,
        "rollup_address" text NOT NULL, "amount" numeric NOT NULL, "tx_hash" text NOT NULL,
        "block_number" numeric NOT NULL, "log_index" integer NOT NULL, "timestamp" numeric NOT NULL
      )`,
    },
    {
      name: 'validator_queue',
      orderBy: 'id',
      addColumns: { rollup_address: r, timestamp: 'NULL' },
      ddl: `CREATE TABLE IF NOT EXISTS S."validator_queue" (
        "id" text PRIMARY KEY, "attester_address" text NOT NULL, "withdrawer_address" text NOT NULL,
        "block_number" text NOT NULL, "transaction_hash" text NOT NULL, "log_index" text NOT NULL,
        "rollup_address" text NOT NULL, "timestamp" numeric
      )`,
    },
    {
      name: 'proposer_vote',
      orderBy: 'id',
      addColumns: { rollup_address: r, timestamp: 'NULL', contract_address: 'NULL' },
      ddl: `CREATE TABLE IF NOT EXISTS S."proposer_vote" (
        "id" text PRIMARY KEY, "vote_type" S.proposer_vote_type NOT NULL, "signaler_address" text NOT NULL,
        "payload_address" text NOT NULL, "round_number" integer NOT NULL, "block_number" text NOT NULL,
        "transaction_hash" text NOT NULL, "log_index" text NOT NULL, "rollup_address" text NOT NULL,
        "timestamp" numeric, "contract_address" text
      )`,
    },
    {
      name: 'proposer_payload_submittable',
      orderBy: 'id',
      addColumns: { rollup_address: r, timestamp: 'NULL', contract_address: 'NULL' },
      ddl: `CREATE TABLE IF NOT EXISTS S."proposer_payload_submittable" (
        "id" text PRIMARY KEY, "payload_address" text NOT NULL, "round_number" integer NOT NULL,
        "block_number" text NOT NULL, "transaction_hash" text NOT NULL, "log_index" text NOT NULL,
        "rollup_address" text NOT NULL, "timestamp" numeric, "contract_address" text
      )`,
    },
    {
      name: 'proposer_payload_submitted',
      orderBy: 'id',
      addColumns: { rollup_address: r, timestamp: 'NULL', contract_address: 'NULL', submitter_address: 'NULL' },
      ddl: `CREATE TABLE IF NOT EXISTS S."proposer_payload_submitted" (
        "id" text PRIMARY KEY, "payload_address" text NOT NULL, "round_number" integer NOT NULL,
        "block_number" text NOT NULL, "transaction_hash" text NOT NULL, "log_index" text NOT NULL,
        "rollup_address" text NOT NULL, "timestamp" numeric, "contract_address" text, "submitter_address" text
      )`,
    },
    {
      name: 'governance_proposer_payload',
      orderBy: 'id',
      ddl: `CREATE TABLE IF NOT EXISTS S."governance_proposer_payload" (
        "id" text PRIMARY KEY, "payload_address" text NOT NULL, "block_number" text NOT NULL,
        "transaction_hash" text NOT NULL, "log_index" text NOT NULL
      )`,
    },
    {
      name: 'governance_proposer_gse_payload',
      orderBy: 'id',
      ddl: `CREATE TABLE IF NOT EXISTS S."governance_proposer_gse_payload" (
        "id" text PRIMARY KEY, "payload_address" text NOT NULL, "gse_payload_address" text NOT NULL, "proposal_id" text NOT NULL
      )`,
    },
    {
      name: 'slash_slashed',
      orderBy: 'id',
      addColumns: { rollup_address: r, timestamp: 'NULL', contract_address: 'NULL' },
      ddl: `CREATE TABLE IF NOT EXISTS S."slash_slashed" (
        "id" text PRIMARY KEY, "attester_address" text NOT NULL, "amount" text NOT NULL,
        "round_number" integer, "payload_address" text, "block_number" text NOT NULL,
        "transaction_hash" text NOT NULL, "log_index" text NOT NULL, "rollup_address" text NOT NULL,
        "timestamp" numeric, "contract_address" text
      )`,
    },
    {
      name: 'slash_factory_payload',
      orderBy: 'id',
      ddl: `CREATE TABLE IF NOT EXISTS S."slash_factory_payload" (
        "id" text PRIMARY KEY, "payload_address" text NOT NULL, "block_number" text NOT NULL,
        "transaction_hash" text NOT NULL, "log_index" text NOT NULL
      )`,
    },
    {
      name: 'tally_vote_cast',
      orderBy: 'id',
      addColumns: { rollup_address: r, epoch_number: 'NULL', timestamp: 'NULL', contract_address: 'NULL' },
      ddl: `CREATE TABLE IF NOT EXISTS S."tally_vote_cast" (
        "id" text PRIMARY KEY, "round_number" integer NOT NULL, "slot_number" numeric NOT NULL,
        "proposer_address" text NOT NULL, "block_number" text NOT NULL, "transaction_hash" text NOT NULL,
        "log_index" text NOT NULL, "rollup_address" text NOT NULL, "epoch_number" numeric,
        "timestamp" numeric, "contract_address" text
      )`,
    },
    {
      name: 'tally_round_executed',
      orderBy: 'id',
      addColumns: { rollup_address: r, payload_address: 'NULL', total_slash_amount: 'NULL', vote_count: 'NULL', tally_results: 'NULL', target_committees: 'NULL', timestamp: 'NULL', contract_address: 'NULL' },
      ddl: `CREATE TABLE IF NOT EXISTS S."tally_round_executed" (
        "id" text PRIMARY KEY, "round_number" integer NOT NULL, "slash_count" integer NOT NULL,
        "block_number" text NOT NULL, "transaction_hash" text NOT NULL, "log_index" text NOT NULL,
        "rollup_address" text NOT NULL, "payload_address" text, "total_slash_amount" text,
        "vote_count" integer, "tally_results" text, "target_committees" text,
        "timestamp" numeric, "contract_address" text
      )`,
    },
    {
      name: 'provider_registered',
      orderBy: 'id',
      addColumns: { rollup_address: r, rewards_recipient: 'NULL', timestamp: 'NULL' },
      ddl: `CREATE TABLE IF NOT EXISTS S."provider_registered" (
        "id" text PRIMARY KEY, "provider_identifier" text NOT NULL, "provider_admin" text NOT NULL,
        "provider_take_rate" integer NOT NULL, "block_number" text NOT NULL, "transaction_hash" text NOT NULL,
        "log_index" text NOT NULL, "rollup_address" text NOT NULL, "rewards_recipient" text, "timestamp" numeric
      )`,
    },
    {
      name: 'provider_queue_dripped',
      orderBy: 'id',
      addColumns: { rollup_address: r, timestamp: 'NULL' },
      ddl: `CREATE TABLE IF NOT EXISTS S."provider_queue_dripped" (
        "id" text PRIMARY KEY, "provider_identifier" text NOT NULL, "attester_address" text NOT NULL,
        "block_number" text NOT NULL, "transaction_hash" text NOT NULL, "log_index" text NOT NULL,
        "rollup_address" text NOT NULL, "timestamp" numeric
      )`,
    },
    {
      name: 'provider_take_rate_updated',
      orderBy: 'id',
      addColumns: { rollup_address: r },
      ddl: `CREATE TABLE IF NOT EXISTS S."provider_take_rate_updated" (
        "id" text PRIMARY KEY, "provider_identifier" text NOT NULL, "new_take_rate" integer NOT NULL,
        "block_number" text NOT NULL, "transaction_hash" text NOT NULL, "log_index" text NOT NULL,
        "rollup_address" text NOT NULL
      )`,
    },
    {
      name: 'provider_rewards_recipient_updated',
      orderBy: 'id',
      addColumns: { rollup_address: r },
      ddl: `CREATE TABLE IF NOT EXISTS S."provider_rewards_recipient_updated" (
        "id" text PRIMARY KEY, "provider_identifier" text NOT NULL, "new_rewards_recipient" text NOT NULL,
        "block_number" text NOT NULL, "transaction_hash" text NOT NULL, "log_index" text NOT NULL,
        "rollup_address" text NOT NULL
      )`,
    },
    {
      name: 'provider_admin_update_initiated',
      orderBy: 'id',
      addColumns: { rollup_address: r },
      ddl: `CREATE TABLE IF NOT EXISTS S."provider_admin_update_initiated" (
        "id" text PRIMARY KEY, "provider_identifier" text NOT NULL, "new_admin" text NOT NULL,
        "block_number" text NOT NULL, "transaction_hash" text NOT NULL, "log_index" text NOT NULL,
        "rollup_address" text NOT NULL
      )`,
    },
    {
      name: 'provider_admin_updated',
      orderBy: 'id',
      addColumns: { rollup_address: r },
      ddl: `CREATE TABLE IF NOT EXISTS S."provider_admin_updated" (
        "id" text PRIMARY KEY, "provider_identifier" text NOT NULL, "new_admin" text NOT NULL,
        "block_number" text NOT NULL, "transaction_hash" text NOT NULL, "log_index" text NOT NULL,
        "rollup_address" text NOT NULL
      )`,
    },
    {
      name: 'staked_with_provider',
      orderBy: 'id',
      addColumns: { timestamp: 'NULL' },
      ddl: `CREATE TABLE IF NOT EXISTS S."staked_with_provider" (
        "id" text PRIMARY KEY, "provider_identifier" text NOT NULL, "rollup_address" text NOT NULL,
        "attester_address" text NOT NULL, "coinbase_split_contract_address" text NOT NULL,
        "staker_address" text NOT NULL, "block_number" text NOT NULL, "transaction_hash" text NOT NULL,
        "log_index" text NOT NULL, "timestamp" numeric
      )`,
    },
    {
      name: 'attesters_added_to_provider',
      orderBy: 'id',
      addColumns: { rollup_address: r },
      ddl: `CREATE TABLE IF NOT EXISTS S."attesters_added_to_provider" (
        "id" text PRIMARY KEY, "provider_identifier" text NOT NULL, "attesters" text NOT NULL,
        "block_number" text NOT NULL, "transaction_hash" text NOT NULL, "log_index" text NOT NULL,
        "rollup_address" text NOT NULL
      )`,
    },

    // New-only tables (no source data, materializer needs them to exist)
    {
      name: 'block_hash_log',
      orderBy: 'block_number',
      ddl: `CREATE TABLE IF NOT EXISTS S."block_hash_log" (
        "block_number" numeric PRIMARY KEY, "block_hash" text NOT NULL
      )`,
    },
    {
      name: 'l2_block_proposed',
      orderBy: 'block_number, log_index',
      addColumns: { payload_digest: 'NULL', attestations_hash: 'NULL' },
      ddl: `CREATE TABLE IF NOT EXISTS S."l2_block_proposed" (
        "id" text PRIMARY KEY, "l2_block_number" numeric NOT NULL, "archive" text NOT NULL,
        "versioned_blob_hashes" text NOT NULL, "payload_digest" text, "attestations_hash" text,
        "rollup_address" text NOT NULL, "block_number" numeric NOT NULL, "transaction_hash" text NOT NULL,
        "log_index" integer NOT NULL, "timestamp" numeric NOT NULL, "slot_number" numeric NOT NULL,
        "coinbase" text NOT NULL
      )`,
    },
    {
      name: 'l2_proof_verified',
      orderBy: 'block_number, log_index',
      addColumns: { rollup_address: r, epoch_number: 'NULL' },
      ddl: `CREATE TABLE IF NOT EXISTS S."l2_proof_verified" (
        "id" text PRIMARY KEY, "l2_block_number" numeric NOT NULL, "prover_id" text NOT NULL,
        "block_number" numeric NOT NULL, "transaction_hash" text NOT NULL, "log_index" integer NOT NULL,
        "timestamp" numeric NOT NULL, "rollup_address" text NOT NULL, "epoch_number" text,
        "transaction_from" text NOT NULL, "transaction_to" text, "transaction_gas" numeric NOT NULL,
        "transaction_gas_price" numeric, "transaction_value" numeric NOT NULL,
        "transaction_nonce" integer NOT NULL, "transaction_max_fee_per_gas" numeric,
        "transaction_max_priority_fee_per_gas" numeric
      )`,
    },
    {
      name: 'canonical_rollup_updated',
      orderBy: 'id',
      ddl: `CREATE TABLE IF NOT EXISTS S."canonical_rollup_updated" (
        "id" text PRIMARY KEY, "instance_address" text NOT NULL, "version" text NOT NULL,
        "block_number" text NOT NULL, "transaction_hash" text NOT NULL, "log_index" text NOT NULL,
        "timestamp" numeric
      )`,
    },
    {
      name: 'checkpoint_invalidated',
      orderBy: 'block_number, log_index',
      ddl: `CREATE TABLE IF NOT EXISTS S."checkpoint_invalidated" (
        "id" text PRIMARY KEY, "checkpoint_number" numeric NOT NULL, "block_number" numeric NOT NULL,
        "transaction_hash" text NOT NULL, "log_index" integer NOT NULL, "timestamp" numeric NOT NULL,
        "rollup_address" text NOT NULL
      )`,
    },
  ];
}

// ─── Column Discovery ─────────────────────────────────────────────────────────

async function getTableColumns(client: Client, schema: string, tableName: string): Promise<string[]> {
  const result = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
     ORDER BY ordinal_position`,
    [schema, tableName],
  );
  return result.rows.map((r: { column_name: string }) => r.column_name);
}

// ─── Core Migration ───────────────────────────────────────────────────────────

interface MigrationResult {
  tableName: string;
  sourceCount: number;
  insertedCount: number;
  skipped: boolean;
}

async function migrateTable(
  source: Client,
  target: Client,
  migration: TableMigration,
): Promise<MigrationResult> {
  const { name, orderBy, addColumns } = migration;

  // Ensure target table exists regardless of source data
  if (!DRY_RUN) {
    const targetExists = await target.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`,
      [TARGET_SCHEMA, name],
    );
    if (targetExists.rows.length === 0) {
      const ddlSql = migration.ddl.replace(/S\./g, `${TARGET_SCHEMA}.`);
      await target.query(ddlSql);
      log(`[${name}] Created target table`);
    }
  }

  // Check source exists
  const tableExists = await source.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`,
    [SOURCE_SCHEMA, name],
  );
  if (tableExists.rows.length === 0) {
    log(`[${name}] Not in source — table created, no data`);
    return { tableName: name, sourceCount: 0, insertedCount: 0, skipped: true };
  }

  // Count source rows
  const countResult = await source.query(`SELECT COUNT(*)::int AS count FROM ${SOURCE_SCHEMA}."${name}"`);
  const sourceCount: number = countResult.rows[0].count;

  if (sourceCount === 0) {
    log(`[${name}] No rows — table ready`);
    return { tableName: name, sourceCount: 0, insertedCount: 0, skipped: true };
  }

  log(`[${name}] Source rows: ${sourceCount}`);

  if (DRY_RUN) {
    const extraCols = addColumns ? Object.keys(addColumns).join(', ') : 'none';
    log(`[${name}] New columns: ${extraCols}`);
    return { tableName: name, sourceCount, insertedCount: 0, skipped: true };
  }

  // Get source columns
  const sourceColumns = await getTableColumns(source, SOURCE_SCHEMA, name);

  // Build SELECT: source columns + added columns with defaults
  const selectParts: string[] = sourceColumns.map(c => `"${c}"`);
  const insertColumns: string[] = [...sourceColumns];

  if (addColumns) {
    for (const [col, defaultExpr] of Object.entries(addColumns)) {
      if (!sourceColumns.includes(col)) {
        selectParts.push(`${defaultExpr} AS "${col}"`);
        insertColumns.push(col);
      }
    }
  }

  const selectSql = selectParts.join(', ');
  const insertColsSql = insertColumns.map(c => `"${c}"`).join(', ');

  await target.query('BEGIN');

  // Cap batch size to stay under PG's 65535 parameter limit
  const effectiveBatch = Math.min(BATCH_SIZE, Math.floor(65000 / insertColumns.length));

  try {
    let totalInserted = 0;

    for (let offset = 0; offset < sourceCount; offset += effectiveBatch) {
      const batchResult = await source.query(
        `SELECT ${selectSql} FROM ${SOURCE_SCHEMA}."${name}" ORDER BY ${orderBy} LIMIT $1 OFFSET $2`,
        [effectiveBatch, offset],
      );

      const rows = batchResult.rows;
      if (rows.length === 0) break;

      // Build parameterised INSERT
      const values: unknown[] = [];
      const rowPlaceholders: string[] = [];

      for (const row of rows) {
        const placeholders: string[] = [];
        for (const col of insertColumns) {
          values.push(row[col]);
          placeholders.push(`$${values.length}`);
        }
        rowPlaceholders.push(`(${placeholders.join(', ')})`);
      }

      const sql = `INSERT INTO ${TARGET_SCHEMA}."${name}" (${insertColsSql}) VALUES ${rowPlaceholders.join(', ')} ON CONFLICT DO NOTHING`;
      await target.query(sql, values);

      totalInserted += rows.length;
      if (totalInserted % 5000 === 0 || offset + BATCH_SIZE >= sourceCount) {
        log(`[${name}] ${totalInserted}/${sourceCount}`);
      }
    }

    await target.query('COMMIT');
    log(`[${name}] Done — ${totalInserted} rows`);
    return { tableName: name, sourceCount, insertedCount: totalInserted, skipped: false };
  } catch (err) {
    await target.query('ROLLBACK');
    const message = err instanceof Error ? err.message : String(err);
    logError(`[${name}] Failed: ${message}`);
    process.exit(1);
  }
}

// ─── Ponder Metadata ──────────────────────────────────────────────────────────

/** Copy _ponder_meta and _ponder_checkpoint so Ponder knows where to resume */
async function migratePonderMeta(source: Client, target: Client): Promise<void> {
  if (DRY_RUN) {
    log('[meta] Would copy _ponder_meta and _ponder_checkpoint');
    return;
  }

  // Create meta tables if needed
  await target.query(`CREATE TABLE IF NOT EXISTS ${TARGET_SCHEMA}."_ponder_meta" ("key" text PRIMARY KEY, "value" jsonb NOT NULL)`);
  await target.query(`DROP TABLE IF EXISTS ${TARGET_SCHEMA}."_ponder_checkpoint"`);
  await target.query(`CREATE TABLE ${TARGET_SCHEMA}."_ponder_checkpoint" (
    "chain_name" text PRIMARY KEY, "chain_id" bigint NOT NULL,
    "safe_checkpoint" varchar, "latest_checkpoint" varchar, "finalized_checkpoint" varchar
  )`);

  for (const metaTable of ['_ponder_meta', '_ponder_checkpoint']) {
    const srcExists = await source.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`,
      [SOURCE_SCHEMA, metaTable],
    );
    if (srcExists.rows.length === 0) continue;

    const data = await source.query(`SELECT * FROM ${SOURCE_SCHEMA}."${metaTable}"`);
    if (data.rows.length === 0) continue;

    const columns = Object.keys(data.rows[0]);
    const colsSql = columns.map(c => `"${c}"`).join(', ');

    for (const row of data.rows) {
      const values = columns.map(c => row[c]);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      await target.query(
        `INSERT INTO ${TARGET_SCHEMA}."${metaTable}" (${colsSql}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        values,
      );
    }
    log(`[${metaTable}] Copied ${data.rows.length} rows`);
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────

function printSummary(results: MigrationResult[]): void {
  log('\n' + '='.repeat(60));
  log(DRY_RUN ? 'DRY RUN SUMMARY' : 'MIGRATION SUMMARY');
  log('='.repeat(60));

  const header = `${'Table'.padEnd(40)} ${'Source'.padStart(8)} ${'Inserted'.padStart(8)}`;
  log(header);
  log('-'.repeat(header.length));

  let totalSource = 0;
  let totalInserted = 0;

  for (const r of results) {
    totalSource += r.sourceCount;
    totalInserted += r.insertedCount;
    const status = r.skipped ? ' (skip)' : '';
    log(`${r.tableName.padEnd(40)} ${String(r.sourceCount).padStart(8)} ${String(r.insertedCount).padStart(8)}${status}`);
  }

  log('-'.repeat(header.length));
  log(`${'TOTAL'.padEnd(40)} ${String(totalSource).padStart(8)} ${String(totalInserted).padStart(8)}`);
  log('='.repeat(60));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  validateEnv();

  const source = new Client(SOURCE_DATABASE_URL!);
  const target = new Client(TARGET_DATABASE_URL!);

  await source.connect();
  await target.connect();

  // Detect rollup address
  OLD_ROLLUP_ADDRESS = await detectRollupAddress(source);
  const migrations = buildTableMigrations(OLD_ROLLUP_ADDRESS);

  log('='.repeat(60));
  log('Ponder Schema Migration');
  log('='.repeat(60));
  log(`Mode:    ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  log(`Source:  ${maskUrl(SOURCE_DATABASE_URL!)}`);
  log(`Target:  ${maskUrl(TARGET_DATABASE_URL!)}`);
  log(`Rollup:  ${OLD_ROLLUP_ADDRESS}`);
  log(`Schema:  ${SOURCE_SCHEMA} → ${TARGET_SCHEMA}`);
  log(`Batch:   ${BATCH_SIZE}`);
  if (RESUME_FROM) log(`Resume:  ${RESUME_FROM}`);
  log('='.repeat(60) + '\n');

  const startTime = Date.now();
  const results: MigrationResult[] = [];
  let resumeReached = !RESUME_FROM;

  try {
    // Create schema and enum types
    if (!DRY_RUN) {
      await target.query(`CREATE SCHEMA IF NOT EXISTS ${TARGET_SCHEMA}`);
      await target.query(`
        DO $$ BEGIN
          CREATE TYPE ${TARGET_SCHEMA}.proposer_vote_type AS ENUM ('GOVERNANCE_PROPOSER', 'SLASHING_PROPOSER');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `);
      log('Schema and enum types ready\n');
    }

    for (const migration of migrations) {
      if (!resumeReached) {
        if (migration.name === RESUME_FROM) {
          resumeReached = true;
        } else {
          log(`[${migration.name}] Skipping (resuming from ${RESUME_FROM})`);
          results.push({ tableName: migration.name, sourceCount: 0, insertedCount: 0, skipped: true });
          continue;
        }
      }

      const result = await migrateTable(source, target, migration);
      results.push(result);
    }

    await migratePonderMeta(source, target);

    printSummary(results);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\nCompleted in ${elapsed}s`);
  } finally {
    await source.end();
    await target.end();
  }
}

main().catch((err) => {
  logError(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
