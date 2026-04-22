import { ponder } from 'ponder:registry';
import { l2ProofVerified } from 'ponder:schema';
import { normalizeAddress, createLogger } from '@dashtec/shared-utils';
// [DISABLED] Sync replaced by materializer
// import { insertL2ProofVerified } from '../../sync/blocks';
import { RollupABI } from '@dashtec/shared-types/abis';
import { logBlockHash } from '../../lib/block-hash';

const logger = createLogger('L2ProofVerifiedHandler');

/**
 * L2ProofVerified event handler
 */
ponder.on('Rollup:L2ProofVerified', async ({ event, context }) => {
  const { checkpointNumber: l2BlockNumber, proverId } = event.args;
  await logBlockHash(context.db, event);

  // Get epoch number for this L2 checkpoint
  let epochNumber: string | null = null;
  try {
    const epoch = await context.client.readContract({
      address: event.log.address,
      abi: RollupABI,
      functionName: 'getEpochForCheckpoint',
      args: [l2BlockNumber],
    });
    epochNumber = epoch.toString();
    logger.debug(`Got epoch ${epochNumber} for L2 checkpoint ${l2BlockNumber}`);
  } catch (err) {
    logger.error(`Failed to get epoch for L2 checkpoint ${l2BlockNumber}`, { error: err });
  }

  // Insert to Ponder DB
  await context.db.insert(l2ProofVerified).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    l2_block_number: l2BlockNumber,
    prover_id: normalizeAddress(proverId),
    block_number: event.block.number,
    transaction_hash: event.transaction.hash,
    epoch_number: epochNumber,
    log_index: event.log.logIndex,
    timestamp: event.block.timestamp,
    rollup_address: normalizeAddress(event.log.address),
    // Transaction data
    transaction_from: normalizeAddress(event.transaction.from),
    transaction_to: event.transaction.to ? normalizeAddress(event.transaction.to) : null,
    transaction_gas: event.transaction.gas,
    transaction_gas_price: event.transaction.gasPrice ?? null,
    transaction_value: event.transaction.value,
    transaction_nonce: event.transaction.nonce,
    transaction_max_fee_per_gas: event.transaction.maxFeePerGas ?? null,
    transaction_max_priority_fee_per_gas: event.transaction.maxPriorityFeePerGas ?? null,
  });

  // [DISABLED] Sync replaced by materializer
  // await insertL2ProofVerified({
  //   id: `${event.transaction.hash}-${event.log.logIndex}`,
  //   l2BlockNumber,
  //   proverId: normalizeAddress(proverId),
  //   blockNumber: event.block.number,
  //   transactionHash: event.transaction.hash,
  //   epochNumber,
  //   logIndex: event.log.logIndex,
  //   timestamp: event.block.timestamp,
  //   transactionFrom: normalizeAddress(event.transaction.from),
  //   transactionTo: event.transaction.to ? normalizeAddress(event.transaction.to) : null,
  //   transactionGas: event.transaction.gas,
  //   transactionGasPrice: event.transaction.gasPrice ?? null,
  //   transactionValue: event.transaction.value,
  //   transactionNonce: event.transaction.nonce,
  //   transactionMaxFeePerGas: event.transaction.maxFeePerGas ?? null,
  //   transactionMaxPriorityFeePerGas: event.transaction.maxPriorityFeePerGas ?? null,
  // });
});
