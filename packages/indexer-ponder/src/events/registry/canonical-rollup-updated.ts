import { ponder } from 'ponder:registry';
import { canonicalRollupUpdated } from 'ponder:schema';
import { logBlockHash } from '../../lib/block-hash';

/**
 * Handle CanonicalRollupUpdated event from Registry contract
 */
ponder.on('Registry:CanonicalRollupUpdated', async ({ event, context }) => {
  const { instance, version } = event.args;
  const { db } = context;
  await logBlockHash(db, event);

  await db.insert(canonicalRollupUpdated).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    instance_address: instance,
    version: version.toString(),
    block_number: event.block.number.toString(),
    transaction_hash: event.transaction.hash,
    log_index: event.log.logIndex.toString(),
    timestamp: event.block.timestamp,
  });
});
