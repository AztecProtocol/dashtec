# Build context should be the monorepo root
# docker build -f packages/materializer/Dockerfile -t dashtec-materializer .

FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install dependencies (including dev dependencies for building)
FROM base AS deps
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json tsconfig.base.json ./

# Copy all package.json files for workspace resolution
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/shared-utils/package.json ./packages/shared-utils/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/indexer-ponder/package.json ./packages/indexer-ponder/package.json
COPY packages/materializer/package.json ./packages/materializer/package.json

# Install all dependencies (including dev, needed for build)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build workspace packages
FROM deps AS builder
WORKDIR /app

# Copy workspace package source code
COPY packages/logger ./packages/logger
COPY packages/shared-types ./packages/shared-types
COPY packages/shared-utils ./packages/shared-utils
COPY packages/database ./packages/database

# Copy indexer-ponder source (tsup bundles ponder.schema.ts via noExternal)
COPY packages/indexer-ponder ./packages/indexer-ponder

# Copy materializer source
COPY packages/materializer ./packages/materializer

# Build workspace packages in dependency order: logger -> database (needs logger;
# prisma generated first) -> shared-types (needs database) -> shared-utils.
RUN pnpm --filter @dashtec/logger build
RUN pnpm --filter @dashtec/database db:generate
RUN pnpm --filter @dashtec/database build
RUN pnpm --filter @dashtec/shared-types build
RUN pnpm --filter @dashtec/shared-utils build
RUN pnpm --filter @dashtec/materializer build

# Production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Install native build tools for pg module
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/shared-utils/package.json ./packages/shared-utils/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/indexer-ponder/package.json ./packages/indexer-ponder/package.json
COPY packages/materializer/package.json ./packages/materializer/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder
COPY --from=builder /app/packages/logger/dist ./packages/logger/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/src/generated ./packages/database/src/generated
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-utils/dist ./packages/shared-utils/dist
COPY --from=builder /app/packages/materializer/dist ./packages/materializer/dist

WORKDIR /app/packages/materializer

CMD ["node", "dist/index.js"]
