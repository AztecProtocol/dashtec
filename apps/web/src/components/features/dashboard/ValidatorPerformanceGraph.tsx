'use client';

import React from 'react';
import { ValidatorEpochPerformanceData } from '@/types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface ValidatorPerformanceGraphProps {
  performanceData: ValidatorEpochPerformanceData[];
  dataKey?: keyof ValidatorEpochPerformanceData;
  metricName?: string;
  isRate?: boolean;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label, metricName, isRate }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload; // The original data point for this tooltip item
    let valueDisplay: string;

    if (isRate) {
      valueDisplay = `${payload[0].value.toFixed(1)}%`;
    } else {
      valueDisplay = `${payload[0].value.toLocaleString()}`;
    }

    return (
      <div className="bg-slate-700 dark:bg-slate-800 bg-opacity-80 dark:bg-opacity-90 backdrop-blur-sm p-3 rounded-md shadow-lg border border-slate-600 dark:border-slate-700">
        <p className="text-xs text-slate-300 dark:text-slate-400 mb-1">{`Epoch: ${label}`}</p>
        <p className="text-sm font-semibold text-white dark:text-slate-50">
          {metricName || 'Value'}: <span className="text-brand-violet dark:text-accent-purple-light">{valueDisplay}</span>
        </p>
        {isRate && (
          <>
            <p className="text-xs text-slate-300 dark:text-slate-400 mt-0.5">Att. Successful: {data.attestationsSuccessful.toLocaleString()}</p>
            <p className="text-xs text-slate-300 dark:text-slate-400">Att. Missed: {data.attestationsMissed.toLocaleString()}</p>
            <p className="text-xs text-slate-300 dark:text-slate-400">Checkpoint Proposed/Mined: {data.blocksProduced.toLocaleString()}</p>
            <p className="text-xs text-slate-300 dark:text-slate-400">Block Missed: {data.blocksMissed.toLocaleString()}</p>
          </>
        )}
      </div>
    );
  }
  return null;
};


export const ValidatorPerformanceGraph: React.FC<ValidatorPerformanceGraphProps> = ({
  performanceData,
  dataKey = 'attestationsSuccessful', // Default, will be ignored if isRate is true for attestations
  metricName = "Performance",
  isRate = false,
}) => {
  if (!performanceData || performanceData.length === 0) {
    return <p className="text-center text-slate-500 dark:text-slate-400 py-8">No historical performance data available to display graph.</p>;
  }

  const chartData = performanceData.map(epochPerf => {
    let value;
    if (isRate && (dataKey === 'attestationsSuccessful' || metricName.toLowerCase().includes("attestation"))) { // Specific for attestation rate
      const total = epochPerf.attestationsSuccessful + epochPerf.attestationsMissed;
      value = total > 0 ? (epochPerf.attestationsSuccessful / total) * 100 : (epochPerf.attestationsSuccessful === 0 && epochPerf.attestationsMissed === 0 ? 100 : 0); // Handle division by zero, or no activity
    } else {
      value = epochPerf[dataKey] as number || 0;
    }
    return {
      epochNumber: epochPerf.epochNumber,
      value: value,
      // Include original data for tooltip if needed
      attestationsSuccessful: epochPerf.attestationsSuccessful,
      attestationsMissed: epochPerf.attestationsMissed,
      blocksProduced: epochPerf.checkpointsMined + epochPerf.checkpointsProposed,
      blocksMissed: epochPerf.blocksMissed
    };
  }).sort((a, b) => a.epochNumber - b.epochNumber); // Ensure data is sorted by epoch for the chart

  const yAxisDomain: [number | string, number | string] = isRate ? [0, 100] : ['auto', 'auto'];

  return (
    <div className="h-72 md:h-80 w-full"> {/* Ensure height is sufficient */}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{
            top: 10,
            right: 0, // No margin on the right to let YAxis labels show if on right
            left: -25,  // Negative margin to pull YAxis labels closer if on left
            bottom: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} className="stroke-slate-300 dark:stroke-slate-700" />
          <XAxis
            dataKey="epochNumber"
            tickFormatter={(tick) => `#${tick}`}
            className="text-xs text-slate-500 dark:text-slate-400"
            tickLine={{ stroke: 'transparent' }}
            axisLine={{ stroke: 'transparent' }}
            padding={{ left: 10, right: 10 }} // Padding for XAxis labels
          />
          <YAxis
            domain={yAxisDomain}
            tickFormatter={(tick) => isRate ? `${tick}%` : tick.toLocaleString()}
            className="text-xs text-slate-500 dark:text-slate-400"
            tickLine={{ stroke: 'transparent' }}
            axisLine={{ stroke: 'transparent' }}
          />
          <Tooltip content={<CustomTooltip metricName={metricName} isRate={isRate} />} cursor={{ stroke: '#D4A017', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.6 }} />
          <Area
            type="monotone"
            dataKey="value"
            name={metricName}
            stroke="#D4A017" // brand-violet
            fill="#D4A017"   // brand-violet
            strokeWidth={2}
            fillOpacity={0.2}
            activeDot={{ r: 6, stroke: 'white', strokeWidth: 2, fill: '#D4A017' }}
            dot={{ r: 3, stroke: '#D4A017', strokeWidth: 1, fill: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
