export type PayloadStatus = 'Submitted' | 'Submittable' | 'Active' | 'Expired';

/** Determine governance payload status from submission flags */
export function determinePayloadStatus(
  isSubmitted: boolean,
  isSubmittable: boolean,
  tooOld?: boolean
): PayloadStatus {
  if (isSubmitted) return 'Submitted';
  if (tooOld) return 'Expired';
  if (isSubmittable) return 'Submittable';
  return 'Active';
}
