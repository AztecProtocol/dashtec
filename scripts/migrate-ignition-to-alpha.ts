#!/usr/bin/env tsx
/**
 * Mainnet Ignition → Alpha Migration Script
 *
 * Migrates public schema data from the Ignition-era database into the Alpha
 * multi-rollup schema. Handles column renames, missing rollup_address injection,
 * and status value updates.
 *
 * Key differences from Ignition → Alpha:
 *   - Most tables gain a `rollup_address` column (injected from OLD_ROLLUP_ADDRESS)
 *   - Epoch: total_blocks_proposed → total_checkpoints_proposed,
 *            total_blocks_mined → total_checkpoints_mined, + total_checkpoints_missed
 *   - ValidatorEpochPerformance: blocks_proposed → checkpoints_proposed,
 *            blocks_mined → checkpoints_mined, + checkpoints_missed
 *   - ValidatorAttestation: status values block-proposed → checkpoint-proposed,
 *            block-mined → checkpoint-mined
 *   - L2BlockProposed: + attestations_hash, payload_digest (nullable)
 *   - L2ProofVerified: + rollup_address
 *   - TallySlashTargetCommittee: + block_number
 *   - MaterializerCheckpoint: + count, rollup_address
 *
 * Usage:
 *   SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... OLD_ROLLUP_ADDRESS=0x... \
 *     DRY_RUN=false pnpm tsx scripts/migrate-ignition-to-alpha.ts
 */

import { Client, type QueryResult } from 'pg';

const SOURCE_DATABASE_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_DATABASE_URL = process.env.TARGET_DATABASE_URL;
const OLD_ROLLUP_ADDRESS = process.env.OLD_ROLLUP_ADDRESS?.toLowerCase()
  ?? '0x603bb2c05d474794ea97805e8de69bccfb3bca12';
const DRY_RUN = (process.env.DRY_RUN ?? 'true') !== 'false';
const BATCH_SIZE = Number(process.env.BATCH_SIZE) || 5000;
const RESUME_FROM = process.env.RESUME_FROM;
const ONLY_TABLE = process.env.ONLY_TABLE;

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
  /** Quoted table name e.g. '"Epoch"' */
  table: string;
  /** ORDER BY clause for deterministic batching */
  orderBy: string;
  /** Column renames: source → target */
  renames?: Record<string, string>;
  /** New columns to inject with SQL default expressions */
  inject?: Record<string, string>;
  /** Value transformations: column → (value => newValue) */
  transforms?: Record<string, (v: unknown) => unknown>;
  /** Columns to update on conflict (uses DO UPDATE instead of DO NOTHING) */
  upsertColumns?: string[];
  /** Conflict target columns for upsert (default: id) */
  conflictTarget?: string[];
}

// ─── Logging ──────────────────────────────────────────────────────────────────

function maskUrl(url: string): string {
  return url.replace(/:[^:@]*@/, ':***@');
}

function log(msg: string): void {
  process.stdout.write(`[ignition→alpha] ${msg}\n`);
}

function logError(msg: string): void {
  process.stderr.write(`[ignition→alpha] ERROR: ${msg}\n`);
}

// ─── Column helpers ───────────────────────────────────────────────────────────

function q(col: string): string {
  return /[A-Z]/.test(col) ? `"${col}"` : col;
}

async function getColumns(client: Client, table: string): Promise<string[]> {
  const name = table.replace(/"/g, '');
  const res = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [name],
  );
  return res.rows.map((r: { column_name: string }) => r.column_name);
}

// ─── Table Configs ────────────────────────────────────────────────────────────

const R = OLD_ROLLUP_ADDRESS;

/** Status value mapping for ValidatorAttestation */
const statusMap: Record<string, string> = {
  'block-proposed': 'checkpoint-proposed',
  'block-mined': 'checkpoint-mined',
};

