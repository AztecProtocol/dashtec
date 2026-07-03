FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install dependencies for all workspace packages
FROM base AS deps
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json tsconfig.base.json ./

# Copy all package.json files for dependency resolution
COPY packages/contract-calls/package.json ./packages/contract-calls/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/shared-utils/package.json ./packages/shared-utils/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/logger/package.json ./packages/logger/package.json
COPY apps/web/package.json ./apps/web/package.json

# Install all dependencies (including dev, needed for build)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build workspace packages
FROM deps AS builder
WORKDIR /app

# Copy workspace package source code
COPY packages/contract-calls ./packages/contract-calls
COPY packages/shared-types ./packages/shared-types
COPY packages/shared-utils ./packages/shared-utils
COPY packages/database ./packages/database
COPY packages/logger ./packages/logger

# Copy web app source
COPY apps/web ./apps/web

# Load build-time env vars (NEXT_PUBLIC_* are inlined during next build)
RUN if [ -f ./apps/web/.env.build ]; then cp ./apps/web/.env.build ./apps/web/.env.production; fi

# Build workspace packages first. Prisma must be generated and @dashtec/database
# built BEFORE @dashtec/shared-types, which imports @dashtec/database/types.
RUN pnpm --filter @dashtec/database db:generate
RUN pnpm --filter @dashtec/database build
RUN pnpm --filter @dashtec/logger build
RUN pnpm --filter @dashtec/shared-types build
RUN pnpm --filter @dashtec/shared-utils build
RUN pnpm --filter @dashtec/contract-calls build

# Build web app with standalone output
RUN pnpm --filter @dashtec/web build

# Production runner - uses Next.js standalone output
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output (Next.js bundles everything needed)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

WORKDIR /app/apps/web

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]