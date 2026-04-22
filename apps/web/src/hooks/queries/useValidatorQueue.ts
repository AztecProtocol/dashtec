import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  QueueApiResponse,
  QueueStatsResponse,
  ValidatorQueueParams,
} from '@/types/api/queue';

/**
 * Fetch validator queue data
 */
async function fetchValidatorQueue(
  params?: ValidatorQueueParams
): Promise<QueueApiResponse> {
  const searchParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value));
      }
    });
  }

  const url = params
    ? `/api/validators/queue?${searchParams.toString()}`
    : '/api/validators/queue';

  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: `API request failed: ${response.status}`,
    }));
    throw new Error(errorData.error || `API request failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error);

  return data;
}

/**
 * Fetch queue statistics
 */
async function fetchQueueStats(rollup?: string): Promise<QueueStatsResponse> {
  const params = rollup && rollup !== 'active' ? `?rollup=${encodeURIComponent(rollup)}` : '';
  const response = await fetch(`/api/validators/queue/stats${params}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: `API request failed: ${response.status}`,
    }));
    throw new Error(errorData.error || `API request failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error);

  return data;
}

/**
 * Hook to fetch paginated validator queue
 */
export function useValidatorQueue(
  params: ValidatorQueueParams
): UseQueryResult<QueueApiResponse, Error> {
  return useQuery<QueueApiResponse, Error>({
    queryKey: ['validatorQueue', params],
    queryFn: () => fetchValidatorQueue(params),
    staleTime: 5 * 1000, // 5 seconds
    refetchInterval: 5 * 1000, // Auto-refresh every 5 seconds
  });
}

/**
 * Hook to fetch queue statistics
 */
export function useQueueStats(rollup?: string): UseQueryResult<QueueStatsResponse, Error> {
  return useQuery<QueueStatsResponse, Error>({
    queryKey: ['queueStats', rollup],
    queryFn: () => fetchQueueStats(rollup),
    staleTime: 5 * 1000, // 5 seconds
    refetchInterval: 5 * 1000, // Auto-refresh every 5 seconds
  });
}
