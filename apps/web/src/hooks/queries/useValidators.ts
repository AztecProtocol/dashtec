import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { PaginatedValidatorsResponse, ValidatorsQueryParams } from '@/types/api';

/**
 * Fetch validators with optional filters
 */
async function fetchValidators(
  params?: ValidatorsQueryParams
): Promise<PaginatedValidatorsResponse> {
  const searchParams = new URLSearchParams();

  // Add all params to search string
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value));
      }
    });
  }

  const url = params
    ? `/api/validators?${searchParams.toString()}`
    : '/api/validators';

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
 * Hook to fetch all validators with React Query (simple version)
 * Use this for simple lists that don't need pagination
 *
 * @returns UseQueryResult with PaginatedValidatorsResponse data
 */
export function useValidators(): UseQueryResult<PaginatedValidatorsResponse, Error> {
  return useQuery<PaginatedValidatorsResponse, Error>({
    queryKey: ['validators'],
    queryFn: () => fetchValidators(),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch paginated validators with filters
 * Use this for the main validators page with sorting, filtering, and pagination
 *
 * @param params - Query parameters for filtering, sorting, and pagination
 * @returns UseQueryResult with PaginatedValidatorsResponse data
 */
export function usePaginatedValidators(
  params: ValidatorsQueryParams
): UseQueryResult<PaginatedValidatorsResponse, Error> {
  return useQuery<PaginatedValidatorsResponse, Error>({
    queryKey: ['validators', 'paginated', params],
    queryFn: () => fetchValidators(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}
