# Dashtec Monorepo

Aztec blockchain monitoring platform — real-time indexing, materialization, and dashboard.

## Stack

- **Monorepo**: pnpm 9 + Turborepo
- **Frontend**: Next.js 16 (App Router, React 19, TanStack Query, Tailwind, Framer Motion)
- **Indexer**: Ponder (blockchain event indexing) + Custom collectors
- **Database**: PostgreSQL 16 + Prisma 7 (modular schema, read replicas)
- **Proxy**: Go sentinel-proxy (rate limiting, caching)
- **Runtime**: Node >= 20, ESM everywhere, TypeScript strict

## Commands

```bash
pnpm dev                              # Start all services
pnpm build                            # Build all packages
pnpm turbo typecheck                  # Typecheck everything
pnpm db:generate                      # Generate Prisma client
pnpm db:migrate                       # Run database migrations
pnpm db:studio                        # Open Prisma Studio
pnpm --filter @dashtec/<pkg> dev      # Dev a single package
```

## Package Map

```
packages/
  shared-types/      # ABIs, interfaces, type definitions (leaf — no internal deps)
  shared-utils/      # formatters, validators, RPC helpers, cache
  logger/            # Winston-based structured logging (leaf — no internal deps)
  database/          # Prisma schema, migrations, client singleton
  contract-calls/    # Typed contract call factories (imports shared-types, aztec-rpc-sdk)
  aztec-rpc-sdk/     # Aztec node RPC client (git subtree)
  indexer-ponder/    # Blockchain event handlers (imports shared-types, shared-utils, logger)
  indexer-custom/    # Custom collectors extending BaseCollector
  materializer/      # Sync Ponder data → PostgreSQL via BaseMaterializer
apps/
  web/               # Next.js dashboard + REST API
services/
  sentinel-proxy-go/ # Go reverse proxy
```

## Architecture Rules

### Data Flow (never skip layers)
```
Blockchain → Ponder Indexer → Materializer → PostgreSQL → REST API → Dashboard
```

### Import Rules
- `shared-types`: no internal deps (leaf)
- `shared-utils`: may import shared-types
- `logger`: no internal deps (leaf)
- `database`: may import shared-types, logger
- `contract-calls`: imports shared-types, aztec-rpc-sdk
- `indexer-ponder`: imports shared-types, shared-utils, logger
- `materializer`: imports database, shared-types, logger
- `indexer-custom`: imports database, shared-types, shared-utils, logger
- `apps/web`: imports all packages

### Config Pattern (all packages)
Zod schema validation + dotenv. Never access process.env directly.
```typescript
import { z } from 'zod';
const configSchema = z.object({ DATABASE_URL: z.string().url() });
export const config = configSchema.parse(process.env);
```

## Code Patterns

### Before Writing Code
Use the dashtec MCP server: call `dashtec_get_pattern` for the relevant type before implementing. Available patterns: `contract-call`, `api-endpoint`, `db-model`, `ponder-event`, `materializer`, `collector`, `frontend-page`, `types`.

### Database (Prisma)
- Schema split into `packages/database/prisma/models/*.prisma`
- Model names: **PascalCase** (e.g., `ValidatorDeposit`)
- Fields: **snake_case** (e.g., `block_number`, `transaction_hash`)
- Addresses: `@db.VarChar(42)`, tx hashes: `@db.Char(66)`, block numbers: `BigInt`
- Event dedup: `@@unique([transaction_hash, log_index])`
- Always add indexes on frequently queried fields
- Singleton client: `getPrismaClient()` from `database/src/singleton.ts`
- After changes: `pnpm db:generate && pnpm db:migrate`

### API Routes (Next.js)
- Location: `apps/web/src/app/api/{path}/route.ts`
- Always export `const dynamic = 'force-dynamic'`
- Use `createBenchmark()` for timing
- Response shape: `{ data, pagination, benchmark, status: 'ok' }`
- Error shape: `{ error: 'message', status: 'error' }` with HTTP 500
- Pagination: `page` + `limit` query params
- Error logging: `logError(error, 'ERROR_CODE', { source: 'file:route.ts:GET' })`
- Raw SQL queries: extract to `apps/web/src/db/queries/{model}.ts` (Prisma.Sql builders only)
- Prisma ORM logic: extract to `apps/web/src/services/{domain}/{feature}.ts`
- **Route files must stay thin** — orchestrate calls, don't implement logic. If a route exceeds ~100 lines, extract data-fetching functions into service modules

