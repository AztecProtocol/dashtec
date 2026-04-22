import { Prisma } from '@dashtec/database';
import { rollupWhereClause } from '@/lib/rollupParam';

export type {
  PerformanceHistoryRow,
  StatusCountRow,
  PerformanceHistoryOptions
} from '@/types/queries/validatorPerformanceHistory';

import type { PerformanceHistoryOptions } from '@/types/queries/validatorPerformanceHistory';

export function createPerformanceHistoryQuery(
  validatorAddresses: string[],
  options: PerformanceHistoryOptions = {}
): Prisma.Sql {
  const { limit = 10, rollupAddresses } = options;
  const rollupFilter = rollupAddresses?.length
    ? Prisma.sql`AND ${rollupWhereClause(rollupAddresses)}`
    : Prisma.empty;

  return Prisma.sql`
    SELECT
      vep.validator_address,
      vep.epoch_number::text,
      vep.attestations_successful,
      vep.attestations_missed,
      vep.checkpoints_proposed,
      vep.checkpoints_mined,
      vep.checkpoints_missed,
      vep.blocks_missed
    FROM
      unnest(${validatorAddresses}::varchar[]) AS v(addr)
    JOIN LATERAL (
      SELECT *
      FROM "ValidatorEpochPerformance"
      WHERE validator_address = v.addr
      ${rollupFilter}
      ORDER BY epoch_number DESC
      LIMIT ${limit}
    ) AS vep ON true
    ORDER BY
      vep.validator_address, vep.epoch_number DESC
  `;
}

export function createStatusCountsQuery(
  validatorAddresses: string[]
): Prisma.Sql {
  return Prisma.sql`
    SELECT
      v.status,
      COUNT(*)::text as count
    FROM
      unnest(${validatorAddresses}::varchar[]) AS va(addr)
    JOIN LATERAL (
      SELECT status
      FROM "Validator"
      WHERE LOWER(address) = LOWER(va.addr)
    ) AS v ON true
    GROUP BY v.status
    ORDER BY COUNT(*) DESC
  `;
}
