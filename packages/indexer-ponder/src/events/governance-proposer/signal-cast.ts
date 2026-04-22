import { ponder } from 'ponder:registry';
import { normalizeAddress } from '@dashtec/shared-utils';
import { EmpireBaseABI } from '@dashtec/shared-types';
import { proposerVote } from 'ponder:schema';
import { logBlockHash } from '../../lib/block-hash';
import { config } from '../../config';
// [DISABLED] Sync replaced by materializer
// import { syncSignalCast } from '../../sync/governance-proposer';

/**
 * Handle SignalCast event from GovernanceProposer contract
 * Records when a proposer signals support for a governance payload
 */
ponder.on('GovernanceProposer:SignalCast', async ({ event, context }) => {
  const { payload, round, signaler } = event.args;
  const { db } = context;
  await logBlockHash(db, event);

  const signalerAddress = normalizeAddress(signaler);
  const payloadAddress = normalizeAddress(payload);
  const contractAddress = normalizeAddress(event.log.address);

  // Get canonical rollup address from the governance contract
  const rollupAddress = normalizeAddress(
    await context.client.readContract({
      address: event.log.address,
      abi: EmpireBaseABI,
      functionName: 'getInstance',
    })
  );

  await db.insert(proposerVote).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    vote_type: 'GOVERNANCE_PROPOSER',
    signaler_address: signalerAddress,
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
  // await syncSignalCast({
  //   signalerAddress,
  //   payloadAddress,
  //   roundNumber: Number(round),
  //   blockNumber: event.block.number.toString(),
  //   transactionHash: event.transaction.hash,
  //   logIndex: event.log.logIndex.toString(),
  //   timestamp: event.block.timestamp.toString(),
  //   voteDate: event.block.timestamp,
  //   contractAddress,
  // });
});
