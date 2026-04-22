/**
 * Integration tests: Reorg detection and recovery.
 *
 * Simulates chain reorganizations by manipulating block_hash_log and BlockHashCache
 * data, verifying that ReorgDetector + BlockProposedMaterializer correctly detect
 * the reorg, delete stale Prisma rows, reset the checkpoint, and re-process from
 * the reset point.
 *
 * Two reorg detection paths are tested:
 * 1. Ponder regression: ponderMax < lastCached (block_hash_log tip dropped)
 * 2. Hash mismatch: Ponder re-indexed blocks with different hashes than cached
 */
import { Pool, Client } from 'pg';

/* --- Lazy-loaded real DB instances --- */
let realPonderDb: any;
let realPrisma: any;

jest.mock('../../db/ponder', () => ({
  get ponderDb() { return realPonderDb; },
}));
jest.mock('../../db/prisma', () => ({
  get prisma() { return realPrisma; },
}));
jest.mock('../../config', () => ({
  config: { DATABASE_URL: '', PONDER_SCHEMA: 'public', NODE_ENV: 'test', LOG_LEVEL: 'info' },
}));
jest.mock('@dashtec/shared-utils', () => ({
  createLogger: () => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
  }),
}));
jest.mock('@dashtec/indexer-ponder/ponder.schema', () => {
  return require('./test-schema');
});

import { BlockProposedMaterializer } from '../../materializers/blocks';
import { ReorgDetector } from '../../services/ReorgDetector';
import { setupTestDatabase, truncateAllTables, seedL2BlockProposed, seedBlockHashLog } from './setup-db';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createPrismaClient } from '@dashtec/database';

let testDatabaseUrl: string;
let pool: Pool;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  const result = await setupTestDatabase();
  testDatabaseUrl = result.databaseUrl;
  cleanup = result.cleanup;

  pool = new Pool({ connectionString: testDatabaseUrl });
  realPonderDb = drizzle({ client: pool, casing: 'snake_case' });
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

/** Helper: count rows in a table. */
async function countRows(table: string): Promise<number> {
  const client = new Client({ connectionString: testDatabaseUrl });
  await client.connect();
  try {
    const result = await client.query(`SELECT count(*)::int FROM ${table}`);
    return result.rows[0].count;
  } finally {
    await client.end();
  }
}

/** Helper: read checkpoint from MaterializerCheckpoint table. */
async function readCheckpoint(name: string): Promise<{ blockNumber: string; logIndex: string; count: number } | null> {
  const client = new Client({ connectionString: testDatabaseUrl });
  await client.connect();
  try {
    const result = await client.query(
      `SELECT "blockNumber", "logIndex", "count" FROM "MaterializerCheckpoint" WHERE "checkpointName" = $1`,
      [name]
    );
    return result.rows[0] ?? null;
  } finally {
    await client.end();
  }
}

