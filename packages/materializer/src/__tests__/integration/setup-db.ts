/**
 * Integration test database setup using Testcontainers.
 *
 * Starts a real PostgreSQL 16 container and creates both:
 * - Ponder tables (snake_case, unqualified in public schema)
 * - Prisma tables (PascalCase quoted, matching @dashtec/database schema)
 *
 * Prerequisites: Docker must be running.
 */
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { l2BlockProposed, blockHashLog } from './test-schema';

/**
 * Ponder tables match packages/indexer-ponder/ponder.schema.ts.
 * These live in the public schema (no PONDER_SCHEMA prefix) because the
 * integration tests don't call setDatabaseSchema() from @ponder/client.
 */
const PONDER_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS l2_block_proposed (
  id TEXT PRIMARY KEY,
  l2_block_number BIGINT NOT NULL,
  archive TEXT NOT NULL,
  versioned_blob_hashes TEXT NOT NULL,
  rollup_address TEXT NOT NULL,
  block_number BIGINT NOT NULL,
  transaction_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  timestamp BIGINT NOT NULL,
  slot_number BIGINT NOT NULL,
  coinbase TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS block_hash_log (
  block_number BIGINT PRIMARY KEY,
  block_hash TEXT NOT NULL
);
`;

/**
 * Prisma tables match packages/database/prisma/models/*.prisma.
 * Quoted PascalCase names (PostgreSQL preserves case only when quoted).
 * Only tables used in integration test scenarios are created here.
 */
const PRISMA_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS "MaterializerCheckpoint" (
  "checkpointName" VARCHAR(100) PRIMARY KEY,
  "blockNumber" VARCHAR(20) NOT NULL DEFAULT '0',
  "logIndex" VARCHAR(10) NOT NULL DEFAULT '0',
  "count" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "BlockHashCache" (
  "blockNumber" BIGINT PRIMARY KEY,
  "blockHash" CHAR(66) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "L2BlockProposed" (
  id TEXT PRIMARY KEY,
  l2_block_number BIGINT NOT NULL,
  archive CHAR(66) NOT NULL,
  versioned_blob_hashes TEXT NOT NULL,
  rollup_address CHAR(42) NOT NULL,
  block_number BIGINT NOT NULL,
  transaction_hash CHAR(66) NOT NULL,
  log_index INTEGER NOT NULL,
  timestamp BIGINT NOT NULL,
  slot_number BIGINT NOT NULL,
  coinbase CHAR(42) NOT NULL,
  CONSTRAINT unique_l2_block_proposed_transaction_log UNIQUE(transaction_hash, log_index)
);

CREATE TABLE IF NOT EXISTS "L2ProofVerified" (
  id TEXT PRIMARY KEY,
  l2_block_number BIGINT NOT NULL,
  prover_id CHAR(42) NOT NULL,
  block_number BIGINT NOT NULL,
  transaction_hash CHAR(66) NOT NULL,
  log_index INTEGER NOT NULL,
  timestamp BIGINT NOT NULL,
  epoch_number TEXT,
  transaction_from CHAR(42) NOT NULL,
  transaction_to CHAR(42),
  transaction_gas BIGINT NOT NULL,
  transaction_gas_price BIGINT,
  transaction_value BIGINT NOT NULL,
  transaction_nonce INTEGER NOT NULL,
  transaction_max_fee_per_gas BIGINT,
  transaction_max_priority_fee_per_gas BIGINT,
  CONSTRAINT unique_l2_proof_verified_transaction_log UNIQUE(transaction_hash, log_index)
);
`;

export interface TestDatabase {
  container: StartedPostgreSqlContainer;
  databaseUrl: string;
  cleanup: () => Promise<void>;
}

/** Start PostgreSQL container and create all tables needed for integration tests. */
export async function setupTestDatabase(): Promise<TestDatabase> {
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('materializer_test')
    .start();

  const databaseUrl = container.getConnectionUri();

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(PONDER_TABLES_SQL);
    await client.query(PRISMA_TABLES_SQL);
  } finally {
    await client.end();
  }

  return {
    container,
    databaseUrl,
    cleanup: async () => {
      await container.stop();
    },
  };
}

/** Truncate all tables to reset state between tests. */
export async function truncateAllTables(databaseUrl: string): Promise<void> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`
      TRUNCATE TABLE
        l2_block_proposed, block_hash_log,
        "MaterializerCheckpoint", "BlockHashCache", "L2BlockProposed", "L2ProofVerified"
      CASCADE;
    `);
  } finally {
    await client.end();
  }
}

/** Seed l2_block_proposed Ponder table via Drizzle (same driver the materializer reads from). */
export async function seedL2BlockProposed(
  db: NodePgDatabase,
  count: number,
  options: { startBlock?: number; startLogIndex?: number } = {}
): Promise<void> {
  const { startBlock = 0, startLogIndex = 0 } = options;

  const rows = Array.from({ length: count }, (_, i) => {
    const blockNum = startBlock + i;
    const logIdx = startLogIndex + i;
    return {
      id: `block-${blockNum}-${logIdx}`,
      l2_block_number: BigInt(blockNum * 10),
      archive: '0x' + 'a'.repeat(64),
      versioned_blob_hashes: '[]',
      rollup_address: '0x' + 'b'.repeat(40),
      block_number: BigInt(blockNum),
      transaction_hash: '0x' + blockNum.toString(16).padStart(64, '0'),
      log_index: logIdx,
      timestamp: BigInt(1700000000 + blockNum),
      slot_number: BigInt(blockNum * 2),
      coinbase: '0x' + 'c'.repeat(40),
    };
  });

  await db.insert(l2BlockProposed).values(rows);
}

/** Seed block_hash_log Ponder table via Drizzle (used by ReorgDetector). */
export async function seedBlockHashLog(
  db: NodePgDatabase,
  count: number,
  options: { startBlock?: number } = {}
): Promise<void> {
  const { startBlock = 0 } = options;

  const rows = Array.from({ length: count }, (_, i) => ({
    blockNumber: BigInt(startBlock + i),
    blockHash: '0x' + (startBlock + i).toString(16).padStart(64, '0'),
  }));

  await db.insert(blockHashLog).values(rows);
}
