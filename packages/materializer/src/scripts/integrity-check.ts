import { Client } from 'pg';
import { config } from '../config.js';
import { createLogger } from '@dashtec/shared-utils';

const logger = createLogger('IntegrityChecker');
const FIX_MODE = process.argv.includes('--fix');

/**
 * Table pair definition for orphan detection.
 * Maps a Prisma table to its source Ponder table with join keys.
 */
interface TablePair {
  name: string;
  prismaTable: string;
  ponderTable: string;
  materializerId: string;
  /** SQL fragment for the LEFT JOIN ON clause. */
  joinCondition: string;
  /** SQL fragment for the WHERE IS NULL check (ponder side). */
  nullCheck: string;
  /** SQL expression for block number from the Prisma side (for sorting/reporting). */
  prismaBlockExpr: string;
  /** SQL expression for the DELETE WHERE NOT EXISTS subquery. */
  notExistsCondition: string;
  /** Whether block_number is bigint (true) or text (false) for sorting. */
  blockIsBigint: boolean;
}

/** All event-copy table pairs that have a 1:1 relationship between Ponder and Prisma. */
const TABLE_PAIRS: TablePair[] = [
  // Group A: Direct event copies (ID-based join, bigint block_number)
  {
    name: 'L2BlockProposed',
    prismaTable: '"L2BlockProposed"',
    ponderTable: 'l2_block_proposed',
    materializerId: 'block_proposed',
    joinCondition: 'p.id = s.id',
    nullCheck: 's.id IS NULL',
    prismaBlockExpr: 'p.block_number',
    notExistsCondition: 'p.id = s.id',
    blockIsBigint: true,
  },
  {
    name: 'L2ProofVerified',
    prismaTable: '"L2ProofVerified"',
    ponderTable: 'l2_proof_verified',
    materializerId: 'proof_verified',
    joinCondition: 'p.id = s.id',
    nullCheck: 's.id IS NULL',
    prismaBlockExpr: 'p.block_number',
    notExistsCondition: 'p.id = s.id',
    blockIsBigint: true,
  },

  // Group B: Enriched event copies (tx_hash+log_index join, text block_number)
  {
    name: 'ProposerVote',
    prismaTable: '"ProposerVote"',
    ponderTable: 'proposer_vote',
    materializerId: 'proposer_vote',
    joinCondition: 'p.transaction_hash = s.transaction_hash AND p.log_index = s.log_index',
    nullCheck: 's.transaction_hash IS NULL',
    prismaBlockExpr: 'p.block_number',
    notExistsCondition: 'p.transaction_hash = s.transaction_hash AND p.log_index = s.log_index',
    blockIsBigint: false,
  },
  {
    name: 'ProposerPayloadSubmittable',
    prismaTable: '"ProposerPayloadSubmittable"',
    ponderTable: 'proposer_payload_submittable',
    materializerId: 'payload_submittable',
    joinCondition: 'p.transaction_hash = s.transaction_hash AND p.log_index = s.log_index',
    nullCheck: 's.transaction_hash IS NULL',
    prismaBlockExpr: 'p.block_number',
    notExistsCondition: 'p.transaction_hash = s.transaction_hash AND p.log_index = s.log_index',
    blockIsBigint: false,
  },
  {
    name: 'ProposerPayloadSubmitted',
    prismaTable: '"ProposerPayloadSubmitted"',
    ponderTable: 'proposer_payload_submitted',
    materializerId: 'payload_submitted',
    joinCondition: 'p.transaction_hash = s.transaction_hash AND p.log_index = s.log_index',
    nullCheck: 's.transaction_hash IS NULL',
    prismaBlockExpr: 'p.block_number',
    notExistsCondition: 'p.transaction_hash = s.transaction_hash AND p.log_index = s.log_index',
    blockIsBigint: false,
  },
  {
    name: 'TallyVoteCast',
    prismaTable: '"TallyVoteCast"',
    ponderTable: 'tally_vote_cast',
    materializerId: 'tally_vote_cast',
    joinCondition: 'p.transaction_hash = s.transaction_hash AND p.log_index = s.log_index',
    nullCheck: 's.transaction_hash IS NULL',
    prismaBlockExpr: 'p.block_number',
    notExistsCondition: 'p.transaction_hash = s.transaction_hash AND p.log_index = s.log_index',
    blockIsBigint: false,
  },
  {
    name: 'TallyRoundExecuted',
    prismaTable: '"TallyRoundExecuted"',
    ponderTable: 'tally_round_executed',
    materializerId: 'tally_round_executed',
    joinCondition: 'p.transaction_hash = s.transaction_hash AND p.log_index = s.log_index',
    nullCheck: 's.transaction_hash IS NULL',
    prismaBlockExpr: 'p.block_number',
    notExistsCondition: 'p.transaction_hash = s.transaction_hash AND p.log_index = s.log_index',
    blockIsBigint: false,
  },
  {
    name: 'SlashSlashed',
    prismaTable: '"SlashSlashed"',
    ponderTable: 'slash_slashed',
    materializerId: 'slash_slashed',
    joinCondition: 'p.transaction_hash = s.transaction_hash AND p.log_index = s.log_index',
    nullCheck: 's.transaction_hash IS NULL',
    prismaBlockExpr: 'p.block_number',
    notExistsCondition: 'p.transaction_hash = s.transaction_hash AND p.log_index = s.log_index',
    blockIsBigint: false,
  },

  // Group C: Staking events (camelCase Prisma columns, bigint block)
  {
    name: 'StakedWithProvider',
    prismaTable: '"StakedWithProvider"',
    ponderTable: 'staked_with_provider',
    materializerId: 'staked_with_provider',
    joinCondition: 'p."txHash" = s.transaction_hash AND p."logIndex"::text = s.log_index',
    nullCheck: 's.transaction_hash IS NULL',
    prismaBlockExpr: 'p."blockNumber"',
    notExistsCondition: 'p."txHash" = s.transaction_hash AND p."logIndex"::text = s.log_index',
    blockIsBigint: true,
  },
  {
    name: 'ProviderQueueDrip',
    prismaTable: '"ProviderQueueDrip"',
    ponderTable: 'provider_queue_dripped',
    materializerId: 'provider_queue_drip',
    joinCondition: 'p."txHash" = s.transaction_hash AND p."logIndex"::text = s.log_index',
    nullCheck: 's.transaction_hash IS NULL',
    prismaBlockExpr: 'p."blockNumber"',
    notExistsCondition: 'p."txHash" = s.transaction_hash AND p."logIndex"::text = s.log_index',
    blockIsBigint: true,
  },
];

