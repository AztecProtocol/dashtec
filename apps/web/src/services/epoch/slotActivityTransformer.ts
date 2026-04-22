import {
  ATTESTATION_MISSED,
  ATTESTATION_SENT,
  BLOCKS_MISSED,
  CHECKPOINT_MINED,
  CHECKPOINT_MISSED,
  CHECKPOINT_PROPOSED,
} from '@dashtec/shared-types';
import type {
  SlotActivity,
  SlotActivityStatus,
  ValidatorEpochSlotActivity,
  ValidatorHistoryEnum,
} from '@/types';
import type { CommitteeMemberDetails } from './epochCommittee';
import type { SentinelHistoryEvent, SentinelValidatorStats } from '@/services/sentinel/sentinelClient';

/**
 * Pure transformation: Sentinel stats → per-validator slot activity rows.
 *
 * For each validator in the filtered Sentinel stats, walks the slots in the
 * target epoch and folds the validator's history events into a per-slot status.
 */
export function transformSentinelStatsToSlotActivity(
  filteredSentinelStats: Record<string, SentinelValidatorStats>,
  targetEpoch: number,
  slotsInEpoch: number,
  detailsMap: Map<string, CommitteeMemberDetails>,
): ValidatorEpochSlotActivity[] {
  if (slotsInEpoch <= 0) return [];

  const activities: ValidatorEpochSlotActivity[] = [];
  for (const [validatorAddress, vData] of Object.entries(filteredSentinelStats)) {
    if (!vData) continue;

    const validatorHexIndex = validatorAddress.substring(2, 10).toUpperCase();
    const slots: SlotActivity[] = [];

    for (let i = 0; i < slotsInEpoch; i++) {
      const absoluteSlot = targetEpoch * slotsInEpoch + i;
      const status = pickSlotStatus(vData.history, absoluteSlot);
      slots.push({
        slotNumber: i,
        status,
        tooltip: status === 'no_data'
          ? `Slot ${i + 1}: No Data`
          : `Slot ${i + 1}: ${status.replace(/-/g, ' ')}`,
      });
    }

    const validatorDetails = detailsMap.get(validatorAddress.toLowerCase());

    activities.push({
      validatorIndex: `#${validatorHexIndex}`,
      validatorAddress,
      displayName: validatorDetails?.name || `Sequencer ${validatorHexIndex}`,
      x_handle: validatorDetails?.x_handle,
      name: validatorDetails?.name,
      slots,
      provider: validatorDetails?.provider
        ? {
            providerIdentifier: validatorDetails.provider.providerIdentifier,
            name: validatorDetails.provider.name || undefined,
            description: validatorDetails.provider.description || undefined,
            website: validatorDetails.provider.website || undefined,
            logoUrl: validatorDetails.provider.logoUrl || undefined,
            email: validatorDetails.provider.email || undefined,
            discord: validatorDetails.provider.discord || undefined,
          }
        : undefined,
    });
  }

  return activities;
}

/**
 * Folds the per-event status priority into a single slot status.
 * Order: proposed/mined > attestation-sent > attestation-missed > checkpoint-missed
 * > blocks-missed > first event > no_data.
 */
function pickSlotStatus(
  history: SentinelHistoryEvent[] | undefined,
  absoluteSlot: number,
): SlotActivityStatus {
  if (!history || !Array.isArray(history)) return 'no_data';

  const events = history.filter(event => parseInt(String(event.slot), 10) === absoluteSlot);
  if (events.length === 0) return 'no_data';

  const proposedEvent = events.find(e => e.status === CHECKPOINT_PROPOSED || e.status === CHECKPOINT_MINED);
  if (proposedEvent) return proposedEvent.status as ValidatorHistoryEnum;
  if (events.some(e => e.status === ATTESTATION_SENT)) return ATTESTATION_SENT;
  if (events.some(e => e.status === ATTESTATION_MISSED)) return ATTESTATION_MISSED;
  if (events.some(e => e.status === CHECKPOINT_MISSED)) return CHECKPOINT_MISSED;
  if (events.some(e => e.status === BLOCKS_MISSED)) return BLOCKS_MISSED;
  return (events[0]?.status as ValidatorHistoryEnum) ?? 'no_data';
}
