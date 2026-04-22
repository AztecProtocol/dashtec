import { ponder } from 'ponder:registry';
import { normalizeAddress } from '@dashtec/shared-utils';
import { providerRewardsRecipientUpdated } from 'ponder:schema';
import { logBlockHash } from '../../lib/block-hash';
import { config } from '../../config';
// [DISABLED] Sync replaced by materializer
// import { syncProviderRewardsRecipientUpdated } from '../../sync/staking-registry';

/**
 * Handle ProviderRewardsRecipientUpdated event from StakingRegistry contract
 */
ponder.on('StakingRegistry:ProviderRewardsRecipientUpdated', async ({ event, context }) => {
  const { providerIdentifier, newRewardsRecipient } = event.args;
  const { db } = context;
  await logBlockHash(db, event);

  const normalizedRecipient = normalizeAddress(newRewardsRecipient);

  await db.insert(providerRewardsRecipientUpdated).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    provider_identifier: providerIdentifier.toString(),
    new_rewards_recipient: normalizedRecipient,
    block_number: event.block.number.toString(),
    transaction_hash: event.transaction.hash,
    log_index: event.log.logIndex.toString(),
    rollup_address: config.ROLLUP_CONTRACT_ADDRESS as `0x${string}`,
  });

  // [DISABLED] Sync replaced by materializer
  // await syncProviderRewardsRecipientUpdated({
  //   providerIdentifier: providerIdentifier.toString(),
  //   newRewardsRecipient: normalizedRecipient,
  //   blockNumber: event.block.number.toString(),
  //   transactionHash: event.transaction.hash,
  //   logIndex: event.log.logIndex.toString(),
  //   timestamp: event.block.timestamp,
  // });
});
