import { Prisma } from '@dashtec/database';
import { getPrismaClient } from '@dashtec/database/singleton';
import { getEnv } from '@/config';

const config = getEnv();

export const prisma = getPrismaClient({
  databaseUrl: config.DATABASE_URL,
  replicaUrl: config.DATABASE_URL_REPLICA
});

export { Prisma };
export default prisma;

/**
 * Combines a parameterized SQL query with its values.
 * * WARNING: FOR DEBUGGING AND LOGGING ONLY.
 */
export function combineSql(query: string, values: any[]) {
  let sql = query;

  values.forEach((value, index) => {
    let formattedValue;

    if (value === null || typeof value === 'undefined') {
      formattedValue = "NULL";
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      formattedValue = value.toString();
    } else if (typeof value === 'string') {
      const escapedValue = value.replace(/'/g, "''");
      formattedValue = `'${escapedValue}'`;
    } else if (value instanceof Date) {
      formattedValue = `'${value.toISOString()}'`;
    } else if (Array.isArray(value)) {
      const formattedArray = value.map(v => {
        if (v === null) return 'NULL';
        if (typeof v === 'number') return v;
        return `'${String(v).replace(/'/g, "''")}'`;
      }).join(',');
      formattedValue = `ARRAY[${formattedArray}]`;
    } else {
      try {
        const jsonString = JSON.stringify(value);
        formattedValue = `'${jsonString.replace(/'/g, "''")}'`;
      } catch (e) {
        formattedValue = `'${String(value).replace(/'/g, "''")}'`;
      }
    }

    const placeholder = new RegExp(`\\$${index + 1}\\b`, 'g');
    sql = sql.replace(placeholder, formattedValue);
  });

  return sql;
}

export function debugSql(sql: Prisma.Sql): void {
  console.log("============== DEBUG SQL ================")
  console.log(combineSql(sql.text, sql.values))
  console.log("============== END DEBUG SQL ================")
}