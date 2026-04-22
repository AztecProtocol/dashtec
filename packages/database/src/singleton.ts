import { createPrismaClient, CreatePrismaClientOptions, PrismaClient } from './client';
import { createLogger } from '@dashtec/logger';

const logger = createLogger('Prisma');

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function getPrismaClient(options: CreatePrismaClientOptions): PrismaClient {
  if (!globalForPrisma.prisma) {
    logger.info('Creating Prisma client...');
    logger.info(`Database: ${options.databaseUrl.replace(/:[^:@]+@/, ':***@')}`);

    globalForPrisma.prisma = createPrismaClient(options);
  }

  return globalForPrisma.prisma;
}
