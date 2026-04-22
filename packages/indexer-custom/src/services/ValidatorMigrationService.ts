import { Prisma, PrismaClient, createCustomPrismaClient } from '@dashtec/database';
import { prisma } from '../lib/prisma';
import { createLogger } from '@dashtec/shared-utils';

const logger = createLogger('ValidatorMigrationService');

interface ValidatorSocialData {
  address: string;
  x_handle?: string;
  x_user_id?: string;
  x_image_url?: string;
  discordId?: string;
  discordUsername?: string;
  discordAvatar?: string;
  name?: string;
}

/**
 * Service for tracking validator migration progress
 */
export class ValidatorMigrationService {
  /**
   * Check if a validator has already been processed in migration
   */
  async isValidatorProcessed(validatorAddress: string): Promise<boolean> {
    try {
      const migration = await prisma.validatorMigration.findUnique({
        where: {
          validator_address: validatorAddress.toLowerCase(),
        },
      });
      return migration !== null;
    } catch (error) {
      logger.error('Error checking if validator is processed', {
        error,
        validatorAddress,
      });
      return false;
    }
  }

  /**
   * Track a validator as processed
   */
  async trackValidator(
    validatorAddress: string,
    foundInSource: boolean,
    hadSocialData: boolean,
    wasUpdated: boolean,
    alreadyHadSocial: boolean,
    updatedFields?: string[]
  ): Promise<void> {
    const safeFoundInSource = Boolean(foundInSource);
    const safeHadSocialData = Boolean(hadSocialData);
    const safeWasUpdated = Boolean(wasUpdated);
    const safeAlreadyHadSocial = Boolean(alreadyHadSocial);

    try {
      await prisma.validatorMigration.upsert({
        where: {
          validator_address: validatorAddress.toLowerCase(),
        },
        update: {
          found_in_source: safeFoundInSource,
          had_social_data: safeHadSocialData,
          was_updated: safeWasUpdated,
          already_had_social: safeAlreadyHadSocial,
          updated_fields: updatedFields ? (updatedFields as Prisma.InputJsonValue) : undefined,
          migration_timestamp: new Date(),
        },
        create: {
          validator_address: validatorAddress.toLowerCase(),
          found_in_source: safeFoundInSource,
          had_social_data: safeHadSocialData,
          was_updated: safeWasUpdated,
          already_had_social: safeAlreadyHadSocial,
          updated_fields: updatedFields ? (updatedFields as Prisma.InputJsonValue) : undefined,
        },
      });

      logger.debug('Validator tracked', {
        validatorAddress,
        foundInSource,
        hadSocialData,
        wasUpdated,
        alreadyHadSocial,
      });
    } catch (error) {
      logger.error('Error tracking validator', {
        error,
        validatorAddress,
      });
      throw error;
    }
  }

  /**
   * Get validators that haven't been processed yet
   */
  async getUnprocessedValidators(): Promise<string[]> {
    try {
      const allValidators = await prisma.validator.findMany({
        select: {
          address: true,
        },
      });

      const processedValidators = await prisma.validatorMigration.findMany({
        select: {
          validator_address: true,
        },
      });

      const processedSet = new Set(processedValidators.map((v: { validator_address: string }) => v.validator_address));

      const unprocessedValidators = allValidators
        .map((v: { address: string }) => v.address)
        .filter((address: string) => !processedSet.has(address.toLowerCase()));

      logger.info(`Found ${unprocessedValidators.length} unprocessed validators out of ${allValidators.length} total validators`);
      return unprocessedValidators;
    } catch (error) {
      logger.error('Error getting unprocessed validators', { error });
      return [];
    }
  }

  /**
   * Find validator in source database by address
   */
  async findValidatorInSourceDatabase(
    address: string,
    sourcePrisma: PrismaClient
  ): Promise<{ found: boolean; socialData: ValidatorSocialData | null }> {
    try {
      const sourceValidator = await sourcePrisma.validator.findUnique({
        where: { address: address.toLowerCase() },
        select: {
          address: true,
          x_handle: true,
          x_user_id: true,
          x_image_url: true,
          discordId: true,
          discordUsername: true,
          discordAvatar: true,
          name: true,
        },
      });

      if (!sourceValidator) {
        return { found: false, socialData: null };
      }

      const hasSocialData = sourceValidator.x_handle ||
        sourceValidator.x_user_id ||
        sourceValidator.x_image_url ||
        sourceValidator.discordId ||
        sourceValidator.discordUsername ||
        sourceValidator.discordAvatar ||
        sourceValidator.name;

      const socialData = hasSocialData ? {
        address: sourceValidator.address,
        x_handle: sourceValidator.x_handle || undefined,
        x_user_id: sourceValidator.x_user_id || undefined,
        x_image_url: sourceValidator.x_image_url || undefined,
        discordId: sourceValidator.discordId || undefined,
        discordUsername: sourceValidator.discordUsername || undefined,
        discordAvatar: sourceValidator.discordAvatar || undefined,
        name: sourceValidator.name || undefined,
      } : null;

      return { found: true, socialData };
    } catch (error) {
      logger.error(`Failed to find validator ${address} in source database`, { error, address });
      return { found: false, socialData: null };
    }
  }

