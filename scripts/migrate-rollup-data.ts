#!/usr/bin/env tsx
/**
 * Rollup Data Migration Script
 *
 * Migrates historical data from an old single-rollup database into a new
 * multi-rollup database, backfilling each row with the correct rollup address.
 *
 * Usage:
 *   SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... OLD_ROLLUP_ADDRESS=0x... tsx scripts/migrate-rollup-data.ts
 *
 * Environment:
 *   SOURCE_DATABASE_URL   - Old DB connection string (required)
 *   TARGET_DATABASE_URL   - New DB connection string (required)
 *   OLD_ROLLUP_ADDRESS    - Rollup contract address for imported rows (required)
 *   BATCH_SIZE            - Rows per batch (default: 500)
 *   DRY_RUN               - "true" to preview without writing (default: "true")
 *   RESUME_FROM           - Table name to resume from (skips all tables before it)
 */

import { Client } from 'pg';

// ─── Configuration ───────────────────────────────────────────────────────────

const SOURCE_DATABASE_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_DATABASE_URL = process.env.TARGET_DATABASE_URL;
const OLD_ROLLUP_ADDRESS = process.env.OLD_ROLLUP_ADDRESS?.toLowerCase();
const BATCH_SIZE = Number(process.env.BATCH_SIZE) || 500;
const DRY_RUN = (process.env.DRY_RUN ?? 'true') !== 'false';
const RESUME_FROM = process.env.RESUME_FROM; // e.g. "TallySlashTargetCommittee"

