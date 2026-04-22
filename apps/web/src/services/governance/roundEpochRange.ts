/**
 * Pure math for converting a governance round number to its slot/epoch range.
 *
 * roundNumber * roundSize = the first slot in that round.
 */
export interface RoundEpochRange {
  startEpoch: number;
  endEpoch: number;
  startSlot: number;
  endSlot: number;
}

export function deriveRoundEpochRange(
  roundNumber: number,
  roundSize: number,
  slotsPerEpoch: number,
): RoundEpochRange {
  const startSlot = roundNumber * roundSize;
  const endSlot = startSlot + roundSize - 1;
  return {
    startSlot,
    endSlot,
    startEpoch: Math.floor(startSlot / slotsPerEpoch),
    endEpoch: Math.floor(endSlot / slotsPerEpoch),
  };
}
