import { ponder } from 'ponder:registry';
import { providerAdminUpdateInitiated } from 'ponder:schema';
import { logBlockHash } from '../../lib/block-hash';
import { config } from '../../config';

/**
 * Handle ProviderAdminUpdateInitiated event from StakingRegistry contract
 */
ponder.on('StakingRegistry:ProviderAdminUpdateInitiated', async ({ event, context }) => {
  const { providerIdentifier, newAdmin } = event.args;
  const { db } = context;
  await logBlockHash(db, event);

  await db.insert(providerAdminUpdateInitiated).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    provider_identifier: providerIdentifier.toString(),
    new_admin: newAdmin,
    block_number: event.block.number.toString(),
    transaction_hash: event.transaction.hash,
    log_index: event.log.logIndex.toString(),
    rollup_address: config.ROLLUP_CONTRACT_ADDRESS as `0x${string}`,
  });
});