/** Validates required environment variables and exits if any are missing. */
function validateEnv(): void {
  const missing: string[] = [];
  if (!SOURCE_DATABASE_URL) missing.push('SOURCE_DATABASE_URL');
  if (!TARGET_DATABASE_URL) missing.push('TARGET_DATABASE_URL');
  if (!OLD_ROLLUP_ADDRESS) missing.push('OLD_ROLLUP_ADDRESS');

  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// ─── Table Migration Configs ─────────────────────────────────────────────────

interface TableMigrationConfig {
  tableName: string;
  orderBy: string;
  /** Column name for the rollup address (snake_case or camelCase depending on table). */
  rollupColumn: string;
  /** Default values for columns that may be null in source but NOT NULL in target. */
  nullDefaults?: Record<string, unknown>;
  /** Optional ON CONFLICT clause (e.g. "DO NOTHING") for tables with shared PKs. */
  onConflict?: string;
  /** Maps source column names to target column names (for renamed columns). */
  columnMap?: Record<string, string>;
}

/**
 * All 20 tables to migrate, ordered by dependency (epochs first, then data that
 * references them). Each config specifies the quoted table name, ordering columns,
 * and the rollup address column name used in that table's schema.
 */
const TABLE_CONFIGS: TableMigrationConfig[] = [
  // Epoch tables (referenced by attestation/performance tables)
  { tableName: '"Epoch"', orderBy: 'epoch_number', rollupColumn: 'rollup_address', columnMap: { total_blocks_proposed: 'total_checkpoints_proposed', total_blocks_mined: 'total_checkpoints_mined' }, nullDefaults: { total_checkpoints_missed: 0 } },
  { tableName: '"EpochIntegrityStats"', orderBy: 'epoch_number', rollupColumn: 'rollup_address' },

  // Validator tables
  { tableName: '"Validator"', orderBy: 'address', rollupColumn: 'rollup_address', onConflict: 'DO NOTHING' },
  { tableName: '"ValidatorAttestation"', orderBy: 'slot_number, validator_address', rollupColumn: 'rollup_address' },
  { tableName: '"ValidatorEpochPerformance"', orderBy: 'epoch_number, validator_address', rollupColumn: 'rollup_address', columnMap: { blocks_mined: 'checkpoints_mined', blocks_proposed: 'checkpoints_proposed' }, nullDefaults: { checkpoints_missed: 0 } },

  // Block tables
  { tableName: '"L2BlockProposed"', orderBy: 'block_number, transaction_hash, log_index', rollupColumn: 'rollup_address' },
  { tableName: '"L2ProofVerified"', orderBy: 'block_number, transaction_hash, log_index', rollupColumn: 'rollup_address' },

  // Governance tables
  { tableName: '"ProposerVote"', orderBy: 'block_number, transaction_hash, log_index', rollupColumn: 'rollup_address' },
  { tableName: '"ProposerPayloadSubmittable"', orderBy: 'block_number, transaction_hash, log_index', rollupColumn: 'rollup_address' },
  { tableName: '"ProposerPayloadSubmitted"', orderBy: 'block_number, transaction_hash, log_index', rollupColumn: 'rollup_address' },

  // Slashing tables
  { tableName: '"SlashSlashed"', orderBy: 'block_number, transaction_hash, log_index', rollupColumn: 'rollup_address' },
  { tableName: '"TallyVoteCast"', orderBy: 'block_number, transaction_hash, log_index', rollupColumn: 'rollup_address' },
  { tableName: '"TallyRoundExecuted"', orderBy: 'block_number, transaction_hash, log_index', rollupColumn: 'rollup_address' },
  { tableName: '"TallySlashTargetCommittee"', orderBy: 'round_number, epoch_index', rollupColumn: 'rollup_address', nullDefaults: { block_number: '0' } },
  { tableName: '"TallySlashAction"', orderBy: 'round_number, action_index, validator_address', rollupColumn: 'rollup_address' },

  // Slashing factory tables
  { tableName: '"SlashFactoryPayload"', orderBy: 'block_number, transaction_hash, log_index', rollupColumn: 'rollup_address' },

  // Governance payload tables
  { tableName: '"GovernanceProposerPayload"', orderBy: 'block_number, transaction_hash, log_index', rollupColumn: 'rollup_address' },

  // Provider tables (camelCase columns)
  { tableName: '"Provider"', orderBy: '"blockNumber", "txHash", "logIndex"', rollupColumn: 'rollup_address', onConflict: 'DO NOTHING' },
  { tableName: '"ProviderAttester"', orderBy: '"blockNumber", "txHash", "logIndex"', rollupColumn: 'rollup_address', onConflict: 'DO NOTHING' },
  { tableName: '"ProviderQueueDrip"', orderBy: '"blockNumber", "txHash", "logIndex"', rollupColumn: 'rollup_address', onConflict: 'DO NOTHING' },
  { tableName: '"StakedWithProvider"', orderBy: '"blockNumber", "txHash", "logIndex"', rollupColumn: '"rollupAddress"', onConflict: 'DO NOTHING' },

  // Validator queue
  { tableName: '"ValidatorQueue"', orderBy: 'block_number, transaction_hash, log_index', rollupColumn: 'rollup_address' },
];

// ─── Logging ─────────────────────────────────────────────────────────────────

/** Masks credentials in a connection string for safe logging. */
function maskUrl(url: string): string {
  return url.replace(/:[^:@]*@/, ':***@');
}

function log(msg: string): void {
  console.log(`[migrate] ${msg}`);
}

function logError(msg: string): void {
  console.error(`[migrate] ERROR: ${msg}`);
}

// ─── Column Discovery ────────────────────────────────────────────────────────

/** Reads column names for a table from information_schema (handles quoted table names). */
async function getTableColumns(client: Client, tableName: string): Promise<string[]> {
  const unquoted = tableName.replace(/"/g, '');
  const result = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [unquoted],
  );
  return result.rows.map((r: { column_name: string }) => r.column_name);
}

/**
 * Quotes a column name. Columns that are already camelCase in the DB
 * need double-quoting in SQL; snake_case columns are safe unquoted.
 */
function quoteColumn(col: string): string {
  return /[A-Z]/.test(col) ? `"${col}"` : col;
}

// ─── Batch Insert ────────────────────────────────────────────────────────────

/**
 * Builds a parameterised INSERT statement for a batch of rows.
 * Returns the SQL string and a flat array of parameter values.
 */
function buildInsert(
  tableName: string,
  columns: string[],
  rows: Record<string, unknown>[],
  onConflict?: string,
): { sql: string; values: unknown[] } {
  const quotedCols = columns.map(quoteColumn).join(', ');
  const values: unknown[] = [];
  const rowPlaceholders: string[] = [];

  for (const row of rows) {
    const placeholders: string[] = [];
    for (const col of columns) {
      values.push(row[col]);
      placeholders.push(`$${values.length}`);
    }
    rowPlaceholders.push(`(${placeholders.join(', ')})`);
  }

  let sql = `INSERT INTO ${tableName} (${quotedCols}) VALUES ${rowPlaceholders.join(', ')}`;
  if (onConflict) sql += ` ON CONFLICT ${onConflict}`;
  return { sql, values };
}

// ─── Core Migration ──────────────────────────────────────────────────────────

interface MigrationResult {
  tableName: string;
  sourceCount: number;
  insertedCount: number;
  skipped: boolean;
}

/**
 * Migrates a single table from source to target inside one transaction.
 * On any insert failure the transaction is rolled back and the process exits.
 */
async function migrateTable(
  source: Client,
  target: Client,
  config: TableMigrationConfig,
): Promise<MigrationResult> {
  const { tableName, orderBy, rollupColumn } = config;
  const label = tableName.replace(/"/g, '');

  // 1. Count source rows
  const countResult = await source.query(`SELECT COUNT(*)::int AS count FROM ${tableName}`);
  const sourceCount: number = countResult.rows[0].count;

  if (sourceCount === 0) {
    log(`[${label}] No rows in source — skipping`);
    return { tableName: label, sourceCount: 0, insertedCount: 0, skipped: true };
  }

  log(`[${label}] Source rows: ${sourceCount}`);

  if (DRY_RUN) {
    return { tableName: label, sourceCount, insertedCount: 0, skipped: true };
  }

  // 2. Discover columns in source and target
  const sourceColumns = await getTableColumns(source, tableName);
  const targetColumns = await getTableColumns(target, tableName);

  // The rollup column might not exist in the old DB — we'll inject it
  const unquotedRollupCol = rollupColumn.replace(/"/g, '');
  const sourceHasRollup = sourceColumns.includes(unquotedRollupCol);

  // Build reverse map: target column -> source column (for renamed columns)
  const reverseColumnMap: Record<string, string> = {};
  if (config.columnMap) {
    for (const [srcCol, tgtCol] of Object.entries(config.columnMap)) {
      reverseColumnMap[tgtCol] = srcCol;
    }
  }

  // Build the list of columns we'll INSERT into the target:
  // all target columns that exist in the source (or are mapped from source), plus injected columns
  const columnsToRead: string[] = [];
  const columnsToInsert: string[] = [];

  for (const tgtCol of targetColumns) {
    if (config.columnMap && Object.keys(config.columnMap).includes(tgtCol)) {
      // Old source column that was renamed — skip it (will be read via its mapped target name)
      continue;
    }
    if (reverseColumnMap[tgtCol]) {
      // Target column mapped from a renamed source column
      columnsToRead.push(reverseColumnMap[tgtCol]);
      columnsToInsert.push(tgtCol);
    } else if (sourceColumns.includes(tgtCol)) {
      columnsToRead.push(tgtCol);
      columnsToInsert.push(tgtCol);
    }
  }

  if (!sourceHasRollup && targetColumns.includes(unquotedRollupCol)) {
    columnsToInsert.push(unquotedRollupCol);
  }

  // Add nullDefault columns that exist in target but not in source
  if (config.nullDefaults) {
    for (const col of Object.keys(config.nullDefaults)) {
      if (!columnsToInsert.includes(col) && targetColumns.includes(col)) {
        columnsToInsert.push(col);
      }
    }
  }

  // 3. BEGIN transaction on target
  await target.query('BEGIN');

  // Cap batch size to stay under PG's 65535 parameter limit
  const maxParams = 65000;
  const effectiveBatchSize = Math.min(BATCH_SIZE, Math.floor(maxParams / columnsToInsert.length));

  try {
    let totalInserted = 0;

    for (let offset = 0; offset < sourceCount; offset += effectiveBatchSize) {
      // Read batch from source (use source column names with aliases for mapped columns)
      const readColExprs = columnsToRead.map((srcCol, i) => {
        const tgtCol = columnsToInsert[i];
        if (srcCol !== tgtCol) {
          return `${quoteColumn(srcCol)} AS ${quoteColumn(tgtCol)}`;
        }
        return quoteColumn(srcCol);
      }).join(', ');
      const batchResult = await source.query(
        `SELECT ${readColExprs} FROM ${tableName} ORDER BY ${orderBy} LIMIT $1 OFFSET $2`,
        [effectiveBatchSize, offset],
      );

      const rows: Record<string, unknown>[] = batchResult.rows;
      if (rows.length === 0) break;

      // Inject rollup_address if source doesn't have it
      if (!sourceHasRollup) {
        for (const row of rows) {
          row[unquotedRollupCol] = OLD_ROLLUP_ADDRESS;
        }
      }

      // Apply null defaults for columns that are NOT NULL in target
      if (config.nullDefaults) {
        let patchCount = 0;
        for (const row of rows) {
          for (const [col, defaultVal] of Object.entries(config.nullDefaults)) {
            if (row[col] == null) {
              row[col] = defaultVal;
              patchCount++;
            }
          }
        }
        if (patchCount > 0) log(`[${label}] Patched ${patchCount} null values in batch`);
      }

      // Insert rows — uses ON CONFLICT only if configured
      const { sql, values } = buildInsert(tableName, columnsToInsert, rows, config.onConflict);
      await target.query(sql, values);

      totalInserted += rows.length;
      log(`[${label}] Inserted ${totalInserted}/${sourceCount} rows`);
    }

    // 4. COMMIT
    await target.query('COMMIT');
    log(`[${label}] Migration complete — ${totalInserted} rows committed`);

    return { tableName: label, sourceCount, insertedCount: totalInserted, skipped: false };
  } catch (err) {
    await target.query('ROLLBACK');
    const message = err instanceof Error ? err.message : String(err);
    logError(`[${label}] INSERT failed — transaction rolled back. Reason: ${message}`);
    process.exit(1);
  }
}

// ─── Validation ──────────────────────────────────────────────────────────────

/** Compares target row counts before and after migration to verify correctness. */
async function validateMigration(
  target: Client,
  results: MigrationResult[],
): Promise<boolean> {
  log('\n=== Post-Migration Validation ===\n');
  let allValid = true;

  for (const result of results) {
    if (result.skipped) continue;

    const quotedName = `"${result.tableName}"`;
    const countResult = await target.query(`SELECT COUNT(*)::int AS count FROM ${quotedName}`);
    const targetCount: number = countResult.rows[0].count;

    // Target should have at least the number of rows we inserted
    if (targetCount < result.insertedCount) {
      logError(`[${result.tableName}] Validation FAILED: target has ${targetCount} rows but we inserted ${result.insertedCount}`);
      allValid = false;
    } else {
      log(`[${result.tableName}] OK — target has ${targetCount} total rows (inserted ${result.insertedCount})`);
    }
  }

  return allValid;
}

// ─── Summary ─────────────────────────────────────────────────────────────────

/** Prints a summary table of all migration results. */
function printSummary(results: MigrationResult[]): void {
  log('\n' + '='.repeat(60));
  log(DRY_RUN ? 'DRY RUN SUMMARY (no data written)' : 'MIGRATION SUMMARY');
  log('='.repeat(60));

  const header = DRY_RUN
    ? `${'Table'.padEnd(35)} ${'Source Rows'.padStart(12)}`
    : `${'Table'.padEnd(35)} ${'Source'.padStart(10)} ${'Inserted'.padStart(10)} ${'Status'.padStart(8)}`;
  log(header);
  log('-'.repeat(header.length));

  let totalSource = 0;
  let totalInserted = 0;

  for (const r of results) {
    totalSource += r.sourceCount;
    totalInserted += r.insertedCount;

    if (DRY_RUN) {
      log(`${r.tableName.padEnd(35)} ${String(r.sourceCount).padStart(12)}`);
    } else {
      const status = r.skipped ? 'SKIP' : 'OK';
      log(`${r.tableName.padEnd(35)} ${String(r.sourceCount).padStart(10)} ${String(r.insertedCount).padStart(10)} ${status.padStart(8)}`);
    }
  }

  log('-'.repeat(header.length));
  if (DRY_RUN) {
    log(`${'TOTAL'.padEnd(35)} ${String(totalSource).padStart(12)}`);
  } else {
    log(`${'TOTAL'.padEnd(35)} ${String(totalSource).padStart(10)} ${String(totalInserted).padStart(10)}`);
  }
  log('='.repeat(60));
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  validateEnv();

  log('='.repeat(60));
  log('Rollup Data Migration');
  log('='.repeat(60));
  log(`Mode:        ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  log(`Source:      ${maskUrl(SOURCE_DATABASE_URL!)}`);
  log(`Target:      ${maskUrl(TARGET_DATABASE_URL!)}`);
  log(`Rollup Addr: ${OLD_ROLLUP_ADDRESS}`);
  log(`Batch Size:  ${BATCH_SIZE}`);
  if (RESUME_FROM) log(`Resume From: ${RESUME_FROM}`);
  log('='.repeat(60) + '\n');

  const source = new Client(SOURCE_DATABASE_URL!);
  const target = new Client(TARGET_DATABASE_URL!);

  await source.connect();
  log('Connected to source database');
  await target.connect();
  log('Connected to target database\n');

  const results: MigrationResult[] = [];
  const startTime = Date.now();

  // Skip tables before RESUME_FROM
  let resumeReached = !RESUME_FROM;

  try {
    for (const config of TABLE_CONFIGS) {
      const label = config.tableName.replace(/"/g, '');

      if (!resumeReached) {
        if (label === RESUME_FROM) {
          resumeReached = true;
        } else {
          log(`[${label}] Skipping (resuming from ${RESUME_FROM})`);
          results.push({ tableName: label, sourceCount: 0, insertedCount: 0, skipped: true });
          continue;
        }
      }

      const result = await migrateTable(source, target, config);
      results.push(result);
    }

    // Post-migration validation (only in live mode)
    if (!DRY_RUN) {
      const valid = await validateMigration(target, results);
      if (!valid) {
        logError('Post-migration validation failed!');
        process.exit(1);
      }
    }

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
