import { getPrismaClient } from '@dashtec/database/singleton';
import { config } from '../config/config';

export const prisma = getPrismaClient({
  databaseUrl: config.DATABASE_URL,
  replicaUrl: config.DATABASE_READ_REPLICA_URL,
});

export default prisma;