interface OrphanResult {
  name: string;
  orphanCount: number;
  earliestBlock: string | null;
  sampleRows: Array<{ block: string; tx: string }>;
}

/** Find orphaned rows in a Prisma table that no longer exist in Ponder. */
async function findOrphans(client: Client, pair: TablePair, schema: string): Promise<OrphanResult> {
  const orderExpr = pair.blockIsBigint ? pair.prismaBlockExpr : `${pair.prismaBlockExpr}::bigint`;

  // Count orphans
  const countQuery = `
    SELECT COUNT(*) as count
    FROM public.${pair.prismaTable} p
    LEFT JOIN ${schema}.${pair.ponderTable} s ON ${pair.joinCondition}
    WHERE ${pair.nullCheck}
  `;
  const countResult = await client.query(countQuery);
  const orphanCount = parseInt(countResult.rows[0].count);

  if (orphanCount === 0) {
    return { name: pair.name, orphanCount: 0, earliestBlock: null, sampleRows: [] };
  }

  // Get earliest orphaned block and sample rows
  const sampleQuery = `
    SELECT ${pair.prismaBlockExpr}::text as block, p.transaction_hash as tx
    FROM public.${pair.prismaTable} p
    LEFT JOIN ${schema}.${pair.ponderTable} s ON ${pair.joinCondition}
    WHERE ${pair.nullCheck}
    ORDER BY ${orderExpr}
    LIMIT 5
  `;

  // For staking tables, transaction_hash column is named differently
  const sampleQueryAdjusted = pair.name === 'StakedWithProvider' || pair.name === 'ProviderQueueDrip'
    ? sampleQuery.replace('p.transaction_hash as tx', 'p."txHash" as tx')
    : sampleQuery;

  const sampleResult = await client.query(sampleQueryAdjusted);
  const sampleRows = sampleResult.rows.map((r: { block: string; tx: string }) => ({
    block: r.block,
    tx: r.tx,
  }));

  return {
    name: pair.name,
    orphanCount,
    earliestBlock: sampleRows[0]?.block ?? null,
    sampleRows,
  };
}

