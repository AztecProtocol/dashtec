'use client';

import { useState, useMemo } from 'react';
import { XMarkIcon, CalculatorIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { calculateShares, calculateShareMultiplier, REWARD_CONFIG } from '@/utils/rewardCalculations';
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

interface SharesCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  maxScore?: number;
  maxShares?: number;
}

/**
 * Shares Calculator - Interactive modal for calculating shares based on activity score
 */
export const SharesCalculator: React.FC<SharesCalculatorProps> = ({
  isOpen,
  onClose,
  maxScore = 15_000_000,
  maxShares = 1_000_000,
}) => {
  const [targetScore, setTargetScore] = useState(1_000_000);

  // Use the quadratic formula from rewardCalculations utility
  const shares = calculateShares(targetScore);
  const multiplier = calculateShareMultiplier(shares);

  // Generate graph data points for the curve
  const graphData = useMemo(() => {
    const points = [];
    const step = maxScore / 100; // 100 points for smooth curve

    for (let score = 0; score <= maxScore; score += step) {
      const sharesAtScore = calculateShares(score);
      const multiplierAtScore = calculateShareMultiplier(sharesAtScore);
      points.push({
        score,
        shares: sharesAtScore,
        multiplier: multiplierAtScore,
      });
    }

    return points;
  }, [maxScore]);

  // Find the closest point to target score for highlighting
  const closestPointIndex = useMemo(() => {
    let minDiff = Infinity;
    let closestIdx = 0;

    graphData.forEach((point, index) => {
      const diff = Math.abs(point.score - targetScore);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = index;
      }
    });

    return closestIdx;
  }, [graphData, targetScore]);

  // Custom tooltip for graph
  const GraphTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 shadow-lg">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Score: <span className="font-bold text-slate-900 dark:text-slate-100">
              {data.score.toLocaleString()}
            </span>
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Shares: <span className="font-bold text-brand-violet dark:text-accent-purple-light">
              {data.shares.toLocaleString()}
            </span>
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Multiplier: <span className="font-bold text-blue-600 dark:text-blue-400">
              {data.multiplier.toFixed(2)}x
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-violet/10 rounded-lg">
                      <CalculatorIcon className="h-6 w-6 text-brand-violet dark:text-accent-purple-light" />
                    </div>
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-bold text-slate-900 dark:text-slate-100"
                    >
                      Shares Calculator
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                  </button>
                </div>

                {/* Slider */}
                <div className="mb-8">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    Target Activity Score
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={maxScore}
                    step="10000"
                    value={targetScore}
                    onChange={(e) => setTargetScore(Number(e.target.value))}
                    className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-violet"
                  />
                  <div className="flex justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>0</span>
                    <span>{(maxScore / 1_000_000).toFixed(0)}M</span>
                  </div>
                </div>

                {/* Results */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                    <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Activity Score
                    </div>
                    <div className="text-2xl font-bold text-brand-violet dark:text-accent-purple-light">
                      {targetScore.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                    <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Resulting Shares
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {shares.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                    <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Share Multiplier
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {multiplier.toFixed(2)}x
                    </div>
                  </div>
                </div>

                {/* Reward Mechanism Info */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-6">
                  <div className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    How Rewards Work
                  </div>
                  <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                    <div>• Each proof submission adds <span className="font-bold">+{REWARD_CONFIG.increment.toLocaleString()}</span> to your score</div>
                    <div>• Score decays by <span className="font-bold">-{REWARD_CONFIG.decayPerEpoch.toLocaleString()}</span> every epoch (including when you prove)</div>
                    <div>• Net gain per consecutive epoch: <span className="font-bold">+{(REWARD_CONFIG.increment - REWARD_CONFIG.decayPerEpoch).toLocaleString()}</span></div>
                    <div>• Maximum score: <span className="font-bold">{REWARD_CONFIG.maxScore.toLocaleString()}</span></div>
                    <div>• Shares use quadratic formula: shares = max(1M - (1000 × t²) / 10^10, 100k) where t = 15M - score</div>
                  </div>
                </div>

                {/* Shares Curve Graph */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Shares Curve (Quadratic Formula)
                    </h4>
                  </div>
                  <div className="p-4">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={graphData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />

                          {/* X-Axis: Activity Score */}
                          <XAxis
                            dataKey="score"
                            stroke="#64748b"
                            style={{ fontSize: '11px' }}
                            label={{ value: 'Activity Score', position: 'insideBottom', offset: -5, fill: '#64748b' }}
                            tickFormatter={(value) => `${(value / 1_000_000).toFixed(1)}M`}
                          />

                          {/* Y-Axis: Shares */}
                          <YAxis
                            stroke="#D4A017"
                            style={{ fontSize: '11px' }}
                            label={{ value: 'Shares', angle: -90, position: 'insideLeft', fill: '#D4A017' }}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                          />

                          <Tooltip content={<GraphTooltip />} />

                          {/* Reference line for max shares */}
                          <ReferenceLine
                            y={maxShares}
                            stroke="#94a3b8"
                            strokeDasharray="5 5"
                            label={{ value: 'Max', fill: '#94a3b8', fontSize: 10, position: 'right' }}
                          />

                          {/* Reference line for minimum shares */}
                          <ReferenceLine
                            y={REWARD_CONFIG.minimum}
                            stroke="#94a3b8"
                            strokeDasharray="5 5"
                            label={{ value: 'Min', fill: '#94a3b8', fontSize: 10, position: 'right' }}
                          />

                          {/* Shares Area */}
                          <Area
                            type="monotone"
                            dataKey="shares"
                            fill="#D4A017"
                            fillOpacity={0.2}
                            stroke="none"
                            legendType="none"
                          />

                          {/* Shares Line */}
                          <Line
                            type="monotone"
                            dataKey="shares"
                            stroke="#D4A017"
                            strokeWidth={3}
                            isAnimationActive={false}
                            dot={false}
                            name="Shares (Quadratic)"
                          />

                          {/* Target indicator - separate scatter point */}
                          <Line
                            type="monotone"
                            dataKey="shares"
                            stroke="none"
                            strokeWidth={0}
                            isAnimationActive={false}
                            dot={(props: any) => {
                              const { index, cx, cy } = props;
                              if (index !== closestPointIndex) {
                                return <circle cx={0} cy={0} r={0} fill="none" />;
                              }
                              return (
                                <g key={`target-${index}`}>
                                  <circle cx={cx} cy={cy} r={5} fill="#f59e0b" stroke="#fff" strokeWidth={2} />
                                  <text
                                    x={cx}
                                    y={cy - 12}
                                    fill="#f59e0b"
                                    fontSize={10}
                                    fontWeight="bold"
                                    textAnchor="middle"
                                  >
                                    Target
                                  </text>
                                </g>
                              );
                            }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
