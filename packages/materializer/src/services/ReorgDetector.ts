import { ponderDb } from '../db/ponder.js';
import { prisma } from '../db/prisma.js';
import { config } from '../config.js';
import { createLogger } from '@dashtec/shared-utils';
import { sql } from 'drizzle-orm';
import { blockHashLog } from '@dashtec/indexer-ponder/ponder.schema';
import type { BaseMaterializer } from '../materializers/base.js';

const logger = createLogger('ReorgDetector');
const SAFETY_MARGIN = 10n;
const CACHE_DEPTH = 200n;
const CHECKPOINT_NAME = 'reorg_detector';

/**
 * Detects chain reorgs by comparing Ponder's block_hash_log against
 * a local BlockHashCache. Cache is append-only — hashes are never
 * overwritten. Tracks last cached block and row count in checkpoint
 * for incremental processing.
 */
export class ReorgDetector {
  public lastPonderMaxBlock = '0';

  /** Get the maximum block number from Ponder's block_hash_log. */
  async getPonderMaxBlock(): Promise<bigint> {
    try {
      const [result] = await ponderDb
        .select({ max: sql<string>`MAX(${blockHashLog.blockNumber})` })
        .from(blockHashLog);

      return result?.max ? BigInt(result.max) : 0n;
    } catch (err: any) {
      if (err?.message?.includes('does not exist')) {
        logger.debug('block_hash_log table not yet created by ponder, skipping reorg check');
        return 0n;
      }
      throw err;
    }
  }

  /** Check for reorgs by comparing Ponder hashes against local cache. */
  async checkAndReset(materializers: BaseMaterializer[]): Promise<boolean> {
    const ponderMax = await this.getPonderMaxBlock();
    this.lastPonderMaxBlock = ponderMax.toString();
    if (ponderMax === 0n) return false;

    const checkpoint = await this.getCheckpoint();
    const lastCached = BigInt(checkpoint.blockNumber);

    // Ponder regressed below our cache — likely reorg
    if (ponderMax < lastCached) {
      logger.warn(`Ponder regressed: cached up to ${lastCached}, now at ${ponderMax}`);
      return await this.handleReorg(ponderMax, materializers);
    }

    // Nothing new to process
    if (ponderMax === lastCached) return false;

    // Fetch new block hashes from Ponder incrementally
    const fromBlock = lastCached + 1n;
    const ponderHashes = await this.fetchPonderHashes(fromBlock, ponderMax);

    // Compare against existing cache — catches reorgs where Ponder
    // re-indexed blocks we already cached (same block number, different hash)
    const reorgBlock = await this.findHashMismatch(ponderHashes);

    if (reorgBlock !== null) {
      return await this.handleReorg(reorgBlock, materializers);
    }

    // Insert new blocks into cache (append-only, skip duplicates)
    await this.insertNewHashes(ponderHashes);

    // Prune old entries beyond cache depth
    const pruneBelow = ponderMax - CACHE_DEPTH;
    if (pruneBelow > 0n) {
      await prisma.blockHashCache.deleteMany({
        where: { blockNumber: { lt: pruneBelow } },
      });
    }

    // Update checkpoint with actual row count from table
    const cachedRows = await prisma.blockHashCache.count();
    await this.updateCheckpoint(ponderMax.toString(), cachedRows);

    return false;
  }

  /** Handle a confirmed reorg — reset materializers and invalidate cache. */
  private async handleReorg(reorgBlock: bigint, materializers: BaseMaterializer[]): Promise<boolean> {
    logger.warn(`Reorg detected at block ${reorgBlock} (hash mismatch between Ponder and cache)`);
    const resetBlock = reorgBlock - SAFETY_MARGIN;

    for (const mat of materializers) {
      await mat.resetToBlock(resetBlock.toString());
      logger.warn(`Reset materializer ${mat.id} to block ${resetBlock}`);
    }

    // Invalidate cache entries at and after the reorg point
    await prisma.blockHashCache.deleteMany({
      where: { blockNumber: { gte: reorgBlock } },
    });

    // Count remaining cache entries
    const remaining = await prisma.blockHashCache.count();
    await this.updateCheckpoint(resetBlock.toString(), remaining);

    logger.warn('Reorg recovery complete, materializers will re-process from reset point');
    return true;
  }

  /** Read block hashes from Ponder's block_hash_log for a given range. */
  private async fetchPonderHashes(fromBlock: bigint, toBlock: bigint): Promise<Map<bigint, string>> {
    const map = new Map<bigint, string>();
    if (fromBlock > toBlock) return map;

    const rows = await ponderDb
      .select({
        blockNumber: blockHashLog.blockNumber,
        blockHash: blockHashLog.blockHash,
      })
      .from(blockHashLog)
      .where(sql`${blockHashLog.blockNumber} >= ${fromBlock} AND ${blockHashLog.blockNumber} <= ${toBlock}`);

    for (const row of rows) {
      map.set(BigInt(row.blockNumber), row.blockHash);
    }

    return map;
  }

  /** Compare Ponder hashes against cached entries. Returns earliest mismatch block or null. */
  private async findHashMismatch(ponderHashes: Map<bigint, string>): Promise<bigint | null> {
    if (ponderHashes.size === 0) return null;

    const blockNumbers = Array.from(ponderHashes.keys());
    const CHUNK = 10000;

    for (let i = 0; i < blockNumbers.length; i += CHUNK) {
      const chunk = blockNumbers.slice(i, i + CHUNK);
      const cached = await prisma.blockHashCache.findMany({
        where: { blockNumber: { in: chunk } },
        orderBy: { blockNumber: 'asc' },
      });

      for (const entry of cached) {
        const ponderHash = ponderHashes.get(entry.blockNumber);
        if (ponderHash && ponderHash !== entry.blockHash) {
          logger.warn(
            `Hash mismatch at block ${entry.blockNumber}: cached=${entry.blockHash}, ponder=${ponderHash}`
          );
          return entry.blockNumber;
        }
      }
    }

    return null;
  }

  /** Get reorg detector checkpoint. */
  private async getCheckpoint(): Promise<{ blockNumber: string; count: number }> {
    const checkpoint = await prisma.materializerCheckpoint.findUnique({
      where: { checkpointName_rollup_address: { checkpointName: CHECKPOINT_NAME, rollup_address: config.ROLLUP_CONTRACT_ADDRESS } },
    });
    return {
      blockNumber: checkpoint?.blockNumber ?? '0',
      count: checkpoint?.count ?? 0,
    };
  }

  /** Update reorg detector checkpoint. */
  private async updateCheckpoint(blockNumber: string, count: number): Promise<void> {
    await prisma.materializerCheckpoint.upsert({
      where: { checkpointName_rollup_address: { checkpointName: CHECKPOINT_NAME, rollup_address: config.ROLLUP_CONTRACT_ADDRESS } },
      create: { checkpointName: CHECKPOINT_NAME, rollup_address: config.ROLLUP_CONTRACT_ADDRESS, blockNumber, logIndex: '0', count },
      update: { blockNumber, count },
    });
  }

  /** Insert only new block hashes into cache, skipping existing entries. Returns inserted count. */
  private async insertNewHashes(hashes: Map<bigint, string>): Promise<number> {
    if (hashes.size === 0) return 0;

    const data = Array.from(hashes.entries()).map(([blockNumber, blockHash]) => ({
      blockNumber,
      blockHash,
    }));

    const result = await prisma.blockHashCache.createMany({
      data,
      skipDuplicates: true,
    });

    return result.count;
  }
}
