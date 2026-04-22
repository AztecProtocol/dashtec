# @dashtec/indexer-custom

Custom indexer package for complex data collection logic.

## Purpose

This package contains collectors that require:
- Complex multi-step logic
- Business logic and calculations
- External API calls
- Data aggregations
- Custom validation and integrity checks

## Structure

```
src/
├── collectors/          # Individual collector services
├── clients/            # RPC and API clients
├── services/           # Shared business logic
├── utils/              # Helper functions
└── config/             # Configuration
```

## What to Migrate Here

From `aztec-services`, migrate these collectors:
- ✅ ValidatorStatsCollector (aggregations and attestation tracking)
- ✅ ValidatorListCollector (contract-based validator enumeration)
- ✅ ValidatorMigrationCollector (data migration)
- ✅ RollupStateCollector (if it has complex logic beyond events)
- ✅ Any collector with custom business logic or aggregations

## What NOT to Migrate (Goes to Ponder)

Simple event listeners should go to `@dashtec/indexer-ponder`:
- ❌ ValidatorQueue events
- ❌ ProposerVote events
- ❌ SlashFactory events
- ❌ Provider registry events
- ❌ Tally events (VoteCast, RoundExecuted, etc.) - all event-based
- ❌ GovernanceProposer events
- ❌ SlashingProposer events

## Next Steps

1. Copy relevant collectors from `aztec-services/src/collectors/`
2. Update imports to use workspace packages:
   - `@dashtec/database` for Prisma client
   - `@dashtec/shared-types` for types
   - `@dashtec/shared-utils` for utilities
3. Test each collector independently
4. Set up PM2 or similar for running multiple collectors

## Running Collectors

Each collector can be run independently:

```bash
# Development mode (with hot reload)
pnpm dev:validator-stats
pnpm dev:validator-list

# Production mode (requires build first)
pnpm build
pnpm start:validator-stats
pnpm start:validator-list
```

### Available Collectors

#### ValidatorStatsCollector
Polls validator statistics from RPC and updates database with attestation data.

**Environment Variables:**
- `VALIDATOR_STATS_RPC_URL` - RPC endpoint for validator stats
- `VALIDATOR_STATS_POLL_INTERVAL_MS` - Polling interval (default: 300000ms / 5min)
- `VALIDATOR_STATS_MAX_PAST_EPOCHS` - Max past epochs to process (default: 10)
- `VALIDATOR_STATS_BATCH_SIZE` - Batch size for processing (default: 10)

**Health Check:**
- Health endpoint: `http://localhost:4000/health`
- Metrics endpoint: `http://localhost:4000/metrics`
- Ready check: `http://localhost:4000/ready`

#### ValidatorListCollector
Fetches complete list of validators from Rollup contract and syncs to database.

**Environment Variables:**
- `ROLLUP_CONTRACT_ADDRESS` - Rollup contract address (required)
- `RPC_URL` - Ethereum RPC endpoint
- `VALIDATOR_LIST_POLL_INTERVAL_MS` - Polling interval (default: 60000ms / 1min)
- `VALIDATOR_LIST_BATCH_SIZE` - Batch size for processing (default: 50)

**Health Check:**
- Health endpoint: `http://localhost:4001/health`
- Metrics endpoint: `http://localhost:4001/metrics`
- Ready check: `http://localhost:4001/ready`

## Dependencies

- Uses `@dashtec/database` for database access
- Uses `@dashtec/shared-types` for TypeScript types
- Uses `@dashtec/shared-utils` for helper functions
- Uses `viem` for blockchain interactions
