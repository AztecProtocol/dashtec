import { Validator } from '@dashtec/database';
import { ValidatorMinimalData } from '../types/validatorStats';

/**
 * Validator Service Interface
 *
 * Defines operations for managing validator data
 */
export interface IValidatorService {
  /**
   * Get all validator addresses from the database
   */
  getAllValidatorAddresses(): Promise<string[]>;

  /**
   * Get validator by address
   */
  getValidatorByAddress(address: string): Promise<Validator | null>;

  /**
   * Get validator by proposer address
   */
  getValidatorByProposerAddress(proposerAddress: string): Promise<Validator | null>;

  /**
   * Upsert validator with minimal data
   */
  upsertValidatorMinimal(data: ValidatorMinimalData): Promise<void>;

  /**
   * Upsert validator with full data
   */
  upsertFullValidator(data: {
    address: string;
    status?: string | null;
    stake_balance?: number | null;
    withdrawable_balance?: number | null;
    activation_date?: Date | null;
    exit_date?: Date | null;
    withdrawer_address?: string | null;
    validator_hex_index?: string | null;
    last_updated_at: Date;
  }): Promise<void>;

  /**
   * Update social media data for a validator
   */
  updateValidatorSocialData(address: string, socialData: {
    x_handle?: string;
    x_user_id?: string;
    x_image_url?: string;
    discordId?: string;
    discordUsername?: string;
    discordAvatar?: string;
    name?: string;
  }): Promise<void>;
}
