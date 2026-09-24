import { ponder } from 'ponder:registry';
import { normalizeAddress, mapStatusToString, getValidatorHexIndex, createLogger } from '@dashtec/shared-utils';
import { gseDeposit } from 'ponder:schema';
// [DISABLED] Sync replaced by materializer
// import { bootstrapValidatorOnDeposit } from '../../sync/validator/service';
import { config } from '../../config';
import { RollupABI, isBonusInstance } from '@dashtec/shared-types';
import type { Address } from 'viem';
import { logBlockHash } from '../../lib/block-hash';

const logger = createLogger('GSEDepositHandler');

ponder.on('GSEContract:Deposit', async ({ event, context }) => {
  // GSE.Deposit is `(address indexed instance, address indexed attester, address
  // withdrawer)`. It carries no BLS material and no moveWithLatestRollup flag —
  // an earlier ABI here claimed otherwise, matched no logs, and left every
  // GSE-staked validator unindexed.
  const { instance, attester, withdrawer } = event.args;
  const { db } = context;
  await logBlockHash(db, event);

  const attesterAddress = normalizeAddress(attester);
  const withdrawerAddress = normalizeAddress(withdrawer);
  const instanceAddress = normalizeAddress(instance);

  // An attester who deposited with moveWithLatestRollup is held against the
  // bonus sentinel rather than a rollup, so the flag is recoverable from the
  // instance alone.
  const movesWithLatestRollup = isBonusInstance(instanceAddress);

  // The bonus sentinel is not a rollup and nothing downstream can filter on it,
  // so resolve it to the rollup that was canonical at this block. Ponder feeds
  // handlers in block/log order across contracts, so every CanonicalRollupUpdated
  // at or before this event has already been indexed.
  //
  // Falling back to the configured rollup covers deposits that precede the
  // earliest canonical update inside our indexed range: a bonus attester tracks
  // whichever rollup is latest, so the active one is the right answer for them.
  let resolvedRollupAddress = instanceAddress;
  if (movesWithLatestRollup) {
    // block_number is a text column, so comparing or ordering it in SQL would be
    // lexicographic — correct only while every value has the same digit count.
    // There are a handful of canonical updates ever, so read them all and pick
    // the latest numerically.
    const canonicalUpdates = await db.sql.query.canonicalRollupUpdated.findMany({});
    const latest = canonicalUpdates
      .filter((row) => BigInt(row.block_number) <= event.block.number)
      .sort((a, b) => {
        const byBlock = BigInt(b.block_number) - BigInt(a.block_number);
        if (byBlock !== 0n) return byBlock > 0n ? 1 : -1;
        return BigInt(b.log_index) - BigInt(a.log_index) > 0n ? 1 : -1;
      })[0];

    resolvedRollupAddress = latest
      ? normalizeAddress(latest.instance_address)
      : normalizeAddress(config.ROLLUP_CONTRACT_ADDRESS);

    if (!latest) {
      logger.debug('No canonical rollup indexed at or before this block; using the configured rollup', {
        attester: attesterAddress,
        blockNumber: event.block.number.toString(),
        resolvedRollupAddress,
      });
    }
  }

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
    instance_address: instanceAddress as `0x${string}`,
    attester_address: attesterAddress as `0x${string}`,
    withdrawer_address: withdrawerAddress as `0x${string}`,
    move_with_latest_rollup: movesWithLatestRollup ? 1 : 0,
    resolved_rollup_address: resolvedRollupAddress as `0x${string}`,
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
