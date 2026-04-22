import { prisma } from '../../lib/prisma';
import { createLogger } from '@dashtec/shared-utils';

const logger = createLogger('ValidatorSync');

export interface UpsertValidatorParams {
  address: string;
  validatorHexIndex: string;
  status: string;
  stakeBalance: bigint;
  withdrawerAddress: string;
  activationDate: Date;
}

/**
 * Check if validator exists in database
 */
export async function validatorExists(address: string): Promise<boolean> {
  try {
    const validator = await prisma.validator.findUnique({
      where: { address },
    });
    return !!validator;
  } catch (error) {
    logger.error('Error checking validator existence', { error, address });
    return false;
  }
}

/**
 * Upsert validator information to Prisma
 */
export async function upsertValidator(params: UpsertValidatorParams): Promise<void> {
  try {
    await prisma.validator.upsert({
      where: {
        address: params.address,
      },
      create: {
        address: params.address,
        validator_hex_index: params.validatorHexIndex,
        withdrawer_address: params.withdrawerAddress,
        activation_date: params.activationDate,
        status: params.status,
        stake_balance: params.stakeBalance.toString(),
        last_updated_at: new Date(),
      },
      update: {
        withdrawer_address: params.withdrawerAddress,
        activation_date: params.activationDate,
        status: params.status,
        stake_balance: params.stakeBalance.toString(),
        last_updated_at: new Date(),
      },
    });

    logger.debug(`Upserted validator ${params.address} with status ${params.status}`);
  } catch (error) {
    logger.error('Error upserting validator', { error, params });
    throw error;
  }
}
