import prisma from '@/lib/prisma';
import { getRollupRegistry } from '@/services/rollupRegistry';
import type { ValidatorJourneyEvent } from '@/types';

/** Fetch all lifecycle events for a validator across all rollups */
export async function fetchValidatorJourney(address: string): Promise<ValidatorJourneyEvent[]> {
  const registry = await getRollupRegistry();
  const rollupLabelMap = new Map(registry.versions.map(v => [v.address, v.label]));

  const addressFilter = { equals: address, mode: 'insensitive' as const };

  const [queued, deposits, gseDeposits, withdrawInits, withdrawFinals, slashes, validatorRollups, canonicalUpdates] = await Promise.all([
    prisma.materializedValidatorQueued.findMany({
      where: { attester_address: addressFilter },
      orderBy: [{ block_number: 'asc' }, { log_index: 'asc' }],
    }),
    prisma.materializedValidatorDeposit.findMany({
      where: { attester_address: addressFilter },
      orderBy: [{ block_number: 'asc' }, { log_index: 'asc' }],
    }),
    prisma.materializedValidatorGseDeposit.findMany({
      where: { attester_address: addressFilter },
      orderBy: [{ block_number: 'asc' }, { log_index: 'asc' }],
    }),
    prisma.materializedValidatorWithdrawInitiated.findMany({
      where: { attester_address: addressFilter },
      orderBy: [{ block_number: 'asc' }, { log_index: 'asc' }],
    }),
    prisma.materializedValidatorWithdrawFinalized.findMany({
      where: { attester_address: addressFilter },
      orderBy: [{ block_number: 'asc' }, { log_index: 'asc' }],
    }),
    prisma.slashSlashed.findMany({
      where: { attester_address: addressFilter },
      orderBy: [{ block_number: 'asc' }, { log_index: 'asc' }],
    }),
    prisma.validatorRollup.findMany({
      where: { address: { equals: address, mode: 'insensitive' } },
    }),
    prisma.canonicalRollupUpdated.findMany({
      orderBy: [{ block_number: 'asc' }, { log_index: 'asc' }],
    }),
  ]);

  /** Map a lifecycle row to a journey event */
  const toEvent = (type: ValidatorJourneyEvent['type'], rollupAddr: string, row: { timestamp: bigint | string | null; block_number: bigint | string; transaction_hash: string; amount?: string | { toString(): string } | null }): ValidatorJourneyEvent => ({
    type,
    rollupAddress: rollupAddr,
    rollupLabel: rollupLabelMap.get(rollupAddr.toLowerCase()),
    timestamp: row.timestamp ? Number(row.timestamp) : null,
    blockNumber: String(row.block_number),
    transactionHash: row.transaction_hash,
    ...(row.amount ? { amount: String(row.amount) } : {}),
  });

  const events: ValidatorJourneyEvent[] = [
    ...queued.map(e => toEvent('queued', e.rollup_address, e)),
    ...deposits.map(e => toEvent('deposited', e.rollup_address, e)),
    ...gseDeposits.map(e => toEvent('gse_deposited', e.instance_address, e)),
    ...withdrawInits.map(e => toEvent('withdraw_initiated', e.rollup_address, e)),
    ...withdrawFinals.map(e => toEvent('withdraw_finalized', e.rollup_address, e)),
    ...slashes.map(e => toEvent('slashed', e.rollup_address, { ...e, amount: e.amount })),
  ];

  // Derive synthetic "migrated" events from ValidatorRollup + CanonicalRollupUpdated.
  // If a validator deposited on rollup A but is now on rollup B, the migration happened
  // when rollup B was registered (CanonicalRollupUpdated event).
  const migratedEntries = validatorRollups.filter(vr => vr.migration_status === 'migrated');
  for (const entry of migratedEntries) {
    // Find the canonical update that introduced the NEXT rollup after this one
    const nextUpdate = canonicalUpdates.find(
      cu => BigInt(cu.block_number) > BigInt(entry.block_number)
    );
    if (nextUpdate) {
      events.push({
        type: 'migrated',
        rollupAddress: nextUpdate.instance_address,
        rollupLabel: rollupLabelMap.get(nextUpdate.instance_address.toLowerCase()),
        timestamp: nextUpdate.timestamp ? Number(nextUpdate.timestamp) : null,
        blockNumber: String(nextUpdate.block_number),
        transactionHash: nextUpdate.transaction_hash,
      });
    }
  }

  return events.sort((a, b) => {
    const cmp = BigInt(a.blockNumber) - BigInt(b.blockNumber);
    return cmp !== 0n ? (cmp > 0n ? 1 : -1) : 0;
  });
}
