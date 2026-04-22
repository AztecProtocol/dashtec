import { ponder } from 'ponder:registry';
import { normalizeAddress } from '@dashtec/shared-utils';
import { attestersAddedToProvider } from 'ponder:schema';
import { logBlockHash } from '../../lib/block-hash';
import { config } from '../../config';
// [DISABLED] Sync replaced by materializer
// import { syncAttestersAddedToProvider } from '../../sync/staking-registry';

/**
 * Handle AttestersAddedToProvider event from StakingRegistry contract
 * Records when attesters are added to a provider
 */
ponder.on('StakingRegistry:AttestersAddedToProvider', async ({ event, context }) => {
  const { providerIdentifier, attesters } = event.args;
  const { db } = context;
  await logBlockHash(db, event);

  const normalizedAttestersArray = attesters.map(normalizeAddress);

  await db.insert(attestersAddedToProvider).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    provider_identifier: providerIdentifier.toString(),
    attesters: JSON.stringify(normalizedAttestersArray),
    block_number: event.block.number.toString(),
    transaction_hash: event.transaction.hash,
    log_index: event.log.logIndex.toString(),
    rollup_address: config.ROLLUP_CONTRACT_ADDRESS as `0x${string}`,
  });

  // [DISABLED] Sync replaced by materializer
  // await syncAttestersAddedToProvider({
  //   providerIdentifier: providerIdentifier.toString(),
  //   attesters: normalizedAttestersArray,
  //   blockNumber: event.block.number.toString(),
  //   transactionHash: event.transaction.hash,
  //   logIndex: event.log.logIndex.toString(),
  //   timestamp: event.block.timestamp,
  // });
});
