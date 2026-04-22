import { ponder } from 'ponder:registry';
import { normalizeAddress } from '@dashtec/shared-utils';
import { providerQueueDripped } from 'ponder:schema';
import { logBlockHash } from '../../lib/block-hash';
import { config } from '../../config';
// [DISABLED] Sync replaced by materializer
// import { syncProviderQueueDripped } from '../../sync/staking-registry';

/**
 * Handle ProviderQueueDripped event from StakingRegistry contract
 */
ponder.on('StakingRegistry:ProviderQueueDripped', async ({ event, context }) => {
  const { providerIdentifier, attester } = event.args;
  const { db } = context;
  await logBlockHash(db, event);

  const normalizedAttester = normalizeAddress(attester);

  await db.insert(providerQueueDripped).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    provider_identifier: providerIdentifier.toString(),
    attester_address: normalizedAttester,
    block_number: event.block.number.toString(),
    transaction_hash: event.transaction.hash,
    log_index: event.log.logIndex.toString(),
    rollup_address: config.ROLLUP_CONTRACT_ADDRESS as `0x${string}`,
    timestamp: event.block.timestamp,
  });

  // [DISABLED] Sync replaced by materializer
  // await syncProviderQueueDripped({
  //   providerIdentifier: providerIdentifier.toString(),
  //   attesterAddress: normalizedAttester,
  //   blockNumber: event.block.number.toString(),
  //   transactionHash: event.transaction.hash,
  //   logIndex: event.log.logIndex.toString(),
  //   timestamp: event.block.timestamp,
  // });
});
