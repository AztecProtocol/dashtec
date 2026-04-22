import prisma, { debugSql, Prisma } from '@/lib/prisma';
import { rollupWhereClause } from '@/lib/rollupParam';

/** Get basic prover statistics */
export async function getProverBasicStats(proverAddress: string, rollupAddresses: string[]) {
  const query = Prisma.sql`
    SELECT
      prover_id,
      COUNT(*) as total_proofs,
      MIN(epoch_number::int) as first_epoch,
      MAX(epoch_number::int) as last_epoch,
      MAX(timestamp) as last_proof_timestamp
    FROM "L2ProofVerified"
    WHERE prover_id = ${proverAddress}
      AND ${rollupWhereClause(rollupAddresses)}
    GROUP BY prover_id;
  `;

  const results = await prisma.$queryRaw<Array<{
    prover_id: string;
    total_proofs: bigint;
    first_epoch: number;
    last_epoch: number;
    last_proof_timestamp: bigint;
  }>>(query);

  return results[0] || null;
}

/** Calculate proof submission streaks */
export async function getProverStreaks(proverAddress: string, lastEpoch: number, rollupAddresses: string[]) {
  const query = Prisma.sql`
    WITH epochs AS (
      SELECT DISTINCT epoch_number::int as epoch
      FROM "L2ProofVerified"
      WHERE prover_id = ${proverAddress}
        AND ${rollupWhereClause(rollupAddresses)}
      ORDER BY epoch
    ),
    gaps AS (
      SELECT
        epoch,
        LAG(epoch) OVER (ORDER BY epoch) as prev_epoch,
        epoch - LAG(epoch) OVER (ORDER BY epoch) as gap
      FROM epochs
    ),
    streak_groups AS (
      SELECT
        epoch,
        gap,
        SUM(CASE WHEN gap IS NULL OR gap = 1 THEN 0 ELSE 1 END)
          OVER (ORDER BY epoch) as streak_group
      FROM gaps
    ),
    streaks AS (
      SELECT
        streak_group,
        COUNT(*) as streak_length,
        MIN(epoch) as streak_start,
        MAX(epoch) as streak_end
      FROM streak_groups
      GROUP BY streak_group
    )
    SELECT
      MAX(streak_length) as longest_streak,
      (SELECT streak_length
       FROM streaks
       WHERE streak_end = ${lastEpoch}
       LIMIT 1) as current_streak
    FROM streaks;
  `;

  const results = await prisma.$queryRaw<Array<{
    longest_streak: number | null;
    current_streak: number | null;
  }>>(query);

  return results[0] || { longest_streak: 0, current_streak: 0 };
}

/** Get proof submission history */
export async function getProverHistory(proverAddress: string, rollupAddresses: string[]) {
  const query = Prisma.sql`
    WITH epoch_sequence AS (
      SELECT
        epoch_number::int as epoch,
        l2_block_number,
        timestamp,
        transaction_hash,
        transaction_gas,
        transaction_gas_price,
        transaction_max_fee_per_gas,
        transaction_value,
        LAG(epoch_number::int) OVER (ORDER BY epoch_number::int) as prev_epoch,
        ROW_NUMBER() OVER (ORDER BY epoch_number::int DESC) as rn,
        ROW_NUMBER() OVER (ORDER BY epoch_number::int) as proof_number
      FROM "L2ProofVerified"
      WHERE prover_id = ${proverAddress}
        AND ${rollupWhereClause(rollupAddresses)}
    ),
    total_count AS (
      SELECT COUNT(*) as total FROM epoch_sequence
    ),
    accumulated_stats AS (
      SELECT
        epoch,
        l2_block_number,
        timestamp,
        transaction_hash,
        transaction_gas,
        transaction_gas_price,
        transaction_max_fee_per_gas,
        transaction_value,
        prev_epoch,
        COALESCE(epoch - prev_epoch, 0) as gap_from_previous,
        proof_number as accumulated_proving_epochs,
        SUM(CASE WHEN epoch - prev_epoch > 1 THEN epoch - prev_epoch - 1 ELSE 0 END)
          OVER (ORDER BY epoch ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as accumulated_missed_epochs,
        rn,
        (SELECT total FROM total_count) as total_count
      FROM epoch_sequence
    )
    SELECT
      epoch,
      l2_block_number,
      timestamp,
      transaction_hash,
      transaction_gas,
      transaction_gas_price,
      transaction_max_fee_per_gas,
      transaction_value,
      gap_from_previous,
      accumulated_proving_epochs,
      accumulated_missed_epochs,
      total_count
    FROM accumulated_stats
    ORDER BY epoch DESC
    ;
  `;

  const results = await prisma.$queryRaw<Array<{
    epoch: number;
    l2_block_number: bigint;
    timestamp: bigint;
    transaction_hash: string;
    transaction_gas: bigint;
    transaction_gas_price: bigint | null;
    transaction_max_fee_per_gas: bigint | null;
    transaction_value: bigint;
    gap_from_previous: number;
    accumulated_proving_epochs: number;
    accumulated_missed_epochs: number;
    total_count: bigint;
  }>>(query);

  return results;
}

