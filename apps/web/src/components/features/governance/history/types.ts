import { GovernanceRoundWithPayloads, GovernancePayloadWithSignalsList } from '@/db/queries/voting-overview';

export type ComputedStatus = 'Submitted' | 'Submittable' | 'Active' | 'Expired';

export interface ComputedPayload extends GovernancePayloadWithSignalsList {
  computedStatus: ComputedStatus;
}

export interface ComputedRound extends GovernanceRoundWithPayloads {
  payloads: ComputedPayload[];
  statusCounts: {
    submitted: number;
    submittable: number;
    active: number;
    expired: number;
  };
  tooOld: boolean;
}
