import { ponder } from 'ponder:registry';
import { normalizeAddress } from '@dashtec/shared-utils';
import { EmpireBaseABI } from '@dashtec/shared-types';
import { proposerPayloadSubmitted } from 'ponder:schema';
import { logBlockHash } from '../../lib/block-hash';
// [DISABLED] Sync replaced by materializer
// import { syncPayloadSubmitted } from '../../sync/governance-proposer';

/**
 * Handle PayloadSubmitted event from GovernanceProposer contract
 * Records when a governance payload is successfully submitted on-chain
 */
ponder.on('GovernanceProposer:PayloadSubmitted', async ({ event, context }) => {
  const { payload, round } = event.args;
  const { db } = context;
  await logBlockHash(db, event);

  const payloadAddress = normalizeAddress(payload);
  const contractAddress = normalizeAddress(event.log.address);
  const submitterAddress = normalizeAddress(event.transaction.from);

  const rollupAddress = normalizeAddress(
    await context.client.readContract({
      address: event.log.address,
      abi: EmpireBaseABI,
      functionName: 'getInstance',
    })
  );

  await db.insert(proposerPayloadSubmitted).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    payload_address: payloadAddress,
    round_number: Number(round),
    block_number: event.block.number.toString(),
    transaction_hash: event.transaction.hash,
    log_index: event.log.logIndex.toString(),
    rollup_address: rollupAddress as `0x${string}`,
    timestamp: event.block.timestamp,
    contract_address: contractAddress,
    submitter_address: submitterAddress,
  });

  // [DISABLED] Sync replaced by materializer
  // await syncPayloadSubmitted({
  //   payloadAddress,
  //   roundNumber: Number(round),
  //   submitterAddress,
  //   blockNumber: event.block.number.toString(),
  //   transactionHash: event.transaction.hash,
  //   logIndex: event.log.logIndex.toString(),
  //   timestamp: event.block.timestamp.toString(),
  //   contractAddress,
  // });
});
