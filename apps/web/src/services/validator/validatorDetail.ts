import prisma from '@/lib/prisma';
import { validatorWhereByIdentifier } from '@/db/queries/helpers';
import type { ValidatorMigrationStatus } from '@dashtec/shared-types';
import type { ProviderMetadata } from '@/types';

/** Fetch validator with epoch performance scoped to rollup */
export async function fetchValidatorWithPerformance(
  identifier: string,
  rollupAddresses: string[],
  epochFilter: { gte?: number; lte?: number },
) {
  return prisma.validator.findFirst({
    where: validatorWhereByIdentifier(identifier),
    include: {
      epochPerformance: {
        where: {
          ...(Object.keys(epochFilter).length > 0 ? { epoch_number: epochFilter } : {}),
          rollup_address: { in: rollupAddresses },
        },
        orderBy: { epoch_number: 'asc' },
      },
    },
  });
}

/** Fetch migration status from ValidatorRollup mapping */
export async function fetchMigrationStatus(
  address: string,
  rollupAddress: string,
): Promise<ValidatorMigrationStatus> {
  try {
    const row = await prisma.validatorRollup.findUnique({
      where: {
        unique_validator_rollup: { address, rollup_address: rollupAddress },
      },
    });
    return (row?.migration_status as ValidatorMigrationStatus) ?? 'active';
  } catch {
    return 'active';
  }
}

/** Fetch provider metadata for a validator address */
export async function fetchProviderForValidator(address: string): Promise<ProviderMetadata | null> {
  const attester = await prisma.providerAttester.findFirst({
    where: { attesterAddress: { equals: address, mode: 'insensitive' } },
    orderBy: { timestamp: 'desc' },
  });
  if (!attester) return null;

  const metadata = await prisma.providerMetadata.findUnique({
    where: { providerIdentifier: attester.providerIdentifier },
  });

  return {
    providerIdentifier: attester.providerIdentifier,
    name: metadata?.name ?? undefined,
    description: metadata?.description ?? undefined,
    website: metadata?.website ?? undefined,
    logoUrl: metadata?.logoUrl ?? undefined,
    email: metadata?.email ?? undefined,
    discord: metadata?.discord ?? undefined,
  };
}

/** Check if a validator is currently in the queue */
export async function checkValidatorInQueue(address: string, rollupAddresses: string[]): Promise<boolean> {
  const entry = await prisma.validatorQueue.findFirst({
    where: {
      attester_address: { equals: address, mode: 'insensitive' },
      rollup_address: { in: rollupAddresses },
    },
  });
  return entry !== null;
}
