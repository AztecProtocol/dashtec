/**
 * Base API response types
 */

/**
 * Base API response structure that all responses should extend
 */
export interface BaseApiResponse {
  benchmark: string;
  benchmarks?: Record<string, string>;
  status: 'ok' | 'error';
}

/**
 * API error response structure
 */
export interface ApiErrorResponse extends BaseApiResponse {
  error: string;
  status: 'error';
}

/**
 * Pagination metadata structure
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
