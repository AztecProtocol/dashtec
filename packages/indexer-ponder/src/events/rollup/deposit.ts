import { ponder } from 'ponder:registry';
import { normalizeAddress, mapStatusToString, getValidatorHexIndex, createLogger } from '@dashtec/shared-utils';
import { deposit } from 'ponder:schema';
// [DISABLED] Sync replaced by materializer
// import { removeFromQueue } from '../../sync/validator-queue';
// import { bootstrapValidatorOnDeposit } from '../../sync/validator/service';
import { config } from '../../config';
import { RollupABI } from '@dashtec/shared-types/abis';
import type { Address } from 'viem';
import { logBlockHash } from '../../lib/block-hash';

const logger = createLogger('DepositHandler');

ponder.on('Rollup:Deposit', async ({ event, context }) => {
  const { attester, withdrawer, publicKeyInG1, publicKeyInG2, proofOfPossession, amount } =
    event.args;

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

  await db.insert(deposit).values({
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
    amount,
    tx_hash: event.transaction.hash,
    block_number: event.block.number,
    log_index: event.log.logIndex,
    timestamp: event.block.timestamp,
    attester_status: attesterStatus,
    effective_balance: effectiveBalance,
    validator_hex_index: validatorHexIndex,
  });

  // [DISABLED] Sync replaced by materializer
  // await bootstrapValidatorOnDeposit({
  //   client: context.client,
  //   attesterAddress,
  //   withdrawerAddress,
  //   timestamp: event.block.timestamp,
  // });
  // await removeFromQueue({
  //   attesterAddress,
  //   withdrawerAddress,
  //   eventType: 'Deposit',
  // });
});
