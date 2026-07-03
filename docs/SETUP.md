# Setup Guide

## Prerequisites

- Node.js >= 20
- pnpm 9
- PostgreSQL 16
- Redis 7 (optional, for caching)
- An Ethereum RPC endpoint
- An Aztec node RPC endpoint

## 1. Install Dependencies

```bash
pnpm install
```

## 2. Start Databases

```bash
# Mainnet stack (PostgreSQL on 5432, Redis on 6379)
docker compose --profile mainnet up -d postgres-mainnet redis-mainnet

# Testnet stack (PostgreSQL on 5433, Redis on 6380)
docker compose --profile testnet up -d postgres-testnet redis-testnet
```

Default credentials: `dashtec:dashtec`, database: `dashtec`

## 3. Configure Environment

All environment variables are managed through a single config file per network. Instead of editing `.env` files manually, you fill in one JSON config and propagate it to all packages.

### Step 1: Create your config

```bash
cp .environment/mainnet/config.example.json .environment/mainnet/config.json
```

### Step 2: Propagate to all packages

```bash
pnpm env:propagate mainnet
```

This reads your `config.json` and generates `.env` files for each package:

| Package | Generated file |
|---------|---------------|
| `apps/web` | `.env` + `.env.build` |
| `packages/database` | `.env` |
| `packages/indexer-ponder` | `.env` |
| `packages/indexer-custom` | `.env` |
| `packages/materializer` | `.env` |

For testnet:

```bash
cp .environment/testnet/config.example.json .environment/testnet/config.json
pnpm env:propagate testnet
```

## 4. Configuration Reference

### `network`

| Property | Type | Example | Description |
|----------|------|---------|-------------|
| `type` | string | `"mainnet"` or `"sepolia"` | Network identifier. Determines chain-specific behavior across all packages. |
| `chainId` | number | `1` (mainnet), `11155111` (sepolia) | Ethereum chain ID used by the Ponder indexer for RPC calls. |

**Used by:** indexer-ponder, web app

### `database`

| Property | Type | Example | Description |
|----------|------|---------|-------------|
| `url` | string | `"postgresql://user:pass@host:5432/dashtec"` | Primary PostgreSQL connection URL. Used by all packages for reads and writes. |
| `replicaUrl` | string | `"postgresql://user:pass@replica:5432/dashtec"` | Read replica URL. Optional — falls back to `url` if not set. Used by the web app and indexer-custom for read-heavy queries. |

**Used by:** all packages

### `redis`

| Property | Type | Example | Description |
|----------|------|---------|-------------|
| `url` | string | `"redis://localhost:6379"` | Redis connection URL. Used for caching in the web app and indexer-custom. Optional — the app works without it but with higher database load. |

**Used by:** web app, indexer-custom, indexer-ponder

### `rpc`

| Property | Type | Example | Description |
|----------|------|---------|-------------|
| `ethereumUrls` | string | `"https://eth-mainnet.g.alchemy.com/v2/KEY"` | Comma-separated Ethereum RPC URLs. The Ponder indexer uses these to watch on-chain events. The indexer-custom uses them for contract reads. Multiple URLs provide failover. |

**Used by:** indexer-ponder, indexer-custom

### `sentinel`

URL configuration for the Aztec node RPC endpoint. This can point directly to an Aztec node or to a reverse proxy that load-balances across multiple nodes.

| Property | Type | Example | Description |
|----------|------|---------|-------------|
| `proxyUrl` | string | `"http://your-aztec-node:8080"` | Aztec node JSON-RPC endpoint (serves all `node_*` methods, e.g. `node_getValidatorsStats`). Used as-is by both the web app and indexer-custom. |

**Used by:** web app, indexer-custom

### `contracts`

Aztec protocol contract addresses on Ethereum. These are used by the Ponder indexer to watch events and by the web app for direct contract reads.

| Property | Type | Example | Description |
|----------|------|---------|-------------|
| `rollupAddress` | string | `"0x603b..."` | Aztec Rollup contract. The core contract that tracks epochs, validators, and block proposals. Used by all packages. |
| `governanceAddress` | string | `"0x1102..."` | Governance contract for on-chain proposals and voting. |
| `governanceProposerAddress` | string | `"0x06Ef..."` | Governance proposer contract — handles governance payload submission. |
| `slashingProposerAddress` | string | `"0x7a31..."` | Slashing proposer contract — handles slashing payload submission. |
| `slashFactoryAddress` | string | `"0x..."` | Slash factory contract. Can be empty (`"0x"`) if not deployed. |
| `gseAddress` | string | `"0xa92e..."` | GSE (Governance State Extension) contract — tracks governance state. |
| `stakingRegistryAddress` | string | `"0x042d..."` | Staking registry contract — stores validator staking info, provider registrations, and commission rates. |
| `registryAddress` | string | `"0x0000..."` | Registry contract. Set to zero address if not in use. |

**Used by:** indexer-ponder (all), web app (rollup, slashing, governance, staking registry), indexer-custom (rollup), materializer (rollup)

### `collectors`

Configuration for the custom indexer's collector services. Each collector runs on its own polling loop.

#### `collectors.validatorStats`

Collects per-epoch performance data (attestations, proposals) for each validator by querying the Aztec archiver node.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `pollIntervalMs` | number | `300000` | Polling interval (ms). How often to check for new epochs to process. |
| `maxPastEpochs` | number | `10` | Maximum number of past epochs to backfill when catching up. |
| `batchSize` | number | `10` | Number of validators to process per batch within an epoch. |

#### `collectors.validatorList`

Syncs the current validator set from the staking registry contract.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `pollIntervalMs` | number | `60000` | Polling interval (ms). |
| `batchSize` | number | `50` | Number of validators to fetch per RPC batch call. |

#### `collectors.epochIntegrity`

Verifies that indexed epoch data is complete and consistent by cross-referencing with the archiver node.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `pollIntervalMs` | number | `600000` | Polling interval (ms). |
| `batchSize` | number | `20` | Number of epochs to verify per cycle. |
| `epochsToCheck` | number | `100` | How many recent epochs to include in integrity checks. |

#### `collectors.validatorMigration`

Handles validator data migration between rollup versions. Only needed during rollup upgrades.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | `false` | Whether the migration collector runs. Set to `true` during rollup upgrades. |
| `pollIntervalMs` | number | `3600000` | Polling interval (ms). |
| `batchSize` | number | `50` | Number of validators to migrate per batch. |
| `sourceDbUrl` | string | `""` | PostgreSQL connection URL of the source database to migrate from. Required when `enabled` is `true`. |

#### `collectors.epochAggregates`

Recomputes epoch-level aggregate stats (total attestations, proposals) to repair any gaps from missed processing.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `pollIntervalMs` | number | `300000` | Polling interval (ms). |
| `batchSize` | number | `10` | Number of epochs to recompute per cycle. |
| `epochsToRepair` | number | `50` | How many recent epochs to scan for missing aggregates. |

#### `collectors.providerList` (optional)

Syncs provider metadata from an external staking app API.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `apiUrl` | string | `""` | External staking app API URL to fetch provider data from. |
| `pollIntervalMs` | number | `60000` | Polling interval (ms). |

**Used by:** indexer-custom

### `ponder`

Configuration for the Ponder blockchain event indexer.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `port` | number | `42069` | HTTP port for the Ponder dev server and health endpoint. |
| `databaseSchema` | string | `"ponder_dev"` | PostgreSQL schema name where Ponder stores its indexed data. Use `"ponder_prod"` in production. The materializer reads from this schema. |
| `maxHealthcheckDuration` | number | `240` | Maximum seconds for the Ponder health check to report healthy during initial sync. |
| `startBlock` | number | `20000000` | Ethereum block number to start indexing from. Set this to the deployment block of your earliest contract to avoid scanning unnecessary blocks. |
| `redis.url` | string | — | Redis URL for Ponder's internal caching. Optional. |

**Used by:** indexer-ponder, materializer (databaseSchema)

### `app`

Configuration for the Next.js web dashboard.

