import { ponder } from 'ponder:registry';
import { checkpointInvalidated } from 'ponder:schema';
import { createLogger, normalizeAddress } from '@dashtec/shared-utils';
import { logBlockHash } from '../../lib/block-hash';

const logger = createLogger('CheckpointInvalidatedHandler');

/**
 * CheckpointInvalidated event handler
 */
ponder.on('Rollup:CheckpointInvalidated', async ({ event, context }) => {
  const { checkpointNumber } = event.args;
  await logBlockHash(context.db, event);

  await context.db.insert(checkpointInvalidated).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    checkpoint_number: checkpointNumber,
    block_number: event.block.number,
    transaction_hash: event.transaction.hash,
    log_index: event.log.logIndex,
    timestamp: event.block.timestamp,
    rollup_address: normalizeAddress(event.log.address),
  });

  logger.info(`Checkpoint ${checkpointNumber} invalidated`, {
    txHash: event.transaction.hash,
    blockNumber: event.block.number,
  });
});
