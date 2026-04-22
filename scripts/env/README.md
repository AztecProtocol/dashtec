# Environment Configuration Scripts

Scripts to propagate environment configuration from `.environment/{network}/config.json` to respective package `.env` files.

## Setup

1. Copy the example config for your network:
```bash
cp .environment/mainnet/config.example.json .environment/mainnet/config.json
# or
cp .environment/testnet/config.example.json .environment/testnet/config.json
```

2. Fill in your actual values in `config.json`

3. Run propagation script

## Usage

### Propagate to all packages
```bash
pnpm env:propagate mainnet
# or
pnpm env:propagate testnet
```

### Propagate to specific package
```bash
pnpm env:propagate:ponder mainnet
pnpm env:propagate:custom testnet
pnpm env:propagate:app mainnet
```

## Architecture

- **`utils.js`** - Shared utilities for loading config and generating headers
- **`propagate-indexer-ponder.js`** - Generate `.env` for Ponder indexer (event-based)
- **`propagate-indexer-custom.js`** - Generate `.env` for custom collectors
- **`propagate-app.js`** - Generate `.env` for Next.js web app
- **`propagate-all.js`** - Run all propagation scripts

## Note

The `packages/database` package does NOT need its own `.env` file since it's an imported dependency, not a standalone service. It uses the DATABASE_URL from the packages that import it.
