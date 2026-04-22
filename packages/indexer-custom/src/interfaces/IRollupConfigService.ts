/**
 * Rollup Config Service Interface
 *
 * Defines operations for retrieving rollup configuration
 */
export interface IRollupConfigService {
  /**
   * Get slots per epoch from rollup configuration
   */
  getSlotsPerEpoch(): Promise<bigint>;

  /**
   * Get epoch committee for a specific epoch
   */
  getEpochCommittee(epoch: bigint): Promise<string[]>;

}
