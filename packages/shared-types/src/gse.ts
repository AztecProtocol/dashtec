/**
 * GSE (Governance Staking Escrow) constants.
 *
 * The GSE tracks each attester against an "instance". That is normally a rollup
 * address, but attesters who deposited with `moveWithLatestRollup = true` are
 * held against a single sentinel address instead — the bonus instance — which is
 * automatically reassigned to whichever rollup is currently canonical. See the
 * contract docs in l1-contracts/src/governance/GSE.sol:
 *
 *   "maintaining a set of 'bonus' attesters which are always deposited on behalf
 *    of the latest rollup [...] automatically 'moved along' whenever the latest
 *    rollup changes."
 *
 * This matters when indexing `GSE.Deposit`: the event's `instance` field is the
 * bonus address for those attesters, not a rollup, so it cannot be written to
 * ValidatorRollup.rollup_address as-is. It has to be resolved to the rollup that
 * was canonical at that block. On Aztec mainnet as of the V5 deployment, *every*
 * GSE deposit uses the bonus instance, so getting this wrong yields a fully
 * populated gse_deposit table and a validator registry that is still empty.
 */

/**
 * `address(uint160(uint256(keccak256("bonus-instance"))))` from GSE.sol.
 *
 * A compile-time constant of the contract, so it is identical on every network
 * and safe to hardcode. Verify with:
 *   keccak256(toHex('bonus-instance')).slice(-40)
 */
export const BONUS_INSTANCE_ADDRESS = '0x9064fb41156d300196d5eb95e0b3c1f08ebc39a8';

/** True when a GSE Deposit's `instance` is the bonus sentinel rather than a rollup. */
export function isBonusInstance(instanceAddress: string | null | undefined): boolean {
  return (instanceAddress ?? '').toLowerCase() === BONUS_INSTANCE_ADDRESS;
}
