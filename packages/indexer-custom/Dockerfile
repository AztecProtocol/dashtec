# Build context should be the monorepo root
# docker build -f packages/indexer-custom/Dockerfile -t dashtec-indexer-custom .

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

# Copy all package.json files
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/shared-utils/package.json ./packages/shared-utils/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/aztec-rpc-sdk/package.json ./packages/aztec-rpc-sdk/package.json
COPY packages/indexer-custom/package.json ./packages/indexer-custom/package.json

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
COPY packages/aztec-rpc-sdk ./packages/aztec-rpc-sdk

# Copy indexer-custom source
COPY packages/indexer-custom ./packages/indexer-custom

# Build workspace packages in dependency order: logger -> database (needs logger;
# prisma generated first) -> shared-types (needs database) -> shared-utils.
RUN pnpm --filter @dashtec/logger build
# `prisma generate` only reads the schema — it never connects — but Prisma's
# config still requires DATABASE_URL to resolve, so the build fails without it.
# Supplied inline for this RUN only: it must not leak into the image, where the
# real URL comes from compose at runtime. Until now this was satisfied by a
# stale, gitignored packages/database/.env left over on the deploy host, so the
# build silently depended on an artifact no fresh checkout would have.
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" pnpm --filter @dashtec/database db:generate
RUN pnpm --filter @dashtec/database build
RUN pnpm --filter @dashtec/shared-types build
RUN pnpm --filter @dashtec/shared-utils build
RUN pnpm --filter @dashtec/aztec-rpc-sdk build
RUN pnpm --filter @dashtec/indexer-custom build

# Production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=8192"

# Install production dependencies only
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/shared-utils/package.json ./packages/shared-utils/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/aztec-rpc-sdk/package.json ./packages/aztec-rpc-sdk/package.json
COPY packages/indexer-custom/package.json ./packages/indexer-custom/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder
COPY --from=builder /app/packages/logger/dist ./packages/logger/dist
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-utils/dist ./packages/shared-utils/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/src/generated ./packages/database/src/generated
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/packages/aztec-rpc-sdk/dist ./packages/aztec-rpc-sdk/dist
COPY --from=builder /app/packages/indexer-custom/dist ./packages/indexer-custom/dist

WORKDIR /app/packages/indexer-custom

CMD ["node", "dist/index.js"]