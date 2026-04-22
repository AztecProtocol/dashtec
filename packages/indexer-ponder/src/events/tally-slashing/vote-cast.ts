import { ponder } from 'ponder:registry';
import { normalizeAddress } from '@dashtec/shared-utils';
import { tallyVoteCast } from 'ponder:schema';
// [DISABLED] Sync replaced by materializer
// import { syncVoteCast } from '../../sync/tally-slashing';
import { computeEpochFromSlot } from '../../sync/tally-slashing/service';
import { logBlockHash } from '../../lib/block-hash';
import { config } from '../../config';

/**
 * Handle VoteCast event from TallySlashingProposer contract
 * Records when a proposer casts a vote for a slashing round
 */
ponder.on('TallySlashingProposer:VoteCast', async ({ event, context }) => {
  const { round, slot, proposer } = event.args;
  const { db } = context;
  await logBlockHash(db, event);

  const proposerAddress = normalizeAddress(proposer);
  const contractAddress = normalizeAddress(event.log.address);
  const epochNumber = await computeEpochFromSlot(context.client, slot);

  // Insert into Ponder database
  await db.insert(tallyVoteCast).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    round_number: Number(round),
    slot_number: slot,
    proposer_address: proposerAddress as `0x${string}`,
    block_number: event.block.number.toString(),
    transaction_hash: event.transaction.hash,
    log_index: event.log.logIndex.toString(),
    rollup_address: config.ROLLUP_CONTRACT_ADDRESS as `0x${string}`,
    epoch_number: epochNumber,
    timestamp: event.block.timestamp,
    contract_address: contractAddress,
  });

  // [DISABLED] Sync replaced by materializer
  // await syncVoteCast({
  //   client: context.client,
  //   roundNumber: Number(round),
  //   slotNumber: slot,
  //   proposerAddress,
  //   blockNumber: event.block.number.toString(),
  //   transactionHash: event.transaction.hash,
  //   logIndex: event.log.logIndex.toString(),
  //   timestamp: event.block.timestamp.toString(),
  //   voteDate: event.block.timestamp,
  //   contractAddress,
  // });
});
