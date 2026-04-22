import { ponder } from 'ponder:registry';
import { normalizeAddress } from '@dashtec/shared-utils';
import { EmpireBaseABI } from '@dashtec/shared-types';
import { proposerPayloadSubmittable } from 'ponder:schema';
import { logBlockHash } from '../../lib/block-hash';
// [DISABLED] Sync replaced by materializer
// import { syncPayloadSubmittable } from '../../sync/governance-proposer';

/**
 * Handle PayloadSubmittable event from GovernanceProposer contract
 * Records when a governance payload reaches quorum and becomes submittable
 */
ponder.on('GovernanceProposer:PayloadSubmittable', async ({ event, context }) => {
  const { payload, round } = event.args;
  const { db } = context;
  await logBlockHash(db, event);

  const payloadAddress = normalizeAddress(payload);
  const contractAddress = normalizeAddress(event.log.address);

  const rollupAddress = normalizeAddress(
    await context.client.readContract({
      address: event.log.address,
      abi: EmpireBaseABI,
      functionName: 'getInstance',
    })
  );

  await db.insert(proposerPayloadSubmittable).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    payload_address: payloadAddress,
    round_number: Number(round),
    block_number: event.block.number.toString(),
    transaction_hash: event.transaction.hash,
    log_index: event.log.logIndex.toString(),
    rollup_address: rollupAddress as `0x${string}`,
    timestamp: event.block.timestamp,
    contract_address: contractAddress,
  });

  // [DISABLED] Sync replaced by materializer
  // await syncPayloadSubmittable({
  //   payloadAddress,
  //   roundNumber: Number(round),
  //   blockNumber: event.block.number.toString(),
  //   transactionHash: event.transaction.hash,
  //   logIndex: event.log.logIndex.toString(),
  //   timestamp: event.block.timestamp.toString(),
  //   contractAddress,
  // });
});