  /**
   * Check if validator has social data
   */
  hasValidatorSocialData(validator: any): boolean {
    return validator.x_handle ||
      validator.x_user_id ||
      validator.x_image_url ||
      validator.discordId ||
      validator.discordUsername ||
      validator.discordAvatar ||
      validator.name;
  }

  /**
   * Process and update a single validator's social data
   * Returns updated field names if successful, empty array if no changes
   */
  async processSingleValidatorSocialData(
    socialData: ValidatorSocialData,
    existingValidator: any
  ): Promise<string[]> {
    try {
      const address = socialData.address.toLowerCase();
      logger.debug(`Processing social data for validator ${address}`);

      if (this.hasValidatorSocialData(existingValidator)) {
        logger.debug(`Validator ${address} already has social data, skipping update`);
        return [];
      }

      // Build update object and track changes
      const updatedFields: string[] = [];
      const updateData: Partial<ValidatorSocialData> = {};

      const socialFields: (keyof Omit<ValidatorSocialData, 'address'>)[] = [
        'x_handle',
        'x_user_id',
        'x_image_url',
        'discordId',
        'discordUsername',
        'discordAvatar',
        'name'
      ];

      for (const field of socialFields) {
        if (socialData[field] && socialData[field] !== existingValidator[field]) {
          updateData[field] = socialData[field];
          updatedFields.push(field);
        }
      }

      if (updatedFields.length === 0) {
        logger.debug(`No changes needed for validator ${address}`);
        return [];
      }

      // Update validator social data in database
      await prisma.validator.update({
        where: { address: address },
        data: {
          ...updateData,
          last_updated_at: new Date(),
        },
      });

      logger.info(`Updated social data for validator ${address}`, { changes: updatedFields });
      return updatedFields;
    } catch (error) {
      logger.error(`Failed to process validator ${socialData.address}`, { error, validator: socialData });
      throw error;
    }
  }

  /**
   * Process complete migration flow for a single validator
   * Handles: finding in source DB, checking social data, updating, and tracking
   */
  async processValidatorMigration(
    validatorAddress: string,
    sourcePrisma: PrismaClient
  ): Promise<{
    status: 'success' | 'no_changes' | 'not_found' | 'found_no_social' | 'error';
    address: string;
    updated?: boolean;
  }> {
    try {
      // Find validator in source database
      const sourceResult = await this.findValidatorInSourceDatabase(validatorAddress, sourcePrisma);

      // Not found in source database
      if (!sourceResult.found) {
        logger.debug(`Validator ${validatorAddress} not found in source database`);

        await this.trackValidator(
          validatorAddress,
          false,
          false,
          false,
          false,
          undefined
        );

        return { status: 'not_found', address: validatorAddress };
      }

      // Found but no social data
      if (!sourceResult.socialData) {
        await this.trackValidator(
          validatorAddress,
          true,
          false,
          false,
          false,
          undefined
        );

        return { status: 'found_no_social', address: validatorAddress };
      }

      // Get current validator from database
      const currentValidator = await prisma.validator.findUnique({
        where: { address: validatorAddress.toLowerCase() },
      });

      if (!currentValidator) {
        logger.warn(`Validator ${validatorAddress} not found in current database`);
        await this.trackValidator(
          validatorAddress,
          true,
          true,
          false,
          false,
          undefined
        );
        return { status: 'error', address: validatorAddress };
      }

      // Check if already has social data
      const alreadyHadSocial = this.hasValidatorSocialData(currentValidator);

      let updatedFields: string[] = [];
      let wasUpdated = false;

      if (!alreadyHadSocial) {
        try {
          updatedFields = await this.processSingleValidatorSocialData(
            sourceResult.socialData,
            currentValidator
          );
          wasUpdated = updatedFields.length > 0;
        } catch (error) {
          logger.error(`Failed to process validator social data for ${validatorAddress}`, { error });
        }
      }

      // Track validator as processed
      await this.trackValidator(
        validatorAddress,
        true,
        true,
        wasUpdated,
        alreadyHadSocial,
        updatedFields.length > 0 ? updatedFields : undefined
      );

      return {
        status: wasUpdated ? 'success' : 'no_changes',
        address: validatorAddress,
        updated: wasUpdated
      };
    } catch (error) {
      logger.error(`Failed to process validator migration for ${validatorAddress}`, { error });
      return { status: 'error', address: validatorAddress };
    }
  }
}