const TABLES: TableMigration[] = [
  // ── Epoch tables ──
  {
    table: '"Epoch"',
    orderBy: 'epoch_number',
    renames: { total_blocks_proposed: 'total_checkpoints_proposed', total_blocks_mined: 'total_checkpoints_mined' },
    inject: { rollup_address: `'${R}'`, total_checkpoints_missed: '0' },
  },
  {
    table: '"EpochIntegrityStats"',
    orderBy: 'epoch_number',
    inject: { rollup_address: `'${R}'` },
  },

  // ── Validator tables ──
  {
    table: '"Validator"',
    orderBy: 'address',
    inject: { rollup_address: `'${R}'` },
  },
  {
    table: '"ValidatorAttestation"',
    orderBy: 'slot_number, validator_address',
    inject: { rollup_address: `'${R}'` },
    transforms: {
      status: (v) => statusMap[v as string] ?? v,
    },
  },
  {
    table: '"ValidatorEpochPerformance"',
    orderBy: 'epoch_number, validator_address',
    renames: { blocks_proposed: 'checkpoints_proposed', blocks_mined: 'checkpoints_mined' },
    inject: { rollup_address: `'${R}'`, checkpoints_missed: '0' },
  },

  // ── Block tables ──
  {
    table: '"L2BlockProposed"',
    orderBy: 'block_number, transaction_hash, log_index',
    inject: { attestations_hash: 'NULL', payload_digest: 'NULL' },
  },
  {
    table: '"L2ProofVerified"',
    orderBy: 'block_number, transaction_hash, log_index',
    inject: { rollup_address: `'${R}'` },
  },

  // ── Governance tables ──
  {
    table: '"ProposerVote"',
    orderBy: 'block_number, transaction_hash, log_index',
    inject: { rollup_address: `'${R}'` },
  },
  {
    table: '"ProposerPayloadSubmittable"',
    orderBy: 'block_number, transaction_hash, log_index',
    inject: { rollup_address: `'${R}'` },
  },
  {
    table: '"ProposerPayloadSubmitted"',
    orderBy: 'block_number, transaction_hash, log_index',
    inject: { rollup_address: `'${R}'` },
  },
  {
    table: '"GovernanceProposerPayload"',
    orderBy: 'block_number, transaction_hash, log_index',
    inject: { rollup_address: `'${R}'` },
  },

  // ── Slashing tables ──
  {
    table: '"SlashSlashed"',
    orderBy: 'block_number, transaction_hash, log_index',
    inject: { rollup_address: `'${R}'` },
  },
  {
    table: '"SlashFactoryPayload"',
    orderBy: 'block_number, transaction_hash, log_index',
    inject: { rollup_address: `'${R}'` },
  },
  {
    table: '"TallyVoteCast"',
    orderBy: 'block_number, transaction_hash, log_index',
    inject: { rollup_address: `'${R}'` },
  },
  {
    table: '"TallyRoundExecuted"',
    orderBy: 'block_number, transaction_hash, log_index',
    inject: { rollup_address: `'${R}'` },
    upsertColumns: ['payload_address', 'total_slash_amount', 'vote_count', 'executed_date'],
    conflictTarget: ['transaction_hash', 'log_index'],
  },
  {
    table: '"TallySlashTargetCommittee"',
    orderBy: 'round_number, epoch_index',
    inject: { rollup_address: `'${R}'`, block_number: '0' },
  },
  {
    table: '"TallySlashAction"',
    orderBy: 'round_number, action_index, validator_address',
    inject: { rollup_address: `'${R}'` },
  },

  // ── Provider tables ──
  {
    table: '"Provider"',
    orderBy: '"blockNumber", "txHash", "logIndex"',
    inject: { rollup_address: `'${R}'` },
  },
  {
    table: '"ProviderAttester"',
    orderBy: '"blockNumber", "txHash", "logIndex"',
    inject: { rollup_address: `'${R}'` },
  },
  {
    table: '"ProviderQueueDrip"',
    orderBy: '"blockNumber", "txHash", "logIndex"',
    inject: { rollup_address: `'${R}'` },
  },
  {
    table: '"StakedWithProvider"',
    orderBy: '"blockNumber", "txHash", "logIndex"',
  },

  // ── Queue ──
  {
    table: '"ValidatorQueue"',
    orderBy: 'block_number, transaction_hash, log_index',
    inject: { rollup_address: `'${R}'` },
  },

  // ── Materializer state ──
  {
    table: '"MaterializerCheckpoint"',
    orderBy: 'name',
    inject: { rollup_address: `'${R}'`, count: '0' },
  },
];

