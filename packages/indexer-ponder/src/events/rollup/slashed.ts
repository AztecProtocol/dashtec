import { ponder } from 'ponder:registry';
import { normalizeAddress } from '@dashtec/shared-utils';
import { slashSlashed } from 'ponder:schema';
import { logBlockHash } from '../../lib/block-hash';
// [DISABLED] Sync replaced by materializer
// import { syncSlashSlashed } from '../../sync/tally-slashing';

/**
 * Handle Slashed event from Rollup contract
 * Records when an attester is slashed
 */
ponder.on('Rollup:Slashed', async ({ event, context }) => {
  const { attester, amount } = event.args;
  const { db } = context;
  await logBlockHash(db, event);

  const attesterAddress = normalizeAddress(attester);
  const contractAddress = normalizeAddress(event.log.address);

  // Insert into Ponder database
  await db.insert(slashSlashed).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    attester_address: attesterAddress,
    amount: amount.toString(),
    block_number: event.block.number.toString(),
    transaction_hash: event.transaction.hash,
    log_index: event.log.logIndex.toString(),
    rollup_address: normalizeAddress(event.log.address),
    timestamp: event.block.timestamp,
    contract_address: contractAddress,
  });

  // [DISABLED] Sync replaced by materializer
  // await syncSlashSlashed({
  //   attesterAddress,
  //   amount: amount.toString(),
  //   blockNumber: event.block.number.toString(),
  //   transactionHash: event.transaction.hash,
  //   logIndex: event.log.logIndex.toString(),
  //   timestamp: event.block.timestamp.toString(),
  //   slashedDate: event.block.timestamp,
  //   contractAddress,
  // });
});
