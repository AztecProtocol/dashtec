import { ponder } from 'ponder:registry';
import { normalizeAddress, mapStatusToString, getValidatorHexIndex, createLogger } from '@dashtec/shared-utils';
import { gseDeposit } from 'ponder:schema';
// [DISABLED] Sync replaced by materializer
// import { bootstrapValidatorOnDeposit } from '../../sync/validator/service';
import { config } from '../../config';
import { RollupABI } from '@dashtec/shared-types/abis';
import type { Address } from 'viem';
import { logBlockHash } from '../../lib/block-hash';

const logger = createLogger('GSEDepositHandler');

ponder.on('GSEContract:Deposit', async ({ event, context }) => {
  const { attester, withdrawer, publicKeyInG1, publicKeyInG2, proofOfPossession, moveWithLatestRollup, instance } = event.args;
  const { db } = context;
  await logBlockHash(db, event);

  const attesterAddress = normalizeAddress(attester);
  const withdrawerAddress = normalizeAddress(withdrawer);

  // Fetch attester view for derived columns
  let attesterStatus: string | null = null;
  let effectiveBalance: string | null = null;
  let validatorHexIndex: string | null = null;

  try {
    const attesterView = await context.client.readContract({
      address: config.ROLLUP_CONTRACT_ADDRESS as Address,
      abi: RollupABI,
      functionName: 'getAttesterView',
      args: [attesterAddress as Address],
    }) as any;

    if (attesterView) {
      attesterStatus = mapStatusToString(Number(attesterView.status));
      effectiveBalance = attesterView.effectiveBalance.toString();
      validatorHexIndex = getValidatorHexIndex(attesterAddress);
    }
  } catch (error) {
    logger.warn(`Failed to fetch attester view for ${attesterAddress}`, { error });
  }

  // Insert into Ponder database with derived columns
  await db.insert(gseDeposit).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    instance_address: normalizeAddress(instance),
    attester_address: attesterAddress,
    withdrawer_address: withdrawerAddress,
    public_key_g1_x: publicKeyInG1.x.toString(),
    public_key_g1_y: publicKeyInG1.y.toString(),
    public_key_g2_x0: publicKeyInG2.x0.toString(),
    public_key_g2_x1: publicKeyInG2.x1.toString(),
    public_key_g2_y0: publicKeyInG2.y0.toString(),
    public_key_g2_y1: publicKeyInG2.y1.toString(),
    proof_of_possession_x: proofOfPossession.x.toString(),
    proof_of_possession_y: proofOfPossession.y.toString(),
    move_with_latest_rollup: moveWithLatestRollup ? 1 : 0,
    block_number: event.block.number.toString(),
    transaction_hash: event.transaction.hash,
    log_index: event.log.logIndex.toString(),
    attester_status: attesterStatus,
    effective_balance: effectiveBalance,
    validator_hex_index: validatorHexIndex,
    timestamp: event.block.timestamp,
  });

  // [DISABLED] Sync replaced by materializer
  // await bootstrapValidatorOnDeposit({
  //   client: context.client,
  //   attesterAddress,
  //   withdrawerAddress,
  //   timestamp: event.block.timestamp,
  // });
});
