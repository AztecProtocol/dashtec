# Dashtec

Real-time monitoring and analytics platform for the [Aztec](https://aztec.network) blockchain. Indexes on-chain events, materializes data, and serves a dashboard for validators, providers, governance, and network health.

## Architecture

```
Blockchain --> Ponder Indexer --> Materializer --> PostgreSQL --> REST API --> Dashboard
                                       ^
                                       |
                              Custom Collectors
```

## Project Structure

```
apps/
  web/                  # Next.js dashboard + REST API

packages/
  database/             # Prisma schema, migrations, client
  shared-types/         # ABIs, interfaces, type definitions
  shared-utils/         # Formatters, validators, RPC helpers
  logger/               # Structured logging (Winston)
  contract-calls/       # Typed contract call factories
  aztec-rpc-sdk/        # Aztec node RPC client
  indexer-ponder/       # Blockchain event handlers
  indexer-custom/       # Custom collectors (validator stats, epoch integrity)
  materializer/         # Syncs Ponder data into PostgreSQL
```

## Tech Stack

- **Monorepo**: pnpm 9 + Turborepo
- **Frontend**: Next.js 16 (App Router, React 19, TanStack Query, Tailwind, Framer Motion)
- **Indexer**: Ponder (blockchain event indexing) + Custom collectors
- **Database**: PostgreSQL 16 + Prisma 7
- **Runtime**: Node.js >= 20, TypeScript strict, ESM everywhere

## Quick Start

```bash
# Install dependencies
pnpm install

# Start databases
docker compose --profile mainnet up -d postgres-mainnet redis-mainnet

# Configure environment
cp .environment/mainnet/config.example.json .environment/mainnet/config.json
# Edit config.json with your RPC endpoints, contract addresses, etc.

# Propagate config to all packages
pnpm env:propagate mainnet

# Generate Prisma client and run migrations
pnpm db:generate
pnpm db:migrate

# Start all services
pnpm dev
```

See [docs/SETUP.md](docs/SETUP.md) for the full setup guide.

## Commands

```bash
pnpm dev                              # Start all services
pnpm build                            # Build all packages
pnpm turbo typecheck                  # Typecheck everything
pnpm db:generate                      # Generate Prisma client
pnpm db:migrate                       # Run database migrations
pnpm db:studio                        # Open Prisma Studio
pnpm env:propagate <mainnet|testnet>  # Propagate env config to all packages
pnpm --filter @dashtec/<pkg> dev      # Dev a single package
```

## License

MIT