/** Get financial metrics (gas costs) */
export async function getProverFinancialMetrics(proverAddress: string, rollupAddresses: string[]) {
  const query = Prisma.sql`
    SELECT
      prover_id,
      COUNT(*) as total_proofs,
      SUM(transaction_gas) as total_gas_used,
      AVG(transaction_gas) as avg_gas_per_proof,
      SUM(
        CASE
          WHEN transaction_max_fee_per_gas IS NOT NULL
          THEN transaction_gas * transaction_max_fee_per_gas
          ELSE transaction_gas * COALESCE(transaction_gas_price, 0)
        END
      ) as total_gas_cost_wei,
      AVG(
        CASE
          WHEN transaction_max_fee_per_gas IS NOT NULL
          THEN transaction_gas * transaction_max_fee_per_gas
          ELSE transaction_gas * COALESCE(transaction_gas_price, 0)
        END
      ) as avg_gas_cost_per_proof_wei
    FROM "L2ProofVerified"
    WHERE prover_id = ${proverAddress}
      AND ${rollupWhereClause(rollupAddresses)}
    GROUP BY prover_id;
  `;

  const results = await prisma.$queryRaw<Array<{
    prover_id: string;
    total_proofs: bigint;
    total_gas_used: bigint;
    avg_gas_per_proof: number;
    total_gas_cost_wei: bigint;
    avg_gas_cost_per_proof_wei: number;
  }>>(query);

  return results[0] || null;
}

/** Get list of epochs with proofs */
export async function getProverEpochs(
  proverAddress: string,
  rollupAddresses: string[],
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  const query = sortOrder === 'desc'
    ? Prisma.sql`
        SELECT epoch_number::int as epoch
        FROM "L2ProofVerified"
        WHERE prover_id = ${proverAddress}
          AND ${rollupWhereClause(rollupAddresses)}
        GROUP BY epoch_number::int
        ORDER BY epoch_number::int DESC;
      `
    : Prisma.sql`
        SELECT epoch_number::int as epoch
        FROM "L2ProofVerified"
        WHERE prover_id = ${proverAddress}
          AND ${rollupWhereClause(rollupAddresses)}
        GROUP BY epoch_number::int
        ORDER BY epoch_number::int ASC;
      `;

  const results = await prisma.$queryRaw<Array<{ epoch: number }>>(query);

  return results;
}

