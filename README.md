# Dashtec Monorepo

Monorepo for the Dashtec Aztec Dashboard project, containing the web app and multiple indexer services.

## Documentation

- [Deployment Guide](DEPLOYMENT.md) - Docker Compose, Multi-VM, and PM2 deployment.
- [Database Setup](DATABASE_SETUP.md) - PostgreSQL and Redis setup guide.

## License

Private - Dashtec Project

## Project Structure

```
dashtec-monorepo/
├── apps/
│   └── web/                    # Next.js web application (to be migrated from dashtec-app)
│
├── packages/
│   ├── database/              # Shared Prisma database package
│   ├── shared-types/          # Shared TypeScript types
│   ├── shared-utils/          # Shared utility functions
│   ├── indexer-ponder/        # Ponder-based event indexer
│   └── indexer-custom/        # Custom logic indexers
│
├── package.json               # Root workspace config
├── pnpm-workspace.yaml        # pnpm workspace definition
├── turbo.json                 # Turbo build configuration
└── tsconfig.base.json         # Base TypeScript config
```

## Tech Stack

- **Package Manager**: pnpm (v9.0.0+)
- **Build System**: Turbo
- **Runtime**: Node.js (v20.0.0+)
- **Database**: PostgreSQL + Prisma
- **Web Framework**: Next.js 15
- **Indexers**: Ponder (v0.15.11) + Custom TypeScript collectors
- **Blockchain**: Viem (v2.31.6)

## Getting Started

### Prerequisites

```bash
# Install pnpm globally
npm install -g pnpm@9.0.0

# Ensure Node.js 20+
node --version
```