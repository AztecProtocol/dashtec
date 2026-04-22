import { useMemo } from 'react';
import { PerformanceHistoryEntry } from '@/types/api/providers';

/**
 * Hook to process attester performance data for chart visualization
 */
export function useAttesterPerformanceChart(
  performanceHistory: PerformanceHistoryEntry[] | undefined,
  epochLimit: number
) {
  const chartData = useMemo(() => {
    const history = performanceHistory || [];

    // Filter by epoch limit
    const filteredHistory = history.slice(-epochLimit);

    if (filteredHistory.length === 0) {
      return {
        labels: [],
        attestationSuccessData: [],
        attestationMissedData: [],
        blockSuccessData: [],
        blockMissedData: [],
        totalEpochs: 0,
      };
    }

    // Extract labels (epoch numbers)
    const labels = filteredHistory.map(h => `E${h.epoch_number}`);

    // Extract actual counts for attestations
    const attestationSuccessData = filteredHistory.map(h => h.attestations_successful);
    const attestationMissedData = filteredHistory.map(h => h.attestations_missed);

    // Extract actual counts for blocks
    const blockSuccessData = filteredHistory.map(h => h.checkpoints_proposed + h.checkpoints_mined);
    const blockMissedData = filteredHistory.map(h => (h.checkpoints_missed || 0) + h.blocks_missed);

    return {
      labels,
      attestationSuccessData,
      attestationMissedData,
      blockSuccessData,
      blockMissedData,
      totalEpochs: filteredHistory.length,
    };
  }, [performanceHistory, epochLimit]);

  const datasets = useMemo(() => [
    {
      label: 'Attestation Success',
      data: chartData.attestationSuccessData,
      backgroundColor: 'rgba(16, 185, 129, 0.8)',
      borderColor: 'rgb(16, 185, 129)',
      borderWidth: 1,
      stack: 'attestation',
    },
    {
      label: 'Attestation Missed',
      data: chartData.attestationMissedData,
      backgroundColor: 'rgba(239, 68, 68, 0.8)',
      borderColor: 'rgb(239, 68, 68)',
      borderWidth: 1,
      stack: 'attestation',
    },
    {
      label: 'Checkpoint Success',
      data: chartData.blockSuccessData,
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1,
      stack: 'block',
    },
    {
      label: 'Checkpoint/Block Missed',
      data: chartData.blockMissedData,
      backgroundColor: 'rgba(251, 146, 60, 0.8)',
      borderColor: 'rgb(251, 146, 60)',
      borderWidth: 1,
      stack: 'block',
    },
  ], [chartData]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 10,
        bottom: 30,
        left: 10,
        right: 10,
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          font: { size: 10 },
          padding: 8,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        enabled: true,
        position: 'average' as const,
        yAlign: 'bottom' as const,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        padding: 12,
        cornerRadius: 8,
        titleColor: '#fff',
        bodyColor: '#fff',
        bodySpacing: 6,
        displayColors: false,
        callbacks: {
          title: (context: any) => {
            const label = context[0].label;
            return label.replace('E', 'Epoch ');
          },
          beforeBody: (context: any) => {
            const dataIndex = context[0].dataIndex;

            const attSuccess = chartData.attestationSuccessData[dataIndex] || 0;
            const attMissed = chartData.attestationMissedData[dataIndex] || 0;
            const blockSuccess = chartData.blockSuccessData[dataIndex] || 0;
            const blockMissed = chartData.blockMissedData[dataIndex] || 0;

            const attTotal = attSuccess + attMissed;
            const blockTotal = blockSuccess + blockMissed;
            const attRate = attTotal > 0 ? ((attSuccess / attTotal) * 100).toFixed(1) : '0.0';
            const blockRate = blockTotal > 0 ? ((blockSuccess / blockTotal) * 100).toFixed(1) : '0.0';

            return [
              '',
              'Attestations:',
              `  Success: ${attSuccess} (${attRate}%)`,
              `  Missed: ${attMissed}`,
              '',
              'Checkpoint/Block Proposals:',
              `  Success: ${blockSuccess} (${blockRate}%)`,
              `  Missed: ${blockMissed}`,
            ];
          },
          label: () => {
            return '';
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        stacked: true,
        ticks: {
          color: '#94a3b8',
          font: { size: 10 },
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
      },
      x: {
        stacked: true,
        ticks: {
          color: '#94a3b8',
          font: { size: 10 },
          maxRotation: 0,
        },
        grid: {
          display: false,
        },
      },
    },
  }), [chartData]);

  return {
    labels: chartData.labels,
    datasets,
    options,
    totalEpochs: chartData.totalEpochs,
  };
}
