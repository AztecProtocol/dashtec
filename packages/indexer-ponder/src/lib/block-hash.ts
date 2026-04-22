import { blockHashLog } from 'ponder:schema';

/** Upsert block hash into the log for materializer reorg detection. */
export async function logBlockHash(db: any, event: any) {
  await db.insert(blockHashLog)
    .values({
      blockNumber: event.block.number,
      blockHash: event.block.hash,
    })
    .onConflictDoNothing();
}