/** Delete orphaned rows and reset the materializer checkpoint. */
async function fixOrphans(client: Client, pair: TablePair, schema: string, earliestBlock: string): Promise<number> {
  const deleteQuery = `
    DELETE FROM public.${pair.prismaTable} p
    WHERE NOT EXISTS (
      SELECT 1 FROM ${schema}.${pair.ponderTable} s
      WHERE ${pair.notExistsCondition}
    )
  `;
  const deleteResult = await client.query(deleteQuery);
  const deleted = deleteResult.rowCount ?? 0;

  // Reset checkpoint to earliest orphaned block minus safety margin
  const resetBlock = Math.max(0, parseInt(earliestBlock) - 10).toString();
  await client.query(
    `UPDATE public."MaterializerCheckpoint"
     SET "blockNumber" = $1, "logIndex" = '0', "updatedAt" = NOW()
     WHERE "checkpointName" = $2`,
    [resetBlock, pair.materializerId]
  );

  return deleted;
}

/** Run row count comparison (same as verify-consistency but integrated). */
async function countComparison(client: Client, pair: TablePair, schema: string): Promise<{ ponder: number; prisma: number }> {
  const [ponderResult, prismaResult] = await Promise.all([
    client.query(`SELECT COUNT(*)::int as count FROM ${schema}.${pair.ponderTable}`),
    client.query(`SELECT COUNT(*)::int as count FROM public.${pair.prismaTable}`),
  ]);

  return {
    ponder: ponderResult.rows[0].count,
    prisma: prismaResult.rows[0].count,
  };
}

async function main() {
  const schema = config.PONDER_SCHEMA;
  logger.info(`Integrity Check${FIX_MODE ? ' (FIX MODE)' : ' (DRY RUN)'}`);
  logger.info(`Database: ${config.DATABASE_URL.replace(/:[^:@]*@/, ':***@')}`);
  logger.info(`Ponder schema: ${schema}`);

  const client = new Client(config.DATABASE_URL);
  await client.connect();

  try {
    let hasOrphans = false;
    let totalOrphans = 0;

    logger.info('\n=== Row Count Comparison ===\n');

    for (const pair of TABLE_PAIRS) {
      const counts = await countComparison(client, pair, schema);
      const match = counts.ponder === counts.prisma;
      const icon = match ? '[OK]' : '[!!]';
      logger.info(`${icon} ${pair.name}: Ponder=${counts.ponder}, Prisma=${counts.prisma}${!match ? ` (diff=${Math.abs(counts.ponder - counts.prisma)})` : ''}`);
    }

    logger.info('\n=== Orphan Detection (Prisma rows not in Ponder) ===\n');

    for (const pair of TABLE_PAIRS) {
      const result = await findOrphans(client, pair, schema);

      if (result.orphanCount === 0) {
        logger.info(`[OK] ${result.name}: no orphans`);
      } else {
        hasOrphans = true;
        totalOrphans += result.orphanCount;
        logger.info(`[!!] ${result.name}: ${result.orphanCount} orphaned rows (earliest block: ${result.earliestBlock})`);

        for (const row of result.sampleRows) {
          logger.info(`     block=${row.block} tx=${row.tx}`);
        }

        if (FIX_MODE) {
          const deleted = await fixOrphans(client, pair, schema, result.earliestBlock!);
          logger.info(`     FIXED: deleted ${deleted} orphans, checkpoint reset to block ${Math.max(0, parseInt(result.earliestBlock!) - 10)}`);
        }
      }
    }

    logger.info(`\n=== ${hasOrphans ? `FOUND ${totalOrphans} TOTAL ORPHANS` : 'ALL CLEAN - NO ORPHANS'} ===`);

    if (hasOrphans && !FIX_MODE) {
      logger.info('Run with --fix to delete orphaned rows and reset checkpoints\n');
    }

    return !hasOrphans;
  } finally {
    await client.end();
  }
}

main()
  .then((success) => process.exit(success ? 0 : 1))
  .catch((error) => {
    logger.error('Integrity check failed:', { error });
    process.exit(1);
  });
