import { config } from '../config';
import { getPrismaClient } from '@dashtec/database/singleton';

export const prisma = getPrismaClient({
  databaseUrl: config.DATABASE_URL,
});

export default prisma;
