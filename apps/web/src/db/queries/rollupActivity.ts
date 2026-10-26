import prisma from '@/lib/prisma';

/** ~2 hours of L1 blocks; checkpoints land every few blocks while a rollup runs. */
export const LIVE_WINDOW_BLOCKS = 600n;

/** L1 block of the newest indexed checkpoint for each rollup (null when none). */
export async function fetchLastCheckpointBlocks(rollupAddresses: string[]): Promise<Map<string, bigint | null>> {
  const rows = await Promise.all(
    rollupAddresses.map((address) =>
      prisma.l2BlockProposed.aggregate({
        where: { rollup_address: address },
        _max: { block_number: true },
      }).then((result) => [address, result._max.block_number ?? null] as const),
    ),
  );
  return new Map(rows);
}

/**
 * A replaced rollup can keep running (testnet's V5 did, for weeks), so being
 * deprecated does not say whether anyone still produces blocks on it. Live =
 * proposed a checkpoint within LIVE_WINDOW_BLOCKS of the newest checkpoint we
 * have on any rollup - relative to our own index, so an indexer that is behind
 * does not make every version look stopped.
 */
export function isLiveRollup(address: string, lastCheckpoints: Map<string, bigint | null>): boolean {
  const last = lastCheckpoints.get(address);
  if (last == null) return false;
  let newest = 0n;
  for (const block of lastCheckpoints.values()) {
    if (block != null && block > newest) newest = block;
  }
  return newest - last <= LIVE_WINDOW_BLOCKS;
}
