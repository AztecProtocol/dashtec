FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

ENV npm_config_platform=linux
ENV npm_config_arch=arm64

# ---------------- deps ----------------
FROM base AS deps
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json tsconfig.base.json ./

# Copy all package.json files to preserve directory structure
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/shared-utils/package.json ./packages/shared-utils/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/indexer-ponder/package.json ./packages/indexer-ponder/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ---------------- build ----------------
FROM deps AS build
WORKDIR /app
COPY . .

# Build all compiled packages (tsup / prisma)
RUN pnpm -r --filter ./packages/logger build
RUN pnpm -r --filter ./packages/shared-types build
RUN pnpm -r --filter ./packages/shared-utils build
RUN pnpm -r --filter ./packages/database build
RUN pnpm -r --filter ./packages/database db:generate

# ---------------- runner ----------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PATH="/app/node_modules/.bin:$PATH"

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy built packages first
COPY --from=build /app/packages ./packages

# Copy package files for production install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json tsconfig.base.json ./

# Install all dependencies (ponder needs dev deps for runtime)
# This will preserve the built files but set up correct node_modules
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile

WORKDIR /app/packages/indexer-ponder
EXPOSE 42069
CMD ["pnpm", "start"]