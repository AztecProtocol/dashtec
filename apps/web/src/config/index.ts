/**
 * Configuration Module
 *
 * Centralized configuration management with validation
 *
 * Architecture:
 * - env.ts: Zod-validated environment variables
 * - contracts.ts: Contract configuration helpers
 * - ABIs imported from @dashtec/shared-types
 *
 * Usage:
 * ```ts
 * import { getEnv, getRollupContractConfig } from '@/config';
 *
 * const env = getEnv();
 * const rollupConfig = getRollupContractConfig();
 * ```
 */

export * from './env';
export * from './contracts';
