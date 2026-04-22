# @dashtec/database

Shared database package containing Prisma schema and client for the Dashtec monorepo.

## Usage

```typescript
// Import the Prisma client
import { prisma } from '@dashtec/database';

// Import types
import type { Validator, Epoch } from '@dashtec/database/types';

// Use the client
const validators = await prisma.validator.findMany();
```

## Scripts

- `pnpm db:generate` - Generate Prisma client
- `pnpm db:migrate` - Run database migrations
- `pnpm db:push` - Push schema to database (dev only)
- `pnpm db:studio` - Open Prisma Studio

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string

Optional:
- `DATABASE_READ_REPLICA_URL` - Read replica connection string