/** Get historical average gas cost (last 7 days) */
export async function getProverAverageGasCost(proverAddress: string, rollupAddresses: string[]) {
  const sevenDaysAgo = BigInt(Math.floor(Date.now() / 1000) - 7 * 24 * 3600);

  const query = Prisma.sql`
    SELECT
      AVG(
        CASE
          WHEN transaction_max_fee_per_gas IS NOT NULL
          THEN transaction_gas * transaction_max_fee_per_gas
          ELSE transaction_gas * COALESCE(transaction_gas_price, 0)
        END
      ) as avg_gas_cost_wei
    FROM "L2ProofVerified"
    WHERE prover_id = ${proverAddress}
      AND ${rollupWhereClause(rollupAddresses)}
      AND timestamp >= ${sevenDaysAgo};
  `;

  const results = await prisma.$queryRaw<Array<{
    avg_gas_cost_wei: number | null;
  }>>(query);

  return results[0]?.avg_gas_cost_wei || null;
}

/** Get proof submission timeline grouped by period */
export async function getProverTimeline(
  proverAddress: string,
  rollupAddresses: string[],
  groupBy: 'epoch' | 'day' | 'week' = 'epoch'
) {
  let query: Prisma.Sql;

  switch (groupBy) {
    case 'epoch':
      query = Prisma.sql`
        SELECT
          epoch_number::int as period,
          COUNT(*) as proof_count,
          SUM(transaction_gas) as total_gas,
          AVG(COALESCE(transaction_max_fee_per_gas, transaction_gas_price)) as avg_gas_price
        FROM "L2ProofVerified"
        WHERE prover_id = ${proverAddress}
          AND ${rollupWhereClause(rollupAddresses)}
        GROUP BY epoch_number::int
        ORDER BY epoch_number::int DESC;
      `;
      break;

    case 'day':
      query = Prisma.sql`
        SELECT
          DATE_TRUNC('day', TO_TIMESTAMP(timestamp)) as period,
          COUNT(*) as proof_count,
          SUM(transaction_gas) as total_gas,
          AVG(COALESCE(transaction_max_fee_per_gas, transaction_gas_price)) as avg_gas_price
        FROM "L2ProofVerified"
        WHERE prover_id = ${proverAddress}
          AND ${rollupWhereClause(rollupAddresses)}
        GROUP BY DATE_TRUNC('day', TO_TIMESTAMP(timestamp))
        ORDER BY period DESC;
      `;
      break;

    case 'week':
      query = Prisma.sql`
        SELECT
          DATE_TRUNC('week', TO_TIMESTAMP(timestamp)) as period,
          COUNT(*) as proof_count,
          SUM(transaction_gas) as total_gas,
          AVG(COALESCE(transaction_max_fee_per_gas, transaction_gas_price)) as avg_gas_price
        FROM "L2ProofVerified"
        WHERE prover_id = ${proverAddress}
          AND ${rollupWhereClause(rollupAddresses)}
        GROUP BY DATE_TRUNC('week', TO_TIMESTAMP(timestamp))
        ORDER BY period DESC;
      `;
      break;
  }

  const results = await prisma.$queryRaw<Array<{
    period: number | Date;
    proof_count: bigint;
    total_gas: bigint;
    avg_gas_price: number | null;
  }>>(query);

  return results;
}

/** Get proof distribution across provers for market share */
export async function getProverMarketShare(rollupAddresses: string[]) {
  const query = Prisma.sql`
    SELECT
      prover_id,
      COUNT(*) as total_proofs,
      MIN(epoch_number::int) as first_epoch,
      MAX(epoch_number::int) as last_epoch,
      COUNT(DISTINCT epoch_number::int) as unique_epochs
    FROM "L2ProofVerified"
    WHERE ${rollupWhereClause(rollupAddresses)}
    GROUP BY prover_id
    ORDER BY total_proofs DESC;
  `;

  const results = await prisma.$queryRaw<Array<{
    prover_id: string;
    total_proofs: bigint;
    first_epoch: number;
    last_epoch: number;
    unique_epochs: bigint;
  }>>(query);

  return results;
}