// ─── Core Migration ───────────────────────────────────────────────────────────

interface Result {
  table: string;
  source: number;
  inserted: number;
  skipped: boolean;
}

async function migrateTable(src: Client, tgt: Client, m: TableMigration): Promise<Result> {
  const label = m.table.replace(/"/g, '');

  // Check source exists
  const exists = await src.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [label],
  );
  if (exists.rows.length === 0) {
    log(`[${label}] Not in source — skip`);
    return { table: label, source: 0, inserted: 0, skipped: true };
  }

  // Count
  const cnt = await src.query(`SELECT COUNT(*)::int AS n FROM ${m.table}`);
  const total: number = cnt.rows[0].n;
  if (total === 0) {
    log(`[${label}] Empty — skip`);
    return { table: label, source: 0, inserted: 0, skipped: true };
  }

  log(`[${label}] ${total} rows`);
  if (DRY_RUN) return { table: label, source: total, inserted: 0, skipped: true };

  // Build column mapping
  const srcCols = await getColumns(src, m.table);
  const tgtCols = await getColumns(tgt, m.table);
  const renameMap = m.renames ?? {};
  const reverseRenames: Record<string, string> = {};
  for (const [from, to] of Object.entries(renameMap)) reverseRenames[to] = from;

  // Columns to SELECT from source (with aliases for renames)
  const selectExprs: string[] = [];
  // Columns to INSERT into target
  const insertCols: string[] = [];

  for (const tCol of tgtCols) {
    if (m.inject && tCol in m.inject) continue; // injected separately
    const srcCol = reverseRenames[tCol] ?? tCol;
    if (!srcCols.includes(srcCol)) continue; // target-only column not in inject
    if (renameMap[srcCol] && renameMap[srcCol] !== tCol) continue; // old name, skip
    selectExprs.push(srcCol === tCol ? q(srcCol) : `${q(srcCol)} AS ${q(tCol)}`);
    insertCols.push(tCol);
  }

  // Add injected columns
  if (m.inject) {
    for (const col of Object.keys(m.inject)) {
      if (tgtCols.includes(col) && !insertCols.includes(col)) {
        insertCols.push(col);
      }
    }
  }

  const selectSql = selectExprs.join(', ');
  const insertColsSql = insertCols.map(q).join(', ');

  // Cap batch to stay under PG 65535 param limit
  const batchSize = Math.min(BATCH_SIZE, Math.floor(65000 / insertCols.length));

  await tgt.query('BEGIN');
  try {
    let done = 0;

    for (let off = 0; off < total; off += batchSize) {
      const batch: QueryResult = await src.query(
        `SELECT ${selectSql} FROM ${m.table} ORDER BY ${m.orderBy} LIMIT $1 OFFSET $2`,
        [batchSize, off],
      );
      if (batch.rows.length === 0) break;

      const values: unknown[] = [];
      const rowPhs: string[] = [];

      for (const row of batch.rows) {
        // Apply transforms
        if (m.transforms) {
          for (const [col, fn] of Object.entries(m.transforms)) {
            if (col in row) row[col] = fn(row[col]);
          }
        }

        const phs: string[] = [];
        for (const col of insertCols) {
          if (m.inject && col in m.inject && !(col in row)) {
            // Injected column — parse the default value
            const def = m.inject[col];
            if (def === 'NULL') {
              values.push(null);
            } else {
              values.push(def.replace(/^'|'$/g, ''));
            }
          } else {
            values.push(row[col]);
          }
          phs.push(`$${values.length}`);
        }
        rowPhs.push(`(${phs.join(',')})`);
      }

      let conflictClause = 'ON CONFLICT DO NOTHING';
      if (m.upsertColumns?.length) {
        const setCols = m.upsertColumns.map(c => `${q(c)} = EXCLUDED.${q(c)}`).join(', ');
        const target = (m.conflictTarget ?? ['id']).map(q).join(', ');
        conflictClause = `ON CONFLICT (${target}) DO UPDATE SET ${setCols}`;
      }

      await tgt.query(
        `INSERT INTO ${m.table} (${insertColsSql}) VALUES ${rowPhs.join(',')} ${conflictClause}`,
        values,
      );

      done += batch.rows.length;
      if (done % 50000 === 0 || off + batchSize >= total) {
        log(`[${label}] ${done}/${total}`);
      }
    }

    await tgt.query('COMMIT');
    log(`[${label}] Done — ${done} rows`);
    return { table: label, source: total, inserted: done, skipped: false };
  } catch (err) {
    await tgt.query('ROLLBACK');
    logError(`[${label}] Failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────

function printSummary(results: Result[]): void {
  log('\n' + '='.repeat(65));
  log(DRY_RUN ? 'DRY RUN SUMMARY' : 'MIGRATION SUMMARY');
  log('='.repeat(65));

  const hdr = `${'Table'.padEnd(40)} ${'Source'.padStart(10)} ${'Inserted'.padStart(10)}`;
  log(hdr);
  log('-'.repeat(hdr.length));

  let ts = 0, ti = 0;
  for (const r of results) {
    ts += r.source;
    ti += r.inserted;
    const s = r.skipped ? ' (skip)' : '';
    log(`${r.table.padEnd(40)} ${String(r.source).padStart(10)} ${String(r.inserted).padStart(10)}${s}`);
  }

  log('-'.repeat(hdr.length));
  log(`${'TOTAL'.padEnd(40)} ${String(ts).padStart(10)} ${String(ti).padStart(10)}`);
  log('='.repeat(65));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  validateEnv();

  log('='.repeat(65));
  log('Ignition → Alpha Public Schema Migration');
  log('='.repeat(65));
  log(`Mode:    ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  log(`Source:  ${maskUrl(SOURCE_DATABASE_URL!)}`);
  log(`Target:  ${maskUrl(TARGET_DATABASE_URL!)}`);
  log(`Rollup:  ${OLD_ROLLUP_ADDRESS}`);
  log(`Batch:   ${BATCH_SIZE}`);
  if (RESUME_FROM) log(`Resume:  ${RESUME_FROM}`);
  if (ONLY_TABLE) log(`Only:    ${ONLY_TABLE}`);
  log('='.repeat(65) + '\n');

  const src = new Client(SOURCE_DATABASE_URL!);
  const tgt = new Client(TARGET_DATABASE_URL!);
  await src.connect();
  await tgt.connect();

  const t0 = Date.now();
  const results: Result[] = [];
  let resumed = !RESUME_FROM;

  try {
    for (const m of TABLES) {
      const label = m.table.replace(/"/g, '');
      if (ONLY_TABLE && label !== ONLY_TABLE) {
        continue;
      }
      if (!resumed) {
        if (label === RESUME_FROM) { resumed = true; }
        else {
          log(`[${label}] Skip (resume from ${RESUME_FROM})`);
          results.push({ table: label, source: 0, inserted: 0, skipped: true });
          continue;
        }
      }
      results.push(await migrateTable(src, tgt, m));
    }

    printSummary(results);
    log(`\nCompleted in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } finally {
    await src.end();
    await tgt.end();
  }
}

main().catch((err) => {
  logError(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
