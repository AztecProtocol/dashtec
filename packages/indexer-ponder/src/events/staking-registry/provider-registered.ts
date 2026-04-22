import { ponder } from 'ponder:registry';
import { normalizeAddress } from '@dashtec/shared-utils';
import { providerRegistered } from 'ponder:schema';
import { logBlockHash } from '../../lib/block-hash';
import { config } from '../../config';
// [DISABLED] Sync replaced by materializer
// import { syncProviderRegistered } from '../../sync/staking-registry';

/**
 * Handle ProviderRegistered event from StakingRegistry contract
 */
ponder.on('StakingRegistry:ProviderRegistered', async ({ event, context }) => {
  const { providerIdentifier, providerAdmin, providerTakeRate } = event.args;
  const { db, client } = context;
  await logBlockHash(db, event);

  const normalizedAdmin = normalizeAddress(providerAdmin);

  // Fetch the initial rewards recipient from the contract at the block this event occurred
  const providerConfig = await client.readContract({
    address: event.log.address,
    abi: context.contracts.StakingRegistry.abi,
    functionName: 'providerConfigurations',
    args: [providerIdentifier],
    blockNumber: event.block.number,
  });

  const providerRewardsRecipient = normalizeAddress(providerConfig[2]);

  await db.insert(providerRegistered).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    provider_identifier: providerIdentifier.toString(),
    provider_admin: normalizedAdmin,
    provider_take_rate: Number(providerTakeRate),
    block_number: event.block.number.toString(),
    transaction_hash: event.transaction.hash,
    log_index: event.log.logIndex.toString(),
    rollup_address: config.ROLLUP_CONTRACT_ADDRESS as `0x${string}`,
    rewards_recipient: providerRewardsRecipient as `0x${string}`,
    timestamp: event.block.timestamp,
  });

  // [DISABLED] Sync replaced by materializer
  // await syncProviderRegistered({
  //   providerIdentifier: providerIdentifier.toString(),
  //   providerAdmin: normalizedAdmin,
  //   providerTakeRate: Number(providerTakeRate),
  //   providerRewardsRecipient,
  //   blockNumber: event.block.number.toString(),
  //   transactionHash: event.transaction.hash,
  //   logIndex: event.log.logIndex.toString(),
  //   timestamp: event.block.timestamp,
  // });
});
