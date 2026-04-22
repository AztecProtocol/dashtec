# @dashtec/indexer-ponder

Ponder-based real-time indexer for Aztec contracts (v0.15.11).

## Purpose

This indexer handles real-time, event-driven data collection from smart contracts. It's ideal for:
- Simple event listening
- Real-time data ingestion
- Contract event processing
- Automatically writing to the database

## Setup

1. Add your contract ABIs to the `abis/` directory
2. Configure contracts in `ponder.config.ts`
3. Define schema in `ponder.schema.ts` (or use existing Prisma tables)
4. Add event handlers in `src/index.ts`
5. Run `pnpm codegen` to generate types
6. Run `pnpm dev` to start indexing

## Scripts

- `pnpm codegen` - Generate types from ABIs and config
- `pnpm dev` - Start development server with hot reload
- `pnpm start` - Start production server
- `pnpm build` - Build for production

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `RPC_URL` - Blockchain RPC endpoint
- `ROLLUP_CONTRACT_ADDRESS` - Main rollup contract address

## Database Strategy

You have two options:

### Option 1: Use Ponder Schema (Recommended for new tables)
Define tables in `ponder.schema.ts` and let Ponder manage them.

### Option 2: Use Existing Prisma Database
Import the Prisma client from `@dashtec/database` and write directly to existing tables:

```typescript
import { prisma } from '@dashtec/database';

ponder.on('ValidatorQueue:Queued', async ({ event }) => {
  await prisma.validatorQueue.create({
    data: {
      attester_address: event.args.attesterAddress,
      // ... other fields
    }
  });
});
```

## Generated Files

After running `pnpm codegen`, Ponder will generate:
- `ponder-env.d.ts` - TypeScript definitions (auto-generated, don't edit)
- `generated/` - Generated ABIs and types

These files are gitignored and regenerated on each codegen run.

## Next Steps

1. Copy ABIs from aztec-services to `abis/` folder
2. Configure which events to index in `ponder.config.ts`
3. Run `pnpm codegen`
4. Implement event handlers in `src/index.ts`
5. Migrate simple collectors from aztec-services

## What to Migrate Here

Migrate these collectors from aztec-services:
- ValidatorQueue event collection
- ProposerVote event collection
- SlashFactory event collection
- Provider registry events
- Any simple event-based collection

## What NOT to Migrate

Keep in custom indexer:
- Complex multi-step collectors
- Collectors with business logic
- Collectors needing external APIs
- Aggregation/calculation collectors
