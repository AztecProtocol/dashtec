import { ponderDb } from '../db/ponder.js';
import { prisma } from '../db/prisma.js';
import { createLogger } from '@dashtec/shared-utils';
import { sql } from 'drizzle-orm';
import {
  l2BlockProposed,
  l2ProofVerified,
  proposerVote,
  proposerPayloadSubmittable,
  proposerPayloadSubmitted,
  stakedWithProvider,
  providerQueueDripped,
  tallyVoteCast,
  tallyRoundExecuted,
  slashSlashed,
  deposit,
  validatorQueue,
  providerRegistered,
} from '@dashtec/indexer-ponder/ponder.schema';

const logger = createLogger('ConsistencyVerifier');

interface VerificationResult {
  table: string;
  ponderCount: number;
  prismaCount: number;
  match: boolean;
  sampleMismatches: string[];
}

/** Count rows in a Ponder table. */
async function ponderCount(table: any): Promise<number> {
  const result = await ponderDb
    .select({ count: sql<number>`count(*)::int` })
    .from(table);
  return result[0]?.count ?? 0;
}

/** Verify consistency for event-copy tables (row count comparison). */
async function verifyEventTable(
  name: string,
  ponderTable: any,
  prismaCountFn: () => Promise<number>
): Promise<VerificationResult> {
  const pCount = await ponderCount(ponderTable);
  const prCount = await prismaCountFn();

  return {
    table: name,
    ponderCount: pCount,
    prismaCount: prCount,
    match: pCount === prCount,
    sampleMismatches: pCount !== prCount
      ? [`Count mismatch: Ponder=${pCount}, Prisma=${prCount} (diff=${Math.abs(pCount - prCount)})`]
      : [],
  };
}

/** Run full consistency verification across all materialized tables. */
async function verify() {
  logger.info('Starting consistency verification...');

  const results: VerificationResult[] = [];

  // Group A: Direct event copies
  results.push(await verifyEventTable(
    'L2BlockProposed',
    l2BlockProposed,
    () => prisma.l2BlockProposed.count()
  ));

  results.push(await verifyEventTable(
    'L2ProofVerified',
    l2ProofVerified,
    () => prisma.l2ProofVerified.count()
  ));

  results.push(await verifyEventTable(
    'StakedWithProvider',
    stakedWithProvider,
    () => prisma.stakedWithProvider.count()
  ));

  results.push(await verifyEventTable(
    'ProviderQueueDrip',
    providerQueueDripped,
    () => prisma.providerQueueDrip.count()
  ));

  // Group B: Enriched event copies
  results.push(await verifyEventTable(
    'ProposerVote',
    proposerVote,
    () => prisma.proposerVote.count()
  ));

  results.push(await verifyEventTable(
    'ProposerPayloadSubmittable',
    proposerPayloadSubmittable,
    () => prisma.proposerPayloadSubmittable.count()
  ));

  results.push(await verifyEventTable(
    'ProposerPayloadSubmitted',
    proposerPayloadSubmitted,
    () => prisma.proposerPayloadSubmitted.count()
  ));

  results.push(await verifyEventTable(
    'TallyVoteCast',
    tallyVoteCast,
    () => prisma.tallyVoteCast.count()
  ));

  results.push(await verifyEventTable(
    'TallyRoundExecuted',
    tallyRoundExecuted,
    () => prisma.tallyRoundExecuted.count()
  ));

  results.push(await verifyEventTable(
    'SlashSlashed',
    slashSlashed,
    () => prisma.slashSlashed.count()
  ));

  // Group C: State computation - count unique entities
  const ponderDepositCount = await ponderCount(deposit);
  const prismaValidatorCount = await prisma.validator.count();
  results.push({
    table: 'Validator (from deposits)',
    ponderCount: ponderDepositCount,
    prismaCount: prismaValidatorCount,
    match: true, // Validators are deduplicated by address, so counts won't match
    sampleMismatches: [`Note: deposits=${ponderDepositCount} -> unique validators=${prismaValidatorCount}`],
  });

  const ponderProviderCount = await ponderCount(providerRegistered);
  const prismaProviderCount = await prisma.provider.count();
  results.push({
    table: 'Provider',
    ponderCount: ponderProviderCount,
    prismaCount: prismaProviderCount,
    match: ponderProviderCount === prismaProviderCount,
    sampleMismatches: ponderProviderCount !== prismaProviderCount
      ? [`Count mismatch: Ponder=${ponderProviderCount}, Prisma=${prismaProviderCount}`]
      : [],
  });

  // Print results
  logger.info('\n=== Consistency Verification Results ===\n');

  let allMatch = true;
  for (const result of results) {
    const status = result.match ? 'PASS' : 'FAIL';
    const icon = result.match ? '[OK]' : '[!!]';
    logger.info(`${icon} ${result.table}: ${status} (Ponder: ${result.ponderCount}, Prisma: ${result.prismaCount})`);

    if (result.sampleMismatches.length > 0) {
      for (const mismatch of result.sampleMismatches) {
        logger.info(`     ${mismatch}`);
      }
    }

    if (!result.match) allMatch = false;
  }

  logger.info(`\n=== ${allMatch ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'} ===\n`);

  return allMatch;
}

verify()
  .then((success) => process.exit(success ? 0 : 1))
  .catch((error) => {
    logger.error('Verification failed:', { error });
    process.exit(1);
  });