### Contract Calls
- ABI files: `shared-types/src/abis/{ContractName}ABI.ts` (PascalCase + ABI suffix)
- Call factories: `contract-calls/src/contracts/{name}/calls.ts`
- Factory function: `create{ContractName}(client, address)` returns method object
- Individual calls: `create{FunctionName}Call()` using `readContractWithCache()`

### Ponder Event Handlers
- Location: `indexer-ponder/src/events/{contract}/{event-name}.ts`
- Handler: `ponder.on('{ContractName}:{EventName}', async ({ event, context }) => { ... })`
- Always `normalizeAddress()` on address fields
- ID format: `${event.transaction.hash}-${event.log.logIndex}`
- Use `onConflictDoNothing()` for idempotency

### Materializers
- Extend `BaseMaterializer` from `materializer/src/materializers/base.ts`
- File: `{Name}Materializer.ts` (PascalCase)
- Implement 5 abstract methods: `fetchBatch`, `materializeBatch`, `extractCursor`, `deleteAfterBlock`, `countRemaining`
- Use upsert pattern in `materializeBatch` for idempotency
- Processing groups: A (direct copies) → B (enriched) → C (state computation)

### Collectors
- Extend `BaseCollector` from `indexer-custom/src/lib/BaseCollector.ts`
- File: `{Name}Collector.ts` (PascalCase)
- Unique `portOffset` from base 4000
- Health endpoints auto-provided: `/health`, `/metrics`
- Standalone entry: `BaseCollector.runAsStandalone({Name}Collector)`

### Frontend
When writing or modifying React/Next.js code, invoke the `/vercel-react-best-practices` skill for performance optimization guidelines (waterfall elimination, bundle size, server-side performance, client-side data fetching).

- Pages: `apps/web/src/app/{path}/page.tsx` with `'use client'` + `DashboardProvider`
- Feature components: `apps/web/src/components/features/{feature}/`
- Query hooks: `apps/web/src/hooks/queries/use{Feature}Data.ts`
- Hook pattern: `useQuery({ queryKey: ['{feature}'], queryFn, staleTime: 300_000 })`
- Types: `apps/web/src/types/api.ts`
- Styling: Tailwind CSS. Animations: Framer Motion. Icons: Heroicons (flat, no color)
- Charts: Chart.js / Recharts
- State: React Query for server state, Context API for app state, useState for UI state — no Redux/Zustand
- Contexts: 10 providers nested in root layout (wallet, theme, notifications, rollup, etc.)
- Loading: Suspense boundaries with dedicated skeleton components per page
- Memoization: `useMemo` for expensive computations and query param objects, `useCallback` for context handlers

## Naming Conventions

| What | Convention | Example |
|------|-----------|---------|
| Prisma model | PascalCase | `ValidatorDeposit` |
| Prisma field | snake_case | `block_number` |
| DB model file | kebab-case.prisma | `validators.prisma` |
| API route dir | kebab-case | `/api/validator-stats/` |
| Contract dir | kebab-case | `contracts/staking-registry/` |
| Factory function | create{Name} | `createRollup(client, addr)` |
| Call factory | create{Fn}Call | `createGetCommitteeCall()` |
| ABI file | PascalCase+ABI | `RollupABI.ts` |
| Materializer | {Name}Materializer | `BlockProposedMaterializer` |
| Collector | {Name}Collector | `ValidatorStatsCollector` |
| React component | PascalCase | `AttesterCard.tsx` |
| Hook | use{Feature}Data | `useProviders()` |
| Shared type | PascalCase | `ValidatorStatus` |
| Type unions | string union, not enum | `'pending' \| 'confirmed'` |

## Logging

Use `@dashtec/logger` (Winston-based):
```typescript
import { createLogger } from '@dashtec/logger';
const log = createLogger('my-context');
log.info('message', { meta });
log.error('message', { error: serializeError(err) });
```

## Testing

- Framework: Jest + SWC
- Tests in `__tests__/` directories
- Run: `pnpm test` or `pnpm --filter @dashtec/<pkg> test`

## Docker (local dev)

```bash
# Mainnet stack
docker compose --profile mainnet up -d

# Testnet stack
docker compose --profile testnet up -d
```

- Mainnet DB: `dashtec-postgres-mainnet` (port 5432)
- Testnet DB: `dashtec-postgres-testnet` (port 5433)
- Credentials: `dashtec:dashtec`, database: `dashtec`

## Do NOT

- Access `process.env` directly — always use Zod-validated config
- Write raw SQL in route handlers — use Prisma or extract to `db/queries/`
- Skip `normalizeAddress()` on blockchain addresses
- Use enums — use string unions instead
- Import across package boundaries that violate the import rules above
- Use colorful icons — only flat icons with elegant design
