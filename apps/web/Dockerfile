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

# Which network's build-time env to bake (NEXT_PUBLIC_* differ per network).
ARG NETWORK=mainnet

# Copy workspace package source code
COPY packages/contract-calls ./packages/contract-calls
COPY packages/shared-types ./packages/shared-types
COPY packages/shared-utils ./packages/shared-utils
COPY packages/database ./packages/database
COPY packages/logger ./packages/logger

# Copy web app source
COPY apps/web ./apps/web

# Load build-time env vars (NEXT_PUBLIC_* are inlined during next build)
RUN if [ -f "./apps/web/.env.build.${NETWORK}" ]; then cp "./apps/web/.env.build.${NETWORK}" ./apps/web/.env.production; fi

# Build workspace packages in dependency order:
# logger -> database (needs logger; prisma generated first) -> shared-types
# (needs database) -> shared-utils -> contract-calls.
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
RUN pnpm --filter @dashtec/contract-calls build

# Build web app with standalone output.
#
# `next build` collects page data, which evaluates getEnv() and therefore needs
# every required variable to resolve. The non-secret ones come from
# .env.build.<network> (copied to .env.production above). The three below are
# secrets, so they are passed inline as throwaway placeholders rather than
# written to a file: Next's standalone output traces .env* into the image, and a
# stale apps/web/.env doing exactly that is how months-old secrets and a
# superseded rollup address ended up baked into shipped images.
#
# These values are never used at runtime — compose supplies the real ones.
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
    SESSION_PASSWORD="build-time-placeholder-not-used-at-runtime" \
    ETHEREUM_RPC_URL="http://placeholder.invalid" \
    pnpm --filter @dashtec/web build

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