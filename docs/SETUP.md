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

Edit `.environment/mainnet/config.json` with your values:

```jsonc
{
  "network": {
    "type": "mainnet",
    "chainId": 1
  },
  "database": {
    "url": "postgresql://dashtec:dashtec@localhost:5432/dashtec",
    "replicaUrl": "postgresql://dashtec:dashtec@localhost:5432/dashtec"
  },
  "redis": {
    "url": "redis://localhost:6379"
  },
  "rpc": {
    "ethereumUrls": "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"
  },
  "sentinel": {
    "proxyUrl": "http://localhost:8080",
    // ...
  },
  "contracts": {
    "rollupAddress": "0x...",
    "governanceAddress": "0x...",
    "governanceProposerAddress": "0x...",
    "slashingProposerAddress": "0x...",
    "gseAddress": "0x...",
    "stakingRegistryAddress": "0x...",
    "registryAddress": "0x..."
  },
  "collectors": {
    // polling intervals and batch sizes for each collector
  },
  "app": {
    "url": "http://localhost:3000",
    "auth": {
      "discord": { "clientId": "", "clientSecret": "" },
      "x": { "clientId": "", "clientSecret": "" },
      "sessionPassword": "min-32-chars-generate-with-openssl-rand-hex-32"
    }
  }
}
```

See `.environment/mainnet/config.example.json` for the full schema.

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

You can also propagate for testnet:

```bash
pnpm env:propagate testnet
```

## 4. Database Setup

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

## 5. Start Development

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
