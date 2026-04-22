import { PrismaClient, ProviderMetadata } from '@dashtec/database';
import { createLogger } from '@dashtec/shared-utils';
import { prisma } from '../lib/prisma';

interface ProviderMetadataInput {
  providerIdentifier: string;
  name?: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  email?: string;
  discord?: string;
}

/**
 * Service for managing provider metadata
 */
export class ProviderService {
  private readonly logger = createLogger('ProviderService');
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Upsert provider metadata (create or update)
   */
  async upsertProviderMetadata(data: ProviderMetadataInput): Promise<ProviderMetadata> {
    try {
      return await this.prisma.providerMetadata.upsert({
        where: {
          providerIdentifier: data.providerIdentifier,
        },
        create: {
          providerIdentifier: data.providerIdentifier,
          name: data.name,
          description: data.description,
          website: data.website,
          logoUrl: data.logoUrl,
          email: data.email,
          discord: data.discord,
        },
        update: {
          name: data.name,
          description: data.description,
          website: data.website,
          logoUrl: data.logoUrl,
          email: data.email,
          discord: data.discord,
        },
      });
    } catch (error) {
      this.logger.error('Failed to upsert provider metadata', {
        providerIdentifier: data.providerIdentifier,
        error,
      });
      throw error;
    }
  }
}
