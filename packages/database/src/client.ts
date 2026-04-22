import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { readReplicas } from '@prisma/extension-read-replicas';

// Re-export all Prisma types
export * from './generated/prisma/client';

const createAdapter = (connectionString: string) => new PrismaPg({ connectionString })

/**
 * Create Prisma client instance with custom connection string
 */
export const createCustomPrismaClient = (connectionString: string): PrismaClient => {
  return new PrismaClient({
    adapter: createAdapter(connectionString),
  });
};

export interface CreatePrismaClientOptions {
  databaseUrl: string;
  replicaUrl?: string;
}

/**
 * Create Prisma client instance with Prisma 7 adapter pattern and optional read replica support
 *
 * Note: Apps should call this function and manage the singleton themselves.
 * This package does NOT create or export a default client instance.
 *
 * @example
 * ```ts
 * import { createPrismaClient } from '@dashtec/database';
 *
 * const globalForPrisma = globalThis as { prisma?: PrismaClient };
 * const prisma = globalForPrisma.prisma ?? createPrismaClient({
 *   databaseUrl: process.env.DATABASE_URL,
 *   replicaUrl: process.env.DATABASE_URL_REPLICA
 * });
 *
 * if (process.env.NODE_ENV !== 'production') {
 *   globalForPrisma.prisma = prisma;
 * }
 * ```
 */
export function createPrismaClient(options: CreatePrismaClientOptions): PrismaClient {
  const client = createCustomPrismaClient(options.databaseUrl);

  // Add read replica extension if configured
  if (options.replicaUrl) {
    const replicaClient = createCustomPrismaClient(options.replicaUrl);
    return client.$extends(readReplicas({ replicas: [replicaClient] })) as unknown as PrismaClient;
  }

  return client;
}
