import { NextRequest, NextResponse } from 'next/server';

// Debug log for environment variable
console.log('Rate Limiting Environment Variable:', {
  value: process.env.RATE_LIMITING_ENABLED,
  enabled: process.env.RATE_LIMITING_ENABLED !== 'false'
});

// Use a function to check the environment variable at runtime
function isRateLimitingEnabled() {
  return process.env.RATE_LIMITING_ENABLED !== 'false';
}

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in the window
  enabled?: boolean;   // Optional per-endpoint toggle
}

// Rate limit metrics tracking
interface RateLimitMetrics {
  requests: number;
  windowStart: number;
  lastLogTime: number;
  recentRequests: number; // Requests since last log
}

// Different rate limits for different endpoints
const rateLimits: Record<string, RateLimitConfig> = {
  // Default rate limit for all API routes
  default: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,     // 60 requests per minute
    enabled: true        // Can be overridden by environment variable
  },
  '/api/validators/queue': {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 90,     // 90 requests per minute
    enabled: true         // Can be overridden by environment variable
  },
  // Stricter limit for validator operations
  '/api/validators': {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 90,      // 30 requests per minute
    enabled: true         // Can be overridden by environment variable
  },
  // More lenient for dashboard metrics
  '/api/dashboard': {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 120,     // 120 requests per minute
    enabled: true         // Can be overridden by environment variable
  },
};

// In-memory store type
export type RateLimitStore = Map<string, RateLimitMetrics>;

// Default in-memory store for rate limiting and metrics
const defaultRateLimit: RateLimitStore = new Map<string, RateLimitMetrics>();

// Export for testing purposes
export function resetRateLimitStore() {
  defaultRateLimit.clear();
}

const LOG_INTERVAL = 10000; // Log summary every 10 seconds

/**
 * Generate a device fingerprint from request headers using Web Crypto API
 */
async function generateDeviceFingerprint(request: NextRequest): Promise<string> {
  const components = [
    request.headers.get('user-agent') || 'unknown',
    request.headers.get('accept-language') || 'unknown',
    request.headers.get('sec-ch-ua') || 'unknown', // Browser brand
    request.headers.get('sec-ch-ua-platform') || 'unknown', // OS platform
    request.headers.get('sec-ch-ua-mobile') || 'unknown', // Mobile indicator
  ];

  // Convert the components to a Uint8Array
  const data = new TextEncoder().encode(components.join('|'));

  // Use SHA-256 from Web Crypto API
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert buffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Return first 16 chars for readability
  return hashHex.slice(0, 16);
}

/**
 * Calculate requests per second
 */
function calculateRPS(metrics: RateLimitMetrics): number {
  const now = Date.now();
  const duration = (now - metrics.windowStart) / 1000; // Convert to seconds
  return duration > 0 ? metrics.requests / duration : 0;
}

/**
 * Format RPS with 2 decimal places
 */
function formatRPS(rps: number): string {
  return rps.toFixed(2);
}

/**
 * Log rate limit metrics for a specific IP and path
 */
function logRateLimitMetrics(ip: string, deviceId: string, path: string, metrics: RateLimitMetrics, wasLimited: boolean) {
  if (!isRateLimitingEnabled()) return; // Don't log metrics if rate limiting is disabled

  const now = Date.now();
  const rps = calculateRPS(metrics);

  // Log immediate rate limit hits
  if (wasLimited) {
    console.warn(
      `[RATE LIMIT] ${new Date(now).toISOString()} | IP: ${ip} | Device: ${deviceId} | ${path} | ` +
      `RPS: ${formatRPS(rps)} | Total Requests: ${metrics.requests}`
    );
  }

  // Periodic summary logging
  if (now - (metrics.lastLogTime || 0) >= LOG_INTERVAL) {
    const requestsSinceLastLog = metrics.recentRequests || 0;
    const timeSinceLastLog = (now - (metrics.lastLogTime || now)) / 1000;
    const recentRPS = timeSinceLastLog > 0 ? requestsSinceLastLog / timeSinceLastLog : 0;

    console.log(
      `[RATE METRICS] ${new Date(now).toISOString()} | IP: ${ip} | Device: ${deviceId} | ${path} | ` +
      `Avg RPS: ${formatRPS(rps)} | Recent RPS: ${formatRPS(recentRPS)} | ` +
      `Total Requests: ${metrics.requests} | Window Requests: ${requestsSinceLastLog}`
    );

    // Reset periodic counters
    metrics.lastLogTime = now;
    metrics.recentRequests = 0;
  }
}

/**
 * Clean up old rate limit entries
 */