| Property | Type | Example | Description |
|----------|------|---------|-------------|
| `url` | string | `"https://dashtec.xyz"` | Public URL of the app. Used for OAuth callback URLs and absolute link generation. |
| `port` | number | `3000` | Port the Next.js server listens on. |
| `ethereumExplorerUrl` | string | `"https://etherscan.io"` | Base URL for Ethereum block explorer links (transactions, addresses). |
| `aztecScanUrl` | string | `"https://aztecscan.xyz"` | Base URL for Aztec block explorer links. Optional. |
| `rateLimitingEnabled` | boolean | `true` | Whether API rate limiting is active. Disable for development. |
| `domains.mainnet` | string | `"dashtec.xyz"` | Domain for mainnet deployment. Used for network switching in the UI. |
| `domains.sepolia` | string | `"testnet.dashtec.xyz"` | Domain for testnet deployment. |

#### `app.auth`

OAuth credentials for validator profile linking. Users can link their X (Twitter) and Discord accounts to their validator profiles.

| Property | Type | Description |
|----------|------|-------------|
| `discord.clientId` | string | Discord OAuth2 application client ID. Create at [discord.com/developers](https://discord.com/developers/applications). |
| `discord.clientSecret` | string | Discord OAuth2 application client secret. |
| `x.clientId` | string | X (Twitter) OAuth 2.0 client ID. Create at [developer.x.com](https://developer.x.com/en/portal/dashboard). |
| `x.clientSecret` | string | X OAuth 2.0 client secret. |
| `sessionPassword` | string | Secret key for session encryption. Minimum 32 characters. Generate with `openssl rand -hex 32`. |

**Used by:** web app

### `logging`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `level` | string | `"info"` | Log level: `"error"`, `"warn"`, `"info"`, or `"debug"`. |

**Used by:** all packages

### `nodeEnv`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `nodeEnv` | string | `"production"` | Node.js environment. `"development"`, `"production"`, or `"test"`. |

**Used by:** all packages

## 5. Database Setup

### Run Prisma migrations

```bash
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Run migrations (development)
```

For production:

```bash
pnpm db:deploy      # Run migrations without prompts
```

### Useful commands

```bash
pnpm db:studio      # Open Prisma Studio (visual DB browser)
pnpm db:reset       # Reset database (drops all data)
```

Schema files are split across `packages/database/prisma/models/*.prisma`.

## 6. Start Development

```bash
pnpm dev
```

Or start individual packages:

```bash
pnpm --filter @dashtec/web dev              # Dashboard (port 3000)
pnpm --filter @dashtec/indexer-ponder dev    # Ponder indexer (port 42069)
pnpm --filter @dashtec/indexer-custom dev    # Custom collectors
pnpm --filter @dashtec/materializer dev      # Materializer
```

## Docker Compose

### Infrastructure only

```bash
docker compose --profile mainnet up -d postgres-mainnet redis-mainnet
```

### Full stack (all services)

```bash
docker compose --profile mainnet up -d
```

### Ports

| Service | Mainnet | Testnet |
|---------|---------|---------|
| Web dashboard | 3000 | 3001 |
| Ponder indexer | 42069 | 42070 |
| Custom collectors | 4000-4004 | 4010-4014 |
| PostgreSQL | 5432 | 5433 |
| Redis | 6379 | 6380 |

## Data Flow

```
Blockchain --> Ponder Indexer --> Materializer --> PostgreSQL --> REST API --> Dashboard
                                       ^
                                       |
                              Custom Collectors
```

1. **Ponder Indexer** watches on-chain events (validators, governance, slashing) and writes to its own schema
2. **Materializer** syncs Ponder data into the main PostgreSQL tables
3. **Custom Collectors** gather additional data (validator stats, epoch integrity) via RPC
4. **Web API** serves the dashboard from PostgreSQL

## External PostgreSQL (production)

```sql
CREATE USER dashtec WITH PASSWORD 'your-password';
CREATE DATABASE dashtec OWNER dashtec;
\c dashtec
GRANT ALL ON SCHEMA public TO dashtec;
```

Update the `database.url` in your `config.json`, then re-run `pnpm env:propagate mainnet`.