describe('ReorgDetector integration', () => {

  // IR-01: getPonderMaxBlock() runs MAX(block_number) on the block_hash_log table.
  // Seed block_hash_log with blocks [100..104]. getPonderMaxBlock() should return 104n.
  it('getPonderMaxBlock() returns MAX from block_hash_log', async () => {
    await seedBlockHashLog(realPonderDb, 5, { startBlock: 100 });

    const detector = new ReorgDetector();
    const maxBlock = await detector.getPonderMaxBlock();

    expect(maxBlock).toBe(104n);
  });

  // IR-02: When block_hash_log is empty, getPonderMaxBlock() returns 0n.
  // MAX() returns NULL for an empty table, treated as 0n.
  it('getPonderMaxBlock() returns 0n when block_hash_log is empty', async () => {
    const detector = new ReorgDetector();
    const maxBlock = await detector.getPonderMaxBlock();

    expect(maxBlock).toBe(0n);
  });

  // IR-03: Full reorg recovery via Ponder regression.
  // Seed 20 blocks [100..119] in block_hash_log and l2_block_proposed.
  // Poll materializer, run checkAndReset to populate BlockHashCache.
  // Then delete block_hash_log entries > 109 (simulating Ponder reorg).
  // checkAndReset detects ponderMax(109) < lastCached(119) → reorg.
  // Resets materializer to block 99, deletes Prisma rows > 99.
  it('full reorg cycle: detect regression, reset, re-process', async () => {
    // Step 1: Seed both tables and poll materializer
    await seedBlockHashLog(realPonderDb, 20, { startBlock: 100 });
    await seedL2BlockProposed(realPonderDb, 20, { startBlock: 100 });

    const materializer = new BlockProposedMaterializer();
    const processed = await materializer.poll();
    expect(processed).toBe(20);
    expect(await countRows('"L2BlockProposed"')).toBe(20);

    // Step 2: First checkAndReset — populates BlockHashCache
    const detector = new ReorgDetector();
    const firstCheck = await detector.checkAndReset([materializer]);
    expect(firstCheck).toBe(false);
    expect(await countRows('"BlockHashCache"')).toBe(20);

    // Step 3: Simulate reorg — delete block_hash_log and l2_block_proposed > 109
    const client = new Client({ connectionString: testDatabaseUrl });
    await client.connect();
    try {
      await client.query('DELETE FROM block_hash_log WHERE block_number > 109');
      await client.query('DELETE FROM l2_block_proposed WHERE block_number > 109');
    } finally {
      await client.end();
    }

    // Step 4: checkAndReset detects regression (ponderMax=109 < cached=119)
    const reorgDetected = await detector.checkAndReset([materializer]);
    expect(reorgDetected).toBe(true);

    // Checkpoint reset to 99 (ponderMax=109 - SAFETY_MARGIN=10)
    const checkpointAfter = await readCheckpoint('block_proposed');
    expect(checkpointAfter?.blockNumber).toBe('99');
    expect(checkpointAfter?.logIndex).toBe('0');

    // Prisma rows above block 99 deleted (all were 100-119, all > 99)
    expect(await countRows('"L2BlockProposed"')).toBe(0);

    // BlockHashCache entries >= 109 deleted, blocks 100-108 remain
    expect(await countRows('"BlockHashCache"')).toBe(9);

    // Step 5: Re-poll — processes remaining Ponder rows (100-109)
    const reprocessed = await materializer.poll();
    expect(reprocessed).toBe(10);
    expect(await countRows('"L2BlockProposed"')).toBe(10);
  });

  // IR-04: Hash mismatch detection. After populating BlockHashCache, manually
  // set the reorg_detector checkpoint back and change a Ponder hash. The next
  // checkAndReset fetches overlapping blocks and detects the hash mismatch.
  it('detects hash mismatch between Ponder and BlockHashCache', async () => {
    await seedBlockHashLog(realPonderDb, 20, { startBlock: 100 });
    await seedL2BlockProposed(realPonderDb, 20, { startBlock: 100 });

    const materializer = new BlockProposedMaterializer();
    await materializer.poll();

    // Populate BlockHashCache with blocks 100-119
    const detector = new ReorgDetector();
    await detector.checkAndReset([materializer]);
    expect(await countRows('"BlockHashCache"')).toBe(20);

    // Simulate: set reorg_detector checkpoint back to 110, and change
    // block 115's hash in Ponder (as if Ponder re-indexed after a reorg)
    const client = new Client({ connectionString: testDatabaseUrl });
    await client.connect();
    try {
      await client.query(
        `UPDATE "MaterializerCheckpoint" SET "blockNumber" = '110' WHERE "checkpointName" = 'reorg_detector'`
      );
      await client.query(
        `UPDATE block_hash_log SET block_hash = '0xDEADBEEF' WHERE block_number = 115`
      );
    } finally {
      await client.end();
    }

    // checkAndReset fetches [111..119], compares against cache.
    // Block 115 has a different hash → mismatch → reorg at block 115.
    const reorgDetected = await detector.checkAndReset([materializer]);
    expect(reorgDetected).toBe(true);

    // Materializer reset to 105 (115 - SAFETY_MARGIN=10)
    const checkpoint = await readCheckpoint('block_proposed');
    expect(checkpoint?.blockNumber).toBe('105');
  });

  // IR-05: No reorg scenario. Seed 10 blocks, poll, checkAndReset twice.
  // Second checkAndReset sees ponderMax=109 == lastCached=109 → no changes.
  it('checkAndReset() returns false when no reorg', async () => {
    await seedBlockHashLog(realPonderDb, 10, { startBlock: 100 });
    await seedL2BlockProposed(realPonderDb, 10, { startBlock: 100 });

    const materializer = new BlockProposedMaterializer();
    await materializer.poll();

    const detector = new ReorgDetector();

    // First call: populates cache
    const firstCheck = await detector.checkAndReset([materializer]);
    expect(firstCheck).toBe(false);

    // Second call: nothing new (ponderMax == lastCached)
    const secondCheck = await detector.checkAndReset([materializer]);
    expect(secondCheck).toBe(false);

    // Checkpoint unchanged
    const checkpoint = await readCheckpoint('block_proposed');
    expect(checkpoint?.blockNumber).toBe('109');

    // All rows still in Prisma
    expect(await countRows('"L2BlockProposed"')).toBe(10);
  });

  // IR-06: checkAndReset() skips detection when ponderMax is 0n (block_hash_log empty).
  // Prevents false reorg detection at startup before Ponder has indexed anything.
  it('skips reorg detection when ponderMax is 0n', async () => {
    // Set up a checkpoint without any Ponder data
    const client = new Client({ connectionString: testDatabaseUrl });
    await client.connect();
    try {
      await client.query(
        `INSERT INTO "MaterializerCheckpoint" ("checkpointName", "blockNumber", "logIndex", "count")
         VALUES ('block_proposed', '200', '5', 100)`
      );
    } finally {
      await client.end();
    }

    const materializer = new BlockProposedMaterializer();
    const detector = new ReorgDetector();

    const reorgDetected = await detector.checkAndReset([materializer]);

    expect(reorgDetected).toBe(false);

    // Checkpoint should NOT be modified
    const checkpoint = await readCheckpoint('block_proposed');
    expect(checkpoint?.blockNumber).toBe('200');
    expect(checkpoint?.logIndex).toBe('5');
    expect(checkpoint?.count).toBe(100);
  });

  // IR-07: deleteAfterBlock() uses BigInt comparison against real PostgreSQL.
  // Seed 10 Ponder blocks, poll them to Prisma, then call resetToBlock('104').
  // Rows with block_number 100-104 survive, rows 105-109 are deleted.
  it('deleteAfterBlock removes correct rows via BigInt comparison', async () => {
    await seedL2BlockProposed(realPonderDb, 10, { startBlock: 100 });

    const materializer = new BlockProposedMaterializer();
    await materializer.poll();
    expect(await countRows('"L2BlockProposed"')).toBe(10);

    // Reset to block 104 — should delete blocks 105-109
    await materializer.resetToBlock('104');

    expect(await countRows('"L2BlockProposed"')).toBe(5);

    // Verify the surviving rows are blocks 100-104
    const client = new Client({ connectionString: testDatabaseUrl });
    await client.connect();
    try {
      const result = await client.query(
        'SELECT block_number FROM "L2BlockProposed" ORDER BY block_number ASC'
      );
      const blockNumbers = result.rows.map((r: any) => Number(r.block_number));
      expect(blockNumbers).toEqual([100, 101, 102, 103, 104]);
    } finally {
      await client.end();
    }
  });
});
