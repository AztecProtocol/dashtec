import { ponder } from 'ponder:registry';
import { normalizeAddress } from '@dashtec/shared-utils';
import { withdrawInitiated } from 'ponder:schema';
import { logBlockHash } from '../../lib/block-hash';

/**
 * Handle WithdrawInitiated event from Rollup contract
 * Records when a validator initiates a withdrawal
 */
ponder.on('Rollup:WithdrawInitiated', async ({ event, context }) => {
  const { attester, recipient, amount } = event.args;
  const { db } = context;
  await logBlockHash(db, event);

  const attesterAddress = normalizeAddress(attester);
  const recipientAddress = normalizeAddress(recipient);
  const rollupAddress = normalizeAddress(event.log.address);

  await db.insert(withdrawInitiated).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    attester_address: attesterAddress,
    recipient_address: recipientAddress,
    rollup_address: rollupAddress,
    amount,
    tx_hash: event.transaction.hash,
    block_number: event.block.number,
    log_index: event.log.logIndex,
    timestamp: event.block.timestamp,
  });
});