function cleanupRateLimit(store: RateLimitStore) {
  if (!isRateLimitingEnabled()) return; // Skip cleanup if rate limiting is disabled

  const now = Date.now();
  for (const [key, metrics] of store.entries()) {
    const [ip, deviceId, path] = key.split('|');
    const config = getRateLimitConfig(path);

    if (now - metrics.windowStart > config.windowMs) {
      // Log final metrics before cleanup
      logRateLimitMetrics(ip, deviceId, path, metrics, false);
      store.delete(key);
    }
  }
}

/**
 * Get rate limit configuration for a path
 */
function getRateLimitConfig(path: string): RateLimitConfig {
  // Find the most specific rate limit configuration
  const matchingPath = Object.keys(rateLimits)
    .find(pattern => path.startsWith(pattern));

  const config = rateLimits[matchingPath || 'default'];

  // Override enabled status with environment variable
  return {
    ...config,
    enabled: isRateLimitingEnabled() && config.enabled
  };
}

/**
 * Check if a request should be rate limited
 */
async function isRateLimited(ip: string, deviceId: string, path: string, store: RateLimitStore): Promise<boolean> {
  if (!isRateLimitingEnabled()) return false; // Skip rate limiting if disabled

  const now = Date.now();
  const key = `${ip}|${deviceId}|${path}`;
  const config = getRateLimitConfig(path);

  // Clean up old entries periodically
  if (Math.random() < 0.1) {
    cleanupRateLimit(store);
  }

  let metrics = store.get(key);

  // If no existing rate limit entry or window has expired
  if (!metrics || now - metrics.windowStart > config.windowMs) {
    metrics = {
      requests: 1,
      windowStart: now,
      lastLogTime: now,
      recentRequests: 1
    };
    store.set(key, metrics);
    return false;
  }

  // Increment request counts
  metrics.requests++;
  metrics.recentRequests = (metrics.recentRequests || 0) + 1;

  // Check if over limit
  const isLimited = metrics.requests > config.maxRequests;

  // Log metrics
  logRateLimitMetrics(ip, deviceId, path, metrics, isLimited);

  return isLimited;
}

export async function middleware(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  let requestIp = 'IP Not Found';
  if (forwardedFor) {
    requestIp = forwardedFor.split(',')[0].trim();
  } else if (request.headers.get('x-real-ip')) { // Fallback for some proxies
    requestIp = request.headers.get('x-real-ip')!.trim();
  }
  const requestPath = request.nextUrl.pathname;
  const requestMethod = request.method;
  const instancePort = process.env.PORT || 'unknown';
  const deviceId = await generateDeviceFingerprint(request);

  // Log request with rate limiting status
  console.log(
    `[${requestMethod}] \x1b[1m${requestPath}\x1b[0m | ${new Date().toISOString()} | ` +
    `IP: \x1b[36m${requestIp}\x1b[0m | Device: \x1b[33m${deviceId}\x1b[0m | Port: \x1b[35m${instancePort}\x1b[0m | ` +
    `Rate Limiting: \x1b[32m${isRateLimitingEnabled() ? 'Enabled' : 'Disabled'}\x1b[0m`
  );

  // Skip rate limiting for non-API routes
  if (!requestPath.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Handle CORS preflight requests for API routes
  if (requestMethod === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Skip rate limiting if disabled globally
  if (!isRateLimitingEnabled()) {
    const response = NextResponse.next();

    // Fallback CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    return response;
  }

  const config = getRateLimitConfig(requestPath);

  // Skip rate limiting if disabled for this endpoint
  if (!config.enabled) {
    const response = NextResponse.next();

    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    return response;
  }

  // Check rate limit
  if (await isRateLimited(requestIp, deviceId, requestPath, defaultRateLimit)) {
    console.warn(`[Rate Limit] IP ${requestIp} Device ${deviceId} exceeded limit for ${requestPath}`);

    return new NextResponse(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Reset': (Date.now() + config.windowMs).toString(),
          'Retry-After': (config.windowMs / 1000).toString(),
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
        }
      }
    );
  }

  // If all checks pass, add CORS headers and continue to the API route
  const response = NextResponse.next();

  // Add CORS headers to all API responses
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  return response;
}

// --- Middleware Matcher ---
// This configures which paths the middleware will run on.
export const config = {
  matcher: [
    /*
     * Match all API routes except for NextAuth.js.
     * Adjust this to your needs.
     * - Starting with /api/
     * - Not starting with /api/auth (if you use NextAuth.js)
     * - Not including files with extensions (e.g., .png, .ico)
     */
    '/api/:path*', // This will match all routes under /api/
    // If you want to be more specific, for example, only for /api/validators/:
    // '/api/validators/:path*',
    // Or for multiple specific paths:
    // ['/api/dashboard/:path*', '/api/epochs/:path*', '/api/validators/:path*']
  ],
};
