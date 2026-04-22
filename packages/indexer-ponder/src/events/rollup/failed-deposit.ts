import { ponder } from 'ponder:registry';
import { normalizeAddress } from '@dashtec/shared-utils';
import { failedDeposit } from 'ponder:schema';
import { logBlockHash } from '../../lib/block-hash';
// [DISABLED] Sync replaced by materializer
// import { removeFromQueue } from '../../sync/validator-queue';

ponder.on('Rollup:FailedDeposit', async ({ event, context }) => {
  const { attester, withdrawer, publicKeyInG1, publicKeyInG2, proofOfPossession } = event.args;
  const { db } = context;
  await logBlockHash(db, event);

  const attesterAddress = normalizeAddress(attester);
  const withdrawerAddress = normalizeAddress(withdrawer);

  await db.insert(failedDeposit).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    attester_address: attesterAddress,
    withdrawer_address: withdrawerAddress,
    rollup_address: normalizeAddress(event.log.address),
    public_key_g1_x: publicKeyInG1.x,
    public_key_g1_y: publicKeyInG1.y,
    public_key_g2_x0: publicKeyInG2.x0,
    public_key_g2_x1: publicKeyInG2.x1,
    public_key_g2_y0: publicKeyInG2.y0,
    public_key_g2_y1: publicKeyInG2.y1,
    proof_of_possession_x: proofOfPossession.x,
    proof_of_possession_y: proofOfPossession.y,
    tx_hash: event.transaction.hash,
    block_number: event.block.number,
    log_index: event.log.logIndex,
    timestamp: event.block.timestamp,
  });

  // [DISABLED] Sync replaced by materializer
  // await removeFromQueue({
  //   attesterAddress,
  //   withdrawerAddress,
  //   eventType: 'FailedDeposit',
  // });
});
