import { ponder } from 'ponder:registry';
import { decodeFunctionData, toFunctionSelector } from 'viem';
import { Multicall3ABI, RollupABI, ProposeABI } from '@dashtec/shared-types/abis';
import { l2BlockProposed } from 'ponder:schema';
import { createLogger, normalizeAddress } from '@dashtec/shared-utils';
import { logBlockHash } from '../../lib/block-hash';

const logger = createLogger('CheckpointProposedHandler');

const PROPOSE_SELECTOR = toFunctionSelector(ProposeABI);

ponder.on('Rollup:CheckpointProposed', async ({ event, context }) => {
  const { db } = context;
  await logBlockHash(db, event);
  const { checkpointNumber, archive, versionedBlobHashes, payloadDigest, attestationsHash } = event.args;

  let slotNumber: bigint = 0n;
  let coinbase: string = '0x0000000000000000000000000000000000000000';

  try {
    const txInput = event.transaction.input;

    try {
      const { args: multicallArgs } = decodeFunctionData({
        abi: Multicall3ABI,
        data: txInput,
      });

      const calls = multicallArgs[0] as { target: string; allowFailure: boolean; callData: string }[];

      for (const call of calls) {
        if (call.callData.startsWith(PROPOSE_SELECTOR)) {
          const { args: proposeArgs } = decodeFunctionData({
            abi: RollupABI,
            data: call.callData as `0x${string}`,
          });

          const proposalArgs = proposeArgs[0] as any;
          slotNumber = proposalArgs.header.slotNumber;
          coinbase = normalizeAddress(proposalArgs.header.coinbase);

          logger.debug(`Decoded propose() from multicall: slot=${slotNumber}, coinbase=${coinbase}`);
          break;
        }
      }
    } catch (err) {
      try {
        if (txInput.startsWith(PROPOSE_SELECTOR)) {
          const { args: proposeArgs } = decodeFunctionData({
            abi: RollupABI,
            data: txInput,
          });

          const proposalArgs = proposeArgs[0] as any;
          slotNumber = proposalArgs.header.slotNumber;
          coinbase = normalizeAddress(proposalArgs.header.coinbase);

          logger.debug(`Decoded direct propose(): slot=${slotNumber}, coinbase=${coinbase}`);
        }
      } catch (innerErr) {
        logger.warn(`Failed to decode propose() from tx input`, { txHash: event.transaction.hash, error: innerErr });
      }
      logger.error("Failed to decode propose() from tx input", { err });
    }
  } catch (err) {
    logger.error(`Error decoding tx input for CheckpointProposed`, { txHash: event.transaction.hash, error: err });
  }

  // Insert into Ponder onchain table — materializer copies to Prisma
  await db.insert(l2BlockProposed).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    l2_block_number: checkpointNumber,
    archive: archive,
    versioned_blob_hashes: JSON.stringify(versionedBlobHashes),
    payload_digest: payloadDigest as `0x${string}`,
    attestations_hash: attestationsHash as `0x${string}`,
    rollup_address: normalizeAddress(event.log.address),
    block_number: event.block.number,
    transaction_hash: event.transaction.hash,
    log_index: event.log.logIndex,
    timestamp: event.block.timestamp,
    slot_number: slotNumber,
    coinbase: coinbase as `0x${string}`,
  });
});
