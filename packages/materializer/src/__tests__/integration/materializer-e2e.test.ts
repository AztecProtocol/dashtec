/**
 * Integration tests: BlockProposedMaterializer end-to-end.
 *
 * Tests the REAL data flow: Ponder table (Drizzle) → materializer.poll() → Prisma table.
 * Uses Testcontainers PostgreSQL — requires Docker running.
 *
 * Unlike unit tests that mock the Drizzle chain (fragile), these tests validate:
 * - buildCursorCondition() SQL with real ::bigint casts against actual PostgreSQL
 * - BigInt type handling between Ponder (bigint columns) and Prisma (BigInt fields)
 * - Cursor advancement across multiple poll cycles
 * - Idempotent upsert behavior (no duplicates on re-poll)
 * - Batch size limits (LIMIT clause in SQL)
 */
import { Pool } from 'pg';
import { Client } from 'pg';

/* --- Lazy-loaded real DB instances (set in beforeAll, accessed via mock getters) --- */
let realPonderDb: any;
let realPrisma: any;

/**
 * Mock db/ponder with a lazy getter. When BlockProposedMaterializer calls
 * ponderDb.select().from(l2BlockProposed), the getter returns the real Drizzle
 * instance pointing at the Testcontainers PostgreSQL.
 */
jest.mock('../../db/ponder', () => ({
  get ponderDb() { return realPonderDb; },
}));

/**
 * Mock db/prisma with a lazy getter. When CheckpointService calls
 * prisma.materializerCheckpoint.upsert(...), it uses the real PrismaClient.
 */
jest.mock('../../db/prisma', () => ({
  get prisma() { return realPrisma; },
}));

/** Config is not imported by any code path we test (db modules are mocked). */
jest.mock('../../config', () => ({
  config: { DATABASE_URL: '', PONDER_SCHEMA: 'public', NODE_ENV: 'test', LOG_LEVEL: 'info' },
}));

/** Silent logger — integration tests don't need console output. */
jest.mock('@dashtec/shared-utils', () => ({
  createLogger: () => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
  }),
}));

/**
 * Replace Ponder's onchainTable-based schema with plain Drizzle pgTable objects.
 * This avoids importing the full `ponder` runtime while providing real PgTable
 * instances that generate valid SQL for select().from().where().orderBy().limit().
 */
jest.mock('@dashtec/indexer-ponder/ponder.schema', () => {
  return require('./test-schema');
});

import { BlockProposedMaterializer } from '../../materializers/blocks';
import { setupTestDatabase, truncateAllTables, seedL2BlockProposed } from './setup-db';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createPrismaClient } from '@dashtec/database';

let testDatabaseUrl: string;
let pool: Pool;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  const result = await setupTestDatabase();
  testDatabaseUrl = result.databaseUrl;
  cleanup = result.cleanup;

  // Real Drizzle ponderDb — same driver the production code uses
  pool = new Pool({ connectionString: testDatabaseUrl });
  realPonderDb = drizzle({ client: pool, casing: 'snake_case' });

  // Real PrismaClient via @dashtec/database's adapter-pg pattern
  realPrisma = createPrismaClient({ databaseUrl: testDatabaseUrl });
}, 60_000);

afterAll(async () => {
  await realPrisma?.$disconnect();
  await pool?.end();
  await cleanup?.();
});

beforeEach(async () => {
  await truncateAllTables(testDatabaseUrl);
});

