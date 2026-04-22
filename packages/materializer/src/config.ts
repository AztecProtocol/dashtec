import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  DATABASE_URL: z.string().url(),
  PONDER_SCHEMA: z.string().default('ponder_dev'),
  ROLLUP_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const parsed = configSchema.parse(process.env);
export const config = {
  ...parsed,
  ROLLUP_CONTRACT_ADDRESS: parsed.ROLLUP_CONTRACT_ADDRESS.toLowerCase(),
};
