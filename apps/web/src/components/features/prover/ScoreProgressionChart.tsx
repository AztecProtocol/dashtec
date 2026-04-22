'use client';

import { ChartBarIcon } from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { calculateShares, calculateShareMultiplier, REWARD_CONFIG } from '@/utils/rewardCalculations';

interface ProofHistoryEntry {
  epoch: number;
  score: number;
  gap: number;
  scoreBefore?: number;
  scoreAfter?: number;
}

interface ScoreProgressionChartProps {
  history: ProofHistoryEntry[];
  maxScore?: number;
}

/**
 * Score Progression Chart - Visualizes activity score over time showing increment and decay
 */
export const ScoreProgressionChart: React.FC<ScoreProgressionChartProps> = ({
  history,
  maxScore = 15_000_000,
}) => {
  // Prepare chart data showing increment and decay
  const chartData = history.map((entry) => {
    const scoreBefore = entry.scoreBefore ?? entry.score;
    const scoreAfter = entry.scoreAfter ?? entry.score;
    const shares = calculateShares(scoreAfter);
    const multiplier = calculateShareMultiplier(shares);

    // Calculate the increment and decay for this epoch
    const increment = REWARD_CONFIG.increment;
    const decay = entry.gap > 0 ? entry.gap * REWARD_CONFIG.decayPerEpoch : 0;
    const netChange = scoreAfter - scoreBefore;

    return {
      epoch: entry.epoch,
      scoreBefore: scoreBefore,
      scoreAfter: scoreAfter,
      increment: increment,
      decay: decay,
      netChange: netChange,
      shares: shares,
      multiplier: multiplier,
      gap: entry.gap,
    };
  });

  // Find peak score
  const peakScore = Math.max(...history.map(h => h.score));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Epoch {data.epoch}
          </p>
          <div className="space-y-1 text-xs">
            <p className="text-slate-600 dark:text-slate-400">
              Before: <span className="font-bold text-slate-900 dark:text-slate-100">
                {data.scoreBefore.toLocaleString()}
              </span>
            </p>
            {data.decay > 0 && (
              <p className="text-red-600 dark:text-red-400">
                Decay: <span className="font-bold">-{data.decay.toLocaleString()}</span>
              </p>
            )}
            <p className="text-green-600 dark:text-green-400">
              Increment: <span className="font-bold">+{data.increment.toLocaleString()}</span>
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              After: <span className="font-bold text-brand-violet dark:text-accent-purple-light">
                {data.scoreAfter.toLocaleString()}
              </span>
            </p>
            <p className="text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-600">
              Net Change: <span className={`font-bold ${data.netChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {data.netChange >= 0 ? '+' : ''}{data.netChange.toLocaleString()}
              </span>
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              Shares: <span className="font-bold">{data.shares.toLocaleString()}</span> ({data.multiplier.toFixed(1)}x)
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 p-6">
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-violet/10 dark:group-hover:border-accent-purple/10 rounded-2xl transition-colors duration-300 pointer-events-none"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Score Progression
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Activity score and share multiplier over time
            </p>
          </div>
          <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600/50">
            <ChartBarIcon className="h-4 w-4 text-brand-violet dark:text-accent-purple-light" />
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />

              {/* X-Axis: Epoch Numbers */}
              <XAxis
                dataKey="epoch"
                stroke="#64748b"
                style={{ fontSize: '12px' }}
                label={{ value: 'Epoch', position: 'insideBottom', offset: -5, fill: '#64748b' }}
              />

              {/* Y-Axis: Activity Score */}
              <YAxis
                stroke="#D4A017"
                style={{ fontSize: '12px' }}
                label={{ value: 'Activity Score', angle: -90, position: 'insideLeft', fill: '#D4A017' }}
                tickFormatter={(value) => `${(value / 1_000_000).toFixed(1)}M`}
              />

              <Tooltip content={<CustomTooltip />} />

              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                iconType="line"
              />

              {/* Reference line for max score */}
              <ReferenceLine
                y={maxScore}
                stroke="#94a3b8"
                strokeDasharray="5 5"
                label={{ value: 'Max Score', fill: '#94a3b8', fontSize: 12, position: 'right' }}
              />

              {/* Score Before line (baseline) */}
              <Line
                type="stepAfter"
                dataKey="scoreBefore"
                stroke="#64748b"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                name="Score Before Proof"
              />

              {/* Score After line (with increment) */}
              <Line
                type="stepAfter"
                dataKey="scoreAfter"
                stroke="#D4A017"
                strokeWidth={3}
                dot={{ fill: '#D4A017', r: 4 }}
                activeDot={{ r: 6 }}
                name="Score After Proof"
              />

              {/* Increment area (green) */}
              <Area
                type="stepAfter"
                dataKey="increment"
                stackId="1"
                fill="#10b981"
                fillOpacity={0.3}
                stroke="none"
                name="Increment (+125k)"
              />

              {/* Decay area (red) */}
              <Area
                type="stepAfter"
                dataKey="decay"
                stackId="2"
                fill="#ef4444"
                fillOpacity={0.3}
                stroke="none"
                name="Decay"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 opacity-30 rounded-sm"></div>
              <span className="text-slate-600 dark:text-slate-400">Increment: +{REWARD_CONFIG.increment.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 opacity-30 rounded-sm"></div>
              <span className="text-slate-600 dark:text-slate-400">Decay: -{REWARD_CONFIG.decayPerEpoch.toLocaleString()}/epoch</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-brand-violet rounded-sm"></div>
              <span className="text-slate-600 dark:text-slate-400">Score After Proof</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-slate-400 border-dashed rounded-sm"></div>
              <span className="text-slate-600 dark:text-slate-400">Score Before Proof</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
