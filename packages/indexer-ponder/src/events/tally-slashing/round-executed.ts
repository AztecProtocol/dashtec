import { IndexingFunctionArgs, ponder } from 'ponder:registry';
import { normalizeAddress } from '@dashtec/shared-utils';
import { tallyRoundExecuted, slashSlashed, tallyVoteCast } from 'ponder:schema';
import { getTally } from '../../sync/tally-slashing/service';
// [DISABLED] Sync replaced by materializer
// import { syncRoundExecuted, syncTallySlashTargetCommittees, syncTallySlashActions } from '../../sync/tally-slashing';
import { eq } from 'ponder';
import { logBlockHash } from '../../lib/block-hash';
import { config } from '../../config';

ponder.on('TallySlashingProposer:RoundExecuted', async ({ event, context }) => {
  const { round, slashCount } = event.args;
  const { db } = context;
  await logBlockHash(db, event);

  const contractAddress = normalizeAddress(event.log.address);

  const tallyData = await getTally(context.client, Number(round), db, event.transaction.hash);

  // Serialize tally results and committees as JSON for materializer
  const tallyResultsJson = tallyData.tallyResults.length > 0
    ? JSON.stringify(tallyData.tallyResults.map(r => ({ attester: r.attester, amount: r.amount.toString() })))
    : null;
  const targetCommitteesJson = tallyData.committees.length > 0
    ? JSON.stringify(tallyData.committees.map(c => [...c]))
    : null;

  // Count votes for this round from Ponder DB
  const votesForRound = await db.sql.query.tallyVoteCast.findMany({
    where: (table, { eq }) => eq(table.round_number, Number(round)),
  });

  await db.insert(tallyRoundExecuted).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    round_number: Number(round),
    slash_count: Number(slashCount),
    block_number: event.block.number.toString(),
    transaction_hash: event.transaction.hash,
    log_index: event.log.logIndex.toString(),
    rollup_address: config.ROLLUP_CONTRACT_ADDRESS as `0x${string}`,
    payload_address: tallyData.payloadAddress as `0x${string}` | null,
    total_slash_amount: tallyData.totalSlashAmount,
    vote_count: votesForRound.length,
    tally_results: tallyResultsJson,
    target_committees: targetCommitteesJson,
    timestamp: event.block.timestamp,
    contract_address: contractAddress,
  });

  await db.sql
    .update(slashSlashed)
    .set({
      round_number: Number(round),
      payload_address: tallyData.payloadAddress as `0x${string}` | null,
    })
    .where(eq(slashSlashed.transaction_hash, event.transaction.hash));

  // [DISABLED] Sync replaced by materializer
  // await syncRoundExecuted({
  //   roundNumber: Number(round),
  //   slashCount: Number(slashCount),
  //   payloadAddress: tallyData.payloadAddress,
  //   totalSlashAmount: tallyData.totalSlashAmount,
  //   blockNumber: event.block.number.toString(),
  //   transactionHash: event.transaction.hash,
  //   logIndex: event.log.logIndex.toString(),
  //   timestamp: event.block.timestamp.toString(),
  //   executedDate: event.block.timestamp,
  //   contractAddress,
  // });
  // if (tallyData.committees.length > 0) {
  //   await syncTallySlashTargetCommittees({
  //     roundNumber: Number(round),
  //     committees: tallyData.committees,
  //     contractAddress,
  //     rollupInstance: config.ROLLUP_CONTRACT_ADDRESS,
  //   });
  // }
  // if (tallyData.tallyResults.length > 0) {
  //   await syncTallySlashActions({
  //     roundNumber: Number(round),
  //     tallyResults: tallyData.tallyResults,
  //     payloadAddress: tallyData.payloadAddress,
  //     deploymentTxHash: event.transaction.hash,
  //     deploymentBlock: event.block.number.toString(),
  //     executedAt: new Date(Number(event.block.timestamp) * 1000),
  //     contractAddress,
  //     tallyBlockNumber: event.block.number.toString(),
  //   });
  // }
});