describe('BlockProposedMaterializer E2E', () => {

  // IE-01: Seed 5 rows in the Ponder l2_block_proposed table, run one poll cycle.
  // The materializer should read all 5 rows via Drizzle SELECT, then write all 5
  // to the Prisma L2BlockProposed table via upsert. The Prisma rows must have the
  // correct field values — block_number as BigInt, log_index as Int, etc.
  // Example: Ponder has blocks [100,101,102,103,104] → poll() returns 5 →
  //   Prisma "L2BlockProposed" has 5 rows with matching l2_block_number, archive, etc.
  it('polls 5 Ponder rows and writes them to Prisma', async () => {
    await seedL2BlockProposed(realPonderDb, 5, { startBlock: 100 });

    const materializer = new BlockProposedMaterializer();
    const processed = await materializer.poll();

    expect(processed).toBe(5);

    // Verify all 5 rows exist in Prisma
    const client = new Client({ connectionString: testDatabaseUrl });
    await client.connect();
    try {
      const result = await client.query(
        'SELECT * FROM "L2BlockProposed" ORDER BY block_number ASC'
      );
      expect(result.rows.length).toBe(5);

      // Verify first row has correct field values
      const first = result.rows[0];
      expect(first.id).toBe('block-100-0');
      expect(BigInt(first.block_number)).toBe(100n);
      expect(BigInt(first.l2_block_number)).toBe(1000n); // 100 * 10
      expect(first.log_index).toBe(0);

      // Verify last row
      const last = result.rows[4];
      expect(BigInt(last.block_number)).toBe(104n);
    } finally {
      await client.end();
    }
  });

  // IE-02: Seed 10 rows, poll with default batchSize=100 (> 10), verify all processed.
  // Then seed 5 more rows at higher block numbers, poll again. The cursor should
  // have advanced past the first 10 rows, so only the 5 new rows are processed.
  // This validates that buildCursorCondition() generates correct SQL:
  //   WHERE block_number::bigint > 109::bigint OR (block_number::bigint = 109::bigint AND log_index::bigint > 9::bigint)
  // Example: Poll 1 processes blocks [100..109], checkpoint at (109,9).
  //   Seed blocks [200..204]. Poll 2 processes only [200..204], returns 5.
  it('advances cursor between poll cycles', async () => {
    await seedL2BlockProposed(realPonderDb, 10, { startBlock: 100 });

    const materializer = new BlockProposedMaterializer();

    // First poll: processes all 10
    const first = await materializer.poll();
    expect(first).toBe(10);

    // Seed 5 more at higher block numbers
    await seedL2BlockProposed(realPonderDb, 5, { startBlock: 200, startLogIndex: 10 });

    // Second poll: cursor advanced, only new rows
    const second = await materializer.poll();
    expect(second).toBe(5);

    // Verify total rows in Prisma
    const client = new Client({ connectionString: testDatabaseUrl });
    await client.connect();
    try {
      const result = await client.query('SELECT count(*) FROM "L2BlockProposed"');
      expect(parseInt(result.rows[0].count)).toBe(15);
    } finally {
      await client.end();
    }
  });

  // IE-03: Seed 5 rows, poll to process them. Poll again immediately without new data.
  // The second poll should return 0 because the cursor is past all existing rows.
  // The Prisma table should still have exactly 5 rows — no duplicates from the
  // upsert (ON CONFLICT DO UPDATE), and no phantom rows from empty polls.
  // Example: Seed [100..104] → poll() returns 5 → poll() returns 0 →
  //   Prisma still has 5 rows, not 10
  it('idempotent: re-polling same data produces 0 new rows', async () => {
    await seedL2BlockProposed(realPonderDb, 5, { startBlock: 100 });

    const materializer = new BlockProposedMaterializer();

    const first = await materializer.poll();
    expect(first).toBe(5);

    // Second poll with no new data
    const second = await materializer.poll();
    expect(second).toBe(0);

    // Verify still 5 rows (no duplicates)
    const client = new Client({ connectionString: testDatabaseUrl });
    await client.connect();
    try {
      const result = await client.query('SELECT count(*) FROM "L2BlockProposed"');
      expect(parseInt(result.rows[0].count)).toBe(5);
    } finally {
      await client.end();
    }
  });

  // IE-04: Seed 150 rows. Default batchSize=100. First poll should return exactly 100
  // (the LIMIT clause caps it). Second poll should return the remaining 50.
  // This validates that the Drizzle .limit(this.batchSize) in fetchBatch() generates
  // correct SQL: SELECT ... LIMIT 100
  // Example: Seed 150 blocks → poll() returns 100 (cursor at block 199) →
  //   poll() returns 50 (cursor at block 249)
  it('respects batchSize=100 limit', async () => {
    await seedL2BlockProposed(realPonderDb, 150, { startBlock: 100 });

    const materializer = new BlockProposedMaterializer();

    const first = await materializer.poll();
    expect(first).toBe(100);

    const second = await materializer.poll();
    expect(second).toBe(50);

    // Verify all 150 in Prisma
    const client = new Client({ connectionString: testDatabaseUrl });
    await client.connect();
    try {
      const result = await client.query('SELECT count(*) FROM "L2BlockProposed"');
      expect(parseInt(result.rows[0].count)).toBe(150);
    } finally {
      await client.end();
    }
  });

  // IE-05: Verify the checkpoint is persisted in the MaterializerCheckpoint table
  // after a poll cycle. The checkpoint row stores blockNumber, logIndex, and count.
  // Count tracks cumulative rows processed (displayed in StatusDisplay "Rows" column).
  // Example: Seed 3 blocks [100,101,102] → poll() → checkpoint row has
  //   checkpointName='block_proposed', blockNumber='102', logIndex='2', count=3
  it('persists checkpoint with count to MaterializerCheckpoint table', async () => {
    await seedL2BlockProposed(realPonderDb, 3, { startBlock: 100 });

    const materializer = new BlockProposedMaterializer();
    await materializer.poll();

    // Read checkpoint from real database
    const client = new Client({ connectionString: testDatabaseUrl });
    await client.connect();
    try {
      const result = await client.query(
        `SELECT * FROM "MaterializerCheckpoint" WHERE "checkpointName" = 'block_proposed'`
      );
      expect(result.rows.length).toBe(1);

      const checkpoint = result.rows[0];
      expect(checkpoint.blockNumber).toBe('102');
      expect(checkpoint.logIndex).toBe('2');
      expect(checkpoint.count).toBe(3);
    } finally {
      await client.end();
    }

    // Second poll with 2 more rows — count should increment to 5
    await seedL2BlockProposed(realPonderDb, 2, { startBlock: 200, startLogIndex: 10 });
    await materializer.poll();

    await client.connect();
    try {
      const result = await client.query(
        `SELECT * FROM "MaterializerCheckpoint" WHERE "checkpointName" = 'block_proposed'`
      );
      const checkpoint = result.rows[0];
      expect(checkpoint.count).toBe(5);
      expect(materializer.totalRows).toBe(5);
    } finally {
      await client.end();
    }
  });
});
