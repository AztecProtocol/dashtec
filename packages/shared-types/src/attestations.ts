export const CHECKPOINT_MINED = 'checkpoint-mined';
export const CHECKPOINT_PROPOSED = 'checkpoint-proposed';
export const CHECKPOINT_MISSED = 'checkpoint-missed';
export const BLOCKS_MISSED = 'blocks-missed';
export const ATTESTATION_SENT = 'attestation-sent';
export const ATTESTATION_MISSED = 'attestation-missed';

export type AttestationStatus =
  | typeof ATTESTATION_SENT
  | typeof ATTESTATION_MISSED
  | typeof CHECKPOINT_MINED
  | typeof CHECKPOINT_PROPOSED
  | typeof CHECKPOINT_MISSED
  | typeof BLOCKS_MISSED;
