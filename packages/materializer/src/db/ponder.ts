import { drizzle } from 'drizzle-orm/node-postgres';
import { setDatabaseSchema } from '@ponder/client';
import * as ponderSchema from '@dashtec/indexer-ponder/ponder.schema';
import { config } from '../config.js';

setDatabaseSchema(ponderSchema, config.PONDER_SCHEMA);

export const ponderDb = drizzle(config.DATABASE_URL, {
  schema: ponderSchema,
  casing: 'snake_case',
});
