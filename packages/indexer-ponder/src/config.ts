import { z } from 'zod';
import { config as configEnv } from 'dotenv';

configEnv();

/**
 * Environment configuration schema
 */
const configSchema = z.object({
  DATABASE_URL: z.string().url(),
  RPC_URLS: z.string().transform((val) => {
    const urls = val.split(',').map(url => url.trim());
    urls.forEach(url => {
      if (!z.string().url().safeParse(url).success) {
        throw new Error(`Invalid RPC URL: ${url}`);
      }
    });
    return urls;
  }),
  CHAIN_ID: z.string().transform(Number),
  ROLLUP_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  GOVERNANCE_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  GOVERNANCE_PROPOSER_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  SLASHING_PROPOSER_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  GSE_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  STAKING_REGISTRY_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  REGISTRY_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  START_BLOCK: z.string().transform(Number).default('0'),
  // Optional per-contract overrides. Contracts that survive a rollup upgrade
  // must keep indexing from their own deployment, not the new rollup's.
  START_BLOCK_SLASHING_PROPOSER: z.string().transform(Number).optional(),
  START_BLOCK_GSE: z.string().transform(Number).optional(),
  START_BLOCK_REGISTRY: z.string().transform(Number).optional(),
  START_BLOCK_GOVERNANCE: z.string().transform(Number).optional(),
  START_BLOCK_GOVERNANCE_PROPOSER: z.string().transform(Number).optional(),
  START_BLOCK_STAKING_REGISTRY: z.string().transform(Number).optional(),
  // Rollups the registry has moved past, as "address:startBlock[:slashingProposer]"
  // entries. Their validators keep exiting after an upgrade - and an old rollup
  // can keep producing blocks and slashing for weeks - so they stay indexed
  // alongside the current one; written by discover-contracts.js.
  PREVIOUS_ROLLUPS: z.string().default('').transform((val) =>
    val.split(',').map((entry) => entry.trim()).filter(Boolean).map((entry) => {
      const [address, startBlock, slashingProposer] = entry.split(':');
      const isAddress = (value?: string) => /^0x[a-fA-F0-9]{40}$/.test(value ?? '');
      if (!isAddress(address) || !/^\d+$/.test(startBlock ?? '') || (slashingProposer && !isAddress(slashingProposer))) {
        throw new Error(`Invalid PREVIOUS_ROLLUPS entry: ${entry}`);
      }
      return {
        address: address.toLowerCase() as `0x${string}`,
        startBlock: Number(startBlock),
        slashingProposer: slashingProposer?.toLowerCase() as `0x${string}` | undefined,
      };
    })
  ),
  NETWORK_TYPE: z.string(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  PORT: z.string().transform(Number).default('42069'),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Lazy-load configuration
 */
let lazyConfig: Config | null = null;

export const config = new Proxy({} as Config, {
  get(target, prop) {
    if (!lazyConfig) {
      const parsed = configSchema.parse(process.env);
      lazyConfig = {
        ...parsed,
        ROLLUP_CONTRACT_ADDRESS: parsed.ROLLUP_CONTRACT_ADDRESS.toLowerCase(),
      };
    }
    return lazyConfig[prop as keyof typeof lazyConfig];
  }
});

/** The rollup a slashing proposer belongs to; each rollup version has its own. */
export function rollupForSlashingProposer(proposer: string): `0x${string}` {
  const address = proposer.toLowerCase();
  const previous = config.PREVIOUS_ROLLUPS.find((rollup) => rollup.slashingProposer === address);
  return (previous?.address ?? config.ROLLUP_CONTRACT_ADDRESS) as `0x${string}`;
}
