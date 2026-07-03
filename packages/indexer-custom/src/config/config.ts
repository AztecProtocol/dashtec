import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';
import { createLogger } from '@dashtec/shared-utils';

dotenvConfig();

const logger = createLogger('Config');

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_READ_REPLICA_URL: z.string().url().optional(),
  REDIS_URL: z.string().optional(),
  RPC_URLS: z.string().min(1),
  VALIDATOR_STATS_RPC_URL: z.string().url(),
  ROLLUP_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  VALIDATOR_STATS_POLL_INTERVAL_MS: z.coerce.number().int().positive(),
  VALIDATOR_STATS_MAX_PAST_EPOCHS: z.coerce.number().int().nonnegative(),
  VALIDATOR_STATS_BATCH_SIZE: z.coerce.number().int().positive(),
  VALIDATOR_LIST_POLL_INTERVAL_MS: z.coerce.number().int().positive(),
  VALIDATOR_LIST_BATCH_SIZE: z.coerce.number().int().positive(),
  EPOCH_INTEGRITY_POLL_INTERVAL_MS: z.coerce.number().int().positive(),
  EPOCH_INTEGRITY_BATCH_SIZE: z.coerce.number().int().positive(),
  EPOCH_INTEGRITY_EPOCHS_TO_CHECK: z.coerce.number().int().positive(),
  EPOCH_AGGREGATES_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(300000),
  EPOCH_AGGREGATES_EPOCHS_TO_REPAIR: z.coerce.number().int().positive().default(50),
  EPOCH_AGGREGATES_BATCH_SIZE: z.coerce.number().int().positive().default(10),
  VALIDATOR_MIGRATION_ENABLED: z.coerce.boolean(),
  VALIDATOR_MIGRATION_POLL_INTERVAL_MS: z.coerce.number().int().positive(),
  VALIDATOR_MIGRATION_BATCH_SIZE: z.coerce.number().int().positive(),
  // Empty string is valid (migration disabled). .optional() alone still runs
  // .url() on "", so accept an empty literal too.
  VALIDATOR_MIGRATION_SOURCE_DB_URL: z.union([z.string().url(), z.literal('')]).optional(),
  STAKING_APP_API_URL: z.string().optional(),
  PROVIDER_LIST_POLL_INTERVAL_MS: z.coerce.number().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error('Environment validation failed');
  parsed.error.issues.forEach(issue => {
    logger.error(`${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const config = {
  ...parsed.data,
  RPC_URLS: parsed.data.RPC_URLS.split(',').map(url => url.trim()).filter(Boolean),
  ROLLUP_CONTRACT_ADDRESS: parsed.data.ROLLUP_CONTRACT_ADDRESS.toLowerCase() as `0x${string}`,
};

export type Config = typeof config;
