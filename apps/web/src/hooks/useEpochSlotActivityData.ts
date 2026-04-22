import { useState, useMemo } from 'react';
import { CHECKPOINT_PROPOSED, CHECKPOINT_MINED, CHECKPOINT_MISSED, BLOCKS_MISSED, ATTESTATION_SENT, ATTESTATION_MISSED } from '@dashtec/shared-types';
import { ValidatorEpochSlotActivity } from '@/types';

export interface EpochPerformanceMetrics {
  totalValidators: number;
  activeValidators: number;
  avgAttestationRate: number;
  avgBlockProductionRate: number;
  totalAttestations: number;
  successfulAttestations: number;
  totalBlockOps: number;
  successfulBlockOps: number;
}

/** Computes performance metrics and provides search filtering for epoch slot activity data */
export function useEpochSlotActivityData(activities: ValidatorEpochSlotActivity[]) {
  const [searchTerm, setSearchTerm] = useState('');

  const performanceMetrics = useMemo<EpochPerformanceMetrics>(() => {
    if (!activities.length) {
      return {
        totalValidators: 0,
        activeValidators: 0,
        avgAttestationRate: 0,
        avgBlockProductionRate: 0,
        totalAttestations: 0,
        successfulAttestations: 0,
        totalBlockOps: 0,
        successfulBlockOps: 0,
      };
    }

    const totalValidators = activities.length;
    let totalAttestations = 0;
    let successfulAttestations = 0;
    let totalBlockOps = 0;
    let successfulBlockOps = 0;
    let activeValidators = 0;

    activities.forEach(validator => {
      let hasActivity = false;
      validator.slots.forEach(slot => {
        if (slot.status === ATTESTATION_SENT || slot.status === ATTESTATION_MISSED) {
          totalAttestations++;
          if (slot.status === ATTESTATION_SENT) {
            successfulAttestations++;
            hasActivity = true;
          }
        }
        if (slot.status === CHECKPOINT_PROPOSED || slot.status === CHECKPOINT_MINED || slot.status === CHECKPOINT_MISSED || slot.status === BLOCKS_MISSED) {
          totalBlockOps++;
          if (slot.status === CHECKPOINT_PROPOSED || slot.status === CHECKPOINT_MINED) {
            successfulBlockOps++;
            hasActivity = true;
          }
        }
      });
      if (hasActivity) activeValidators++;
    });

    return {
      totalValidators,
      activeValidators,
      avgAttestationRate: totalAttestations > 0 ? (successfulAttestations / totalAttestations) * 100 : 0,
      avgBlockProductionRate: totalBlockOps > 0 ? (successfulBlockOps / totalBlockOps) * 100 : 0,
      totalAttestations,
      successfulAttestations,
      totalBlockOps,
      successfulBlockOps,
    };
  }, [activities]);

  const filteredActivities = useMemo(() => {
    if (!searchTerm) return activities;
    const lower = searchTerm.toLowerCase();
    return activities.filter(a =>
      a.displayName.toLowerCase().includes(lower) ||
      a.validatorIndex.toLowerCase().includes(lower) ||
      a.validatorAddress.toLowerCase().includes(lower) ||
      a.name?.toLowerCase().includes(lower) ||
      a.x_handle?.toLowerCase().includes(lower) ||
      a.provider?.name?.toLowerCase().includes(lower) ||
      a.provider?.providerIdentifier?.toLowerCase().includes(lower)
    );
  }, [activities, searchTerm]);

  return { performanceMetrics, searchTerm, setSearchTerm, filteredActivities };
}
