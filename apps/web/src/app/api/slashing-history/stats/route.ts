import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@dashtec/database';
import { logError } from '@/services/error/errorLogger';
import { createBenchmark } from '@/services/benchmark';
import { parseRollupParam } from '@/lib/rollupParam';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const benchmark = createBenchmark();

  try {
    const { searchParams } = new URL(request.url);
    const rollupAddresses = await parseRollupParam(searchParams);

    // Get all aggregated stats in parallel using Tally schema
    const [
      totalExecuted,
      totalSlashAmountResult,
      roundTrends,
      monthlySlashAmounts
    ] = await Promise.all([
      // Total executed rounds
      prisma.tallyRoundExecuted.count({
        where: { rollup_address: { in: rollupAddresses } },
      }),

      // Total slashed amount from executed rounds
      prisma.$queryRaw<Array<{
        totalAmount: bigint | null;
        executedAmount: bigint | null;
      }>>`
        SELECT
          SUM(tsa.slash_amount) AS "totalAmount",
          SUM(tsa.slash_amount) AS "executedAmount"
        FROM "TallySlashAction" tsa
        INNER JOIN "TallyRoundExecuted" tre ON tsa.round_number = tre.round_number
        WHERE tre.rollup_address IN (${Prisma.join(rollupAddresses)})
      `,

      // Get monthly trends for executed rounds
      prisma.$queryRaw<Array<{month: string; executed: number}>>`
        WITH months AS (
          SELECT generate_series(
            date_trunc('month', NOW() - INTERVAL '11 months'),
            date_trunc('month', NOW()),
            '1 month'::interval
          ) AS month
        ),
        executed AS (
          SELECT
            date_trunc('month', executed_date) AS month,
            COUNT(*) AS count
          FROM "TallyRoundExecuted"
          WHERE executed_date >= NOW() - INTERVAL '12 months'
            AND rollup_address IN (${Prisma.join(rollupAddresses)})
          GROUP BY date_trunc('month', executed_date)
        )
        SELECT
          TO_CHAR(months.month, 'Mon YYYY') AS month,
          COALESCE(executed.count, 0)::int AS executed
        FROM months
        LEFT JOIN executed ON months.month = executed.month
        ORDER BY months.month
      `,

      // Get monthly slash amounts for executed rounds
      prisma.$queryRaw<Array<{month: string; executedAmount: bigint | null}>>`
        WITH months AS (
          SELECT generate_series(
            date_trunc('month', NOW() - INTERVAL '11 months'),
            date_trunc('month', NOW()),
            '1 month'::interval
          ) AS month
        ),
        monthly_amounts AS (
          SELECT
            date_trunc('month', tre.executed_date) AS month,
            SUM(tsa.slash_amount) AS executed_amount
          FROM "TallySlashAction" tsa
          INNER JOIN "TallyRoundExecuted" tre ON tsa.round_number = tre.round_number
          WHERE tre.executed_date >= NOW() - INTERVAL '12 months'
            AND tre.rollup_address IN (${Prisma.join(rollupAddresses)})
          GROUP BY date_trunc('month', tre.executed_date)
        )
        SELECT
          TO_CHAR(months.month, 'Mon YYYY') AS month,
          COALESCE(monthly_amounts.executed_amount, 0) AS "executedAmount"
        FROM months
        LEFT JOIN monthly_amounts ON months.month = monthly_amounts.month
        ORDER BY months.month
      `
    ]);

    // Calculate total unique validators slashed (only from executed rounds)
    const totalUniqueSlashed = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT tsa.validator_address) as count
      FROM "TallySlashAction" tsa
      INNER JOIN "TallyRoundExecuted" tre ON tsa.round_number = tre.round_number
      WHERE tre.rollup_address IN (${Prisma.join(rollupAddresses)})
    `.then(results => Number(results[0]?.count || 0));

    // Calculate total slash events (count distinct validator+round combinations)
    const totalSlashEvents = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT (tsa.validator_address, tsa.round_number)) as count
      FROM "TallySlashAction" tsa
      INNER JOIN "TallyRoundExecuted" tre ON tsa.round_number = tre.round_number
      WHERE tre.rollup_address IN (${Prisma.join(rollupAddresses)})
    `.then(results => Number(results[0]?.count || 0));

    const { total } = benchmark.getResults();

    return NextResponse.json({
      totalRounds: totalExecuted,
      totalExecuted,
      totalSlashedStaked: totalSlashAmountResult[0]?.totalAmount ? Number(totalSlashAmountResult[0].totalAmount) : 0,
      executedSlashedStaked: totalSlashAmountResult[0]?.executedAmount ? Number(totalSlashAmountResult[0].executedAmount) : 0,
      totalUniqueSlashed,
      totalSlashEvents,
      roundTrends,
      monthlySlashAmounts: monthlySlashAmounts.map(item => ({
        month: item.month,
        executedAmount: item.executedAmount ? Number(item.executedAmount) : 0
      })),
      benchmark: total,
      status: 'ok'
    });
  } catch (error) {
    logError(error as Error, 'GET /api/slashing-history/stats');
    return NextResponse.json(
      { error: 'Failed to fetch slashing history stats' },
      { status: 500 }
    );
  }
}