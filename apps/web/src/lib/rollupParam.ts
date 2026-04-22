import { getActiveRollupAddress, getRollupRegistry, isValidRollupAddress } from '@/services/rollupRegistry';
import { Prisma } from '@dashtec/database';

/** Parse ?rollup= query param into array of addresses */
export async function parseRollupParam(searchParams: URLSearchParams): Promise<string[]> {
  const rollup = searchParams.get('rollup');

  if (!rollup || rollup === 'active') {
    return [await getActiveRollupAddress()];
  }

  if (rollup === 'all') {
    const registry = await getRollupRegistry();
    return registry.versions.map(v => v.address);
  }

  const addresses = rollup.split(',').map(a => a.trim().toLowerCase());
  const validResults = await Promise.all(
    addresses.map(async (a) => ({ address: a, valid: await isValidRollupAddress(a) }))
  );
  const valid = validResults.filter(r => r.valid).map(r => r.address);

  return valid.length > 0 ? valid : [await getActiveRollupAddress()];
}

/** Create SQL fragment for rollup filtering */
export function rollupWhereClause(rollupAddresses: string[]): Prisma.Sql {
  if (rollupAddresses.length === 1) {
    return Prisma.sql`rollup_address = ${rollupAddresses[0]}`;
  }
  return Prisma.sql`rollup_address = ANY(${rollupAddresses}::varchar[])`;
}

/** Get the canonical block range for the selected rollup(s) */
export async function getRollupBlockRange(rollupAddresses: string[]): Promise<{ startBlock: number; endBlock: number | null }> {
  const registry = await getRollupRegistry();
  const selected = registry.versions.filter(v => rollupAddresses.includes(v.address));

  if (selected.length === 0) {
    return { startBlock: 0, endBlock: null };
  }

  // Use the earliest startBlock and latest endBlock across selected rollups
  const startBlock = Math.min(...selected.map(v => v.startBlock));
  const endBlock = selected.some(v => v.endBlock === null)
    ? null // includes active rollup — no upper bound
    : Math.max(...selected.map(v => v.endBlock!));

  return { startBlock, endBlock };
}

/** Create SQL fragment for block_number range filtering on a table */
export function rollupBlockRangeClause(
  table: string,
  range: { startBlock: number; endBlock: number | null }
): Prisma.Sql {
  if (range.endBlock === null) {
    return Prisma.sql`${Prisma.raw(table)}.block_number >= ${BigInt(range.startBlock)}`;
  }
  return Prisma.sql`${Prisma.raw(table)}.block_number >= ${BigInt(range.startBlock)} AND ${Prisma.raw(table)}.block_number < ${BigInt(range.endBlock)}`;
}

/** Create SQL fragment for table-qualified rollup filtering */
export function rollupWhereClauseFor(table: string, rollupAddresses: string[]): Prisma.Sql {
  if (rollupAddresses.length === 1) {
    return Prisma.sql`${Prisma.raw(table)}.rollup_address = ${rollupAddresses[0]}`;
  }
  return Prisma.sql`${Prisma.raw(table)}.rollup_address = ANY(${rollupAddresses}::varchar[])`;
}