/** Get network-wide proof activity timeline grouped by period */
export async function getNetworkProverTimeline(
  rollupAddresses: string[],
  groupBy: 'epoch' | 'day' | 'week' = 'day'
) {
  let query: Prisma.Sql;

  switch (groupBy) {
    case 'epoch':
      query = Prisma.sql`
        SELECT
          epoch_number::int as period,
          COUNT(*) as proof_count,
          COUNT(DISTINCT prover_id) as unique_provers,
          SUM(transaction_gas) as total_gas
        FROM "L2ProofVerified"
        WHERE ${rollupWhereClause(rollupAddresses)}
        GROUP BY epoch_number::int
        ORDER BY epoch_number::int ASC;
      `;
      break;
    case 'day':
      query = Prisma.sql`
        SELECT
          EXTRACT(EPOCH FROM DATE_TRUNC('day', TO_TIMESTAMP(timestamp)))::bigint as period,
          COUNT(*) as proof_count,
          COUNT(DISTINCT prover_id) as unique_provers,
          SUM(transaction_gas) as total_gas
        FROM "L2ProofVerified"
        WHERE ${rollupWhereClause(rollupAddresses)}
        GROUP BY DATE_TRUNC('day', TO_TIMESTAMP(timestamp))
        ORDER BY period ASC;
      `;
      break;
    case 'week':
      query = Prisma.sql`
        SELECT
          EXTRACT(EPOCH FROM DATE_TRUNC('week', TO_TIMESTAMP(timestamp)))::bigint as period,
          COUNT(*) as proof_count,
          COUNT(DISTINCT prover_id) as unique_provers,
          SUM(transaction_gas) as total_gas
        FROM "L2ProofVerified"
        WHERE ${rollupWhereClause(rollupAddresses)}
        GROUP BY DATE_TRUNC('week', TO_TIMESTAMP(timestamp))
        ORDER BY period ASC;
      `;
      break;
  }

  const results = await prisma.$queryRaw<Array<{
    period: number | bigint;
    proof_count: bigint;
    unique_provers: bigint;
    total_gas: bigint;
  }>>(query);

  return results;
}

/** Get network-wide proving health KPIs */
export async function getNetworkProvingHealth(rollupAddresses: string[]) {
  const query = Prisma.sql`
    SELECT
      COUNT(*) as total_proofs,
      COUNT(DISTINCT prover_id) as unique_provers,
      COUNT(DISTINCT epoch_number::int) as epochs_with_proofs,
      MIN(epoch_number::int) as first_epoch,
      MAX(epoch_number::int) as last_epoch,
      MIN(timestamp) as first_proof_timestamp,
      MAX(timestamp) as last_proof_timestamp
    FROM "L2ProofVerified"
    WHERE ${rollupWhereClause(rollupAddresses)};
  `;

  const results = await prisma.$queryRaw<Array<{
    total_proofs: bigint;
    unique_provers: bigint;
    epochs_with_proofs: bigint;
    first_epoch: number;
    last_epoch: number;
    first_proof_timestamp: bigint;
    last_proof_timestamp: bigint;
  }>>(query);

  return results[0] || null;
}

/** Get top provers leaderboard */
export async function getProverLeaderboard(rollupAddresses: string[], limit: number = 10) {
  const query = Prisma.sql`
    WITH prover_stats AS (
      SELECT
        prover_id,
        COUNT(*) as total_proofs,
        MIN(epoch_number::int) as first_epoch,
        MAX(epoch_number::int) as last_epoch
      FROM "L2ProofVerified"
      WHERE ${rollupWhereClause(rollupAddresses)}
      GROUP BY prover_id
      HAVING COUNT(*) > 0
    )
    SELECT
      prover_id,
      total_proofs,
      first_epoch,
      last_epoch,
      RANK() OVER (ORDER BY total_proofs DESC) as rank
    FROM prover_stats
    ORDER BY total_proofs DESC
    LIMIT ${limit};
  `;

  const results = await prisma.$queryRaw<Array<{
    prover_id: string;
    total_proofs: bigint;
    first_epoch: number;
    last_epoch: number;
    rank: bigint;
  }>>(query);

  return results;
}
