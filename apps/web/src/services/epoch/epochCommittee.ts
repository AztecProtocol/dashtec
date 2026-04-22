import prisma from '@/lib/prisma';
import { getContractsForRollup } from '@/lib/contracts';
import { createLogger, serializeError } from '@dashtec/shared-utils';
import type { Address } from 'viem';

const logger = createLogger('service:epoch-committee');

export interface CommitteeMemberDetails {
  address: string;
  x_handle: string | null;
  name: string | null;
  provider: {
    providerIdentifier: string;
    name: string | null;
    description: string | null;
    website: string | null;
    logoUrl: string | null;
    email: string | null;
    discord: string | null;
  } | null;
}

/** Fetch the committee for an epoch from the rollup contract. Returns lowercased addresses. */
export async function getActiveValidatorsForRollup(
  epochNumber: number,
  rollupAddress: Address,
): Promise<string[]> {
  try {
    const { rollup } = getContractsForRollup(rollupAddress);
    const committeeMembers = await rollup.getEpochCommittee(BigInt(epochNumber));
    return committeeMembers.map(addr => (addr as string).toLowerCase());
  } catch (error: unknown) {
    logger.error('Error fetching validators from rollup', {
      rollupAddress,
      epochNumber,
      error: serializeError(error),
    });
    return [];
  }
}

/**
 * Load name/handle/provider details for a set of validator addresses.
 * Three Prisma calls run in parallel where possible (validators + attesters
 * first, then provider metadata once we know the identifiers).
 */
export async function loadCommitteeWithProviders(
  addresses: string[],
): Promise<Map<string, CommitteeMemberDetails>> {
  const [validatorDetails, providerAttesters] = await Promise.all([
    prisma.validator.findMany({
      where: { address: { in: addresses, mode: 'insensitive' } },
      select: { address: true, x_handle: true, name: true },
    }),
    prisma.providerAttester.findMany({
      where: { attesterAddress: { in: addresses, mode: 'insensitive' } },
      orderBy: { timestamp: 'desc' },
      distinct: ['attesterAddress'],
    }),
  ]);

  const providerIdentifiers = providerAttesters.map(pa => pa.providerIdentifier);
  const providers = providerIdentifiers.length
    ? await prisma.providerMetadata.findMany({
        where: { providerIdentifier: { in: providerIdentifiers } },
      })
    : [];

  const providerMap = new Map(providers.map(p => [p.providerIdentifier, p]));
  const attesterProviderMap = new Map(
    providerAttesters.map(pa => [
      pa.attesterAddress.toLowerCase(),
      providerMap.get(pa.providerIdentifier),
    ]),
  );

  return new Map(
    validatorDetails.map(v => {
      const provider = attesterProviderMap.get(v.address.toLowerCase());
      return [
        v.address.toLowerCase(),
        {
          address: v.address,
          x_handle: v.x_handle,
          name: v.name,
          provider: provider
            ? {
                providerIdentifier: provider.providerIdentifier,
                name: provider.name,
                description: provider.description,
                website: provider.website,
                logoUrl: provider.logoUrl,
                email: provider.email,
                discord: provider.discord,
              }
            : null,
        },
      ];
    }),
  );
}
