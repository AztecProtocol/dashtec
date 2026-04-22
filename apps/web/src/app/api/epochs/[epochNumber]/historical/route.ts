import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ValidatorEpochSlotActivity, SlotActivity, SlotActivityStatus, ValidatorHistoryEnum } from '@/types';
import { getNetworkConfigFromCacheOrContract } from '@/services/networkConfig';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { parseRollupParam } from '@/lib/rollupParam';

export const dynamic = 'force-dynamic';

// Helper to transform attestation data into the required slot activity format
const transformAttestationsToSlotActivity = async (
  attestations: any[],
  epochNumber: number,
  providerMap: Map<string, any>
): Promise<ValidatorEpochSlotActivity[]> => {
  const networkConfig = await getNetworkConfigFromCacheOrContract();
  const slotsInEpoch = networkConfig.epochDurationSlots;
  const activityByValidator: { [key: string]: ValidatorEpochSlotActivity } = {};

  for (const att of attestations) {
    const validatorAddress = att.validator_address;
    if (!activityByValidator[validatorAddress]) {
      const validatorHexIndex = validatorAddress.substring(2, 10).toUpperCase();
      const providerData = providerMap.get(validatorAddress.toLowerCase());

      activityByValidator[validatorAddress] = {
        validatorIndex: `#${validatorHexIndex}`,
        validatorAddress: validatorAddress,
        displayName: att.validator.name || `Sequencer ${validatorHexIndex}`,
        x_handle: att.validator.x_handle,
        name: att.validator.name,
        slots: Array.from({ length: slotsInEpoch }, (_, i) => ({
          slotNumber: i,
          status: 'no_data',
          tooltip: `Slot ${i + 1}: No Data`,
        })),
        provider: providerData ? {
          providerIdentifier: providerData.providerIdentifier,
          name: providerData.name || undefined,
          description: providerData.description || undefined,
          website: providerData.website || undefined,
          logoUrl: providerData.logoUrl || undefined,
          email: providerData.email || undefined,
          discord: providerData.discord || undefined,
        } : undefined,
      };
    }

    const slotIndex = Number(att.slot_number) % slotsInEpoch;
    if (slotIndex >= 0 && slotIndex < slotsInEpoch) {
      const currentSlot = activityByValidator[validatorAddress].slots[slotIndex];
      currentSlot.status = att.status as ValidatorHistoryEnum;
      currentSlot.tooltip = `Slot ${att.slot_number}: ${att.status.replace(/-/g, ' ')}`;
    }
  }

  return Object.values(activityByValidator);
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ epochNumber: string }> }
) {
  const benchmark = createBenchmark();
  const { epochNumber } = await params;

  if (!epochNumber || isNaN(Number(epochNumber))) {
    return NextResponse.json({ error: 'Valid epoch number is required.' }, { status: 400 });
  }

  const targetEpoch = BigInt(epochNumber);
  const { searchParams } = new URL(request.url);
  const rollupAddresses = await parseRollupParam(searchParams);

  try {
    const attestations = await prisma.validatorAttestation.findMany({
      where: {
        epoch_number: targetEpoch,
        rollup_address: { in: rollupAddresses },
      },
      include: {
        validator: true,
      },
      orderBy: {
        slot_number: 'asc',
      },
    });

    if (!attestations || attestations.length === 0) {
      const { total } = benchmark.getResults();
      return NextResponse.json({
        activities: [],
        benchmark: total,
        status: 'ok'
      });
    }

    // Extract unique validator addresses from attestations
    const validatorAddresses = Array.from(new Set(attestations.map(att => att.validator_address.toLowerCase())));

    // Fetch provider data for all validators
    const providerAttesters = await prisma.providerAttester.findMany({
      where: {
        attesterAddress: { in: validatorAddresses, mode: 'insensitive' }
      },
      orderBy: {
        timestamp: 'desc'
      },
      distinct: ['attesterAddress'],
    });

    const providerIdentifiers = providerAttesters.map(pa => pa.providerIdentifier);
    const providers = await prisma.providerMetadata.findMany({
      where: {
        providerIdentifier: { in: providerIdentifiers }
      }
    });

    // Create efficient lookup maps
    const providerMetadataMap = new Map(providers.map(p => [p.providerIdentifier, p]));
    const validatorProviderMap = new Map(
      providerAttesters.map(pa => [
        pa.attesterAddress.toLowerCase(),
        providerMetadataMap.get(pa.providerIdentifier)
      ])
    );

    const transformedActivities = await transformAttestationsToSlotActivity(attestations, Number(epochNumber), validatorProviderMap);

    const { total } = benchmark.getResults();
    return NextResponse.json({
      activities: transformedActivities,
      benchmark: total,
      status: 'ok'
    });

  } catch (error) {
    logError(error as Error, 'EPOCH_HISTORICAL_ERROR', {
      epochNumber: epochNumber,
      source: 'epochs/historical'
    });
    return NextResponse.json({ error: 'Failed to fetch historical epoch activity. Please try again later.' }, { status: 500 });
  }
}