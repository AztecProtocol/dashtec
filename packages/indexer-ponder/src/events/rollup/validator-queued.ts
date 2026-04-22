import { ponder } from 'ponder:registry';
import { normalizeAddress } from '@dashtec/shared-utils';
import { validatorQueue } from 'ponder:schema';
import { logBlockHash } from '../../lib/block-hash';
// [DISABLED] Sync replaced by materializer
// import { addToQueue } from '../../sync/validator-queue';

ponder.on('Rollup:ValidatorQueued', async ({ event, context }) => {
  const { attester, withdrawer } = event.args;
  const { db } = context;
  await logBlockHash(db, event);

  const attesterAddress = normalizeAddress(attester);
  const withdrawerAddress = normalizeAddress(withdrawer);
  const id = `${event.transaction.hash}-${event.log.logIndex}`;

  await db.insert(validatorQueue).values({
    id,
    attester_address: attesterAddress as `0x${string}`,
    withdrawer_address: withdrawerAddress as `0x${string}`,
    block_number: event.block.number.toString(),
    transaction_hash: event.transaction.hash,
    log_index: event.log.logIndex.toString(),
    rollup_address: normalizeAddress(event.log.address),
    timestamp: event.block.timestamp,
  });

  // [DISABLED] Sync replaced by materializer
  // await addToQueue({
  //   attesterAddress,
  //   withdrawerAddress,
  //   blockNumber: event.block.number.toString(),
  //   transactionHash: event.transaction.hash,
  //   logIndex: event.log.logIndex.toString(),
  //   queuedAt: event.block.timestamp,
  // });
});
