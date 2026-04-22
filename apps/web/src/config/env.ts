import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().startsWith('postgresql://', 'Must be a PostgreSQL connection URL'),
  DATABASE_URL_REPLICA: z.string().startsWith('postgresql://', 'Must be a PostgreSQL connection URL').optional(),

  SESSION_PASSWORD: z.string().min(32, 'Password must be at least 32 characters'),

  ROLLUP_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  SLASHING_PROPOSER_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  GOVERNANCE_PROPOSER_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  STAKING_REGISTRY_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),

  ETHEREUM_RPC_URL: z.string().startsWith('http', 'Must be a valid HTTP URL'),
  NEXT_SENTINEL_URL: z.string().startsWith('http', 'Must be a valid HTTP URL'),
  REDIS_URL: z.string().optional(),

  X_CLIENT_ID: z.string().min(1),
  X_CLIENT_SECRET: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),

  APP_URL: z.string().startsWith('http', 'Must be a valid HTTP URL'),
  ETHEREUM_EXPLORER_URL: z.string().startsWith('http', 'Must be a valid HTTP URL'),
  AZTEC_SCAN_URL: z.string().startsWith('http', 'Must be a valid HTTP URL').optional(),

  NEXT_PUBLIC_NETWORK_TYPE: z.enum(['mainnet', 'sepolia']).default('sepolia'),
  RATE_LIMITING_ENABLED: z.enum(['true', 'false']).default('true'),
  CHAIN_NAME: z.enum(['mainnet', 'sepolia']).default('sepolia'),
  PORT: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(65535)).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      throw new Error(
        `Environment validation failed:\n${messages.join('\n')}`
      );
    }
    throw error;
  }
}

let envInstance: Env | null = null;

export function getEnv(): Env {
  if (!envInstance) {
    envInstance = parseEnv();
  }
  return envInstance;
}

export function resetEnv(): void {
  envInstance = null;
}
