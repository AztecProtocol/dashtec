/**
 * Real Drizzle table objects mirroring packages/indexer-ponder/ponder.schema.ts.
 *
 * Integration tests need ACTUAL Drizzle PgTable objects (not simple mocks) so that
 * ponderDb.select().from(table).where(sql`...`) generates valid SQL against real
 * PostgreSQL. We recreate the tables using drizzle-orm/pg-core's pgTable() instead
 * of Ponder's onchainTable() to avoid importing the full ponder runtime.
 *
 * IMPORTANT: Column names and types here MUST match ponder.schema.ts exactly.
 * If you add columns to ponder.schema.ts, add them here too.
 */
import { pgTable, text, bigint, integer } from 'drizzle-orm/pg-core';

/** Matches ponder.schema.ts l2BlockProposed — block materializer source table. */
export const l2BlockProposed = pgTable('l2_block_proposed', {
  id: text('id').primaryKey(),
  l2_block_number: bigint('l2_block_number', { mode: 'bigint' }).notNull(),
  archive: text('archive').notNull(),
  versioned_blob_hashes: text('versioned_blob_hashes').notNull(),
  rollup_address: text('rollup_address').notNull(),
  block_number: bigint('block_number', { mode: 'bigint' }).notNull(),
  transaction_hash: text('transaction_hash').notNull(),
  log_index: integer('log_index').notNull(),
  timestamp: bigint('timestamp', { mode: 'bigint' }).notNull(),
  slot_number: bigint('slot_number', { mode: 'bigint' }).notNull(),
  coinbase: text('coinbase').notNull(),
});

/** Matches ponder.schema.ts blockHashLog — used by ReorgDetector for MAX(block_number). */
export const blockHashLog = pgTable('block_hash_log', {
  blockNumber: bigint('block_number', { mode: 'bigint' }).primaryKey(),
  blockHash: text('block_hash').notNull(),
});
