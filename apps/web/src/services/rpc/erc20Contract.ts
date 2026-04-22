import { contracts } from '@/lib/contracts';
import { createLogger } from '@dashtec/shared-utils';
import { Address } from 'viem';

const logger = createLogger('ERC20Contract');

/**
 * Get ERC20 token symbol
 */
export async function getTokenSymbol(tokenAddress: Address): Promise<string> {
  try {
    const erc20 = contracts.createERC20(tokenAddress);
    return await erc20.getTokenSymbol();
  } catch (error) {
    logger.error('Error fetching token symbol', { error, tokenAddress });
    return 'UNKNOWN';
  }
}

/**
 * Get ERC20 token decimals
 */
export async function getTokenDecimals(tokenAddress: Address): Promise<number> {
  try {
    const erc20 = contracts.createERC20(tokenAddress);
    return await erc20.getTokenDecimals();
  } catch (error) {
    logger.error('Error fetching token decimals', { error, tokenAddress });
    return 18;
  }
}

/**
 * Get ERC20 token name
 */
export async function getTokenName(tokenAddress: Address): Promise<string> {
  try {
    const erc20 = contracts.createERC20(tokenAddress);
    return await erc20.getTokenName();
  } catch (error) {
    logger.error('Error fetching token name', { error, tokenAddress });
    return 'Unknown Token';
  }
}
