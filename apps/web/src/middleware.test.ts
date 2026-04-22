import { NextRequest, NextResponse } from 'next/server';
import { middleware, resetRateLimitStore } from './middleware';

describe('Rate Limiting Middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.useFakeTimers();
    resetRateLimitStore();
    // Reset environment before each test
    process.env = { ...originalEnv };
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });
  });

  afterEach(() => {
    jest.useRealTimers();
    // Restore environment after each test
    process.env = originalEnv;
    // Restore console methods
    jest.restoreAllMocks();
  });

  const createMockRequest = (path: string, ip: string = '1.2.3.4', headers: Record<string, string> = {}) => {
    return new NextRequest(new URL(`http://localhost${path}`), {
      headers: {
        'x-forwarded-for': ip,
        'user-agent': 'test-browser/1.0',
        'accept-language': 'en-US',
        'sec-ch-ua': '"Chromium";v="112"',
        'sec-ch-ua-platform': '"Windows"',
        'sec-ch-ua-mobile': '?0',
        ...headers
      },
    });
  };

  describe('with rate limiting enabled', () => {
    beforeEach(() => {
      process.env = {
        ...originalEnv,
        RATE_LIMITING_ENABLED: 'true'
      };
      resetRateLimitStore();
      jest.clearAllMocks();
    });

    it('should allow requests under rate limit', async () => {
      const request = createMockRequest('/api/validators');

      // Make multiple requests within limit
      for (let i = 0; i < 90; i++) {
        const response = await middleware(request);
        expect(response instanceof NextResponse).toBe(true);
        expect(response.status).toBe(200);
      }
    });

    it('should block requests over rate limit', async () => {
      const request = createMockRequest('/api/validators');

      // Make requests up to limit
      for (let i = 0; i < 90; i++) {
        await middleware(request);
      }

      // This request should be blocked
      const response = await middleware(request) as NextResponse;
      expect(response.status).toBe(429);

      const responseData = await response.clone().json();
      expect(responseData).toEqual({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
      });
    });

    it('should handle multiple devices from same IP differently', async () => {
      const ip = '1.2.3.4';
      const device1Headers = {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/112.0.0.0',
        'accept-language': 'en-US',
        'sec-ch-ua': '"Chromium";v="112"',
        'sec-ch-ua-platform': '"Windows"',
        'sec-ch-ua-mobile': '?0'
      };
      const device2Headers = {
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) Safari/605.1.15',
        'accept-language': 'en-US',
        'sec-ch-ua': '"Safari";v="16"',
        'sec-ch-ua-platform': '"iOS"',
        'sec-ch-ua-mobile': '?1'
      };

      const device1Request = createMockRequest('/api/validators', ip, device1Headers);
      const device2Request = createMockRequest('/api/validators', ip, device2Headers);

      // Max out first device
      for (let i = 0; i < 90; i++) {
        await middleware(device1Request);
      }
      expect((await middleware(device1Request) as NextResponse).status).toBe(429);

      // Second device from same IP should still be able to make requests
      const response = await middleware(device2Request);
      expect(response.status).toBe(200);
    });

    it('should apply different rate limits for different endpoints', async () => {
      const validatorRequest = createMockRequest('/api/validators');
      const dashboardRequest = createMockRequest('/api/dashboard');

      // Validators endpoint (limit: 90)
      for (let i = 0; i < 90; i++) {
        const response = await middleware(validatorRequest);
        expect(response.status).toBe(200);
      }
      expect((await middleware(validatorRequest) as NextResponse).status).toBe(429);

      // Reset store before testing dashboard endpoint
      resetRateLimitStore();

      // Dashboard endpoint (limit: 120)
      for (let i = 0; i < 120; i++) {
        const response = await middleware(dashboardRequest);
        expect(response.status).toBe(200);
      }
      expect((await middleware(dashboardRequest) as NextResponse).status).toBe(429);
    });

    it('should reset rate limit after window expires', async () => {
      const request = createMockRequest('/api/validators');

      // Max out the rate limit
      for (let i = 0; i < 91; i++) {
        await middleware(request);
      }

      // Advance time past the window
      jest.advanceTimersByTime(60 * 1000 + 100); // 60 seconds + buffer

      // Should be able to make requests again
      const response = await middleware(request);
      expect(response.status).toBe(200);
    });

    it('should include rate limit headers in response', async () => {
      const request = createMockRequest('/api/validators');

      // Make requests until blocked
      for (let i = 0; i < 91; i++) {
        await middleware(request);
      }

      const response = await middleware(request) as NextResponse;
      expect(response.headers.get('X-RateLimit-Limit')).toBe('90');
      expect(response.headers.get('Retry-After')).toBe('60');
      expect(response.headers.has('X-RateLimit-Reset')).toBe(true);
    });

    it('should track separate limits for different IPs', async () => {
      const ip1Request = createMockRequest('/api/validators', '1.2.3.4');
      const ip2Request = createMockRequest('/api/validators', '5.6.7.8');

      // Max out first IP
      for (let i = 0; i < 91; i++) {
        await middleware(ip1Request);
      }
      expect((await middleware(ip1Request) as NextResponse).status).toBe(429);

      // Second IP should still be able to make requests
      const response = await middleware(ip2Request);
      expect(response.status).toBe(200);
    });

    it('should not rate limit non-API routes', async () => {
      const request = createMockRequest('/some/other/path');

      // Make many requests to non-API route
      for (let i = 0; i < 200; i++) {
        const response = await middleware(request);
        expect(response.status).toBe(200);
      }
    });

    it('should start with a fresh rate limit after reset', async () => {
      const request = createMockRequest('/api/validators');

      // Should be able to make requests right after reset
      for (let i = 0; i < 90; i++) {
        const response = await middleware(request);
        expect(response.status).toBe(200);
      }
    });

    it('should treat same IP with different device fingerprints as separate clients', async () => {
      const ip = '1.2.3.4';
      // Create three different device profiles
      const devices = [
        {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/112.0.0.0',
          'accept-language': 'en-US',
          'sec-ch-ua': '"Chromium";v="112"',
          'sec-ch-ua-platform': '"Windows"',
          'sec-ch-ua-mobile': '?0'
        },
        {
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) Safari/605.1.15',
          'accept-language': 'en-US',
          'sec-ch-ua': '"Safari";v="16"',
          'sec-ch-ua-platform': '"iOS"',
          'sec-ch-ua-mobile': '?1'
        },
        {
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Firefox/98.0',
          'accept-language': 'en-GB',
          'sec-ch-ua': '"Firefox";v="98"',
          'sec-ch-ua-platform': '"macOS"',
          'sec-ch-ua-mobile': '?0'
        }
      ];

      // Each device should get its own rate limit quota
      for (const deviceHeaders of devices) {
        const request = createMockRequest('/api/validators', ip, deviceHeaders);

        // Should be able to make requests up to the limit
        for (let i = 0; i < 90; i++) {
          const response = await middleware(request);
          expect(response.status).toBe(200);
        }

        // Next request should be blocked for this device
        expect((await middleware(request) as NextResponse).status).toBe(429);
      }
    });
  });

  describe('with rate limiting disabled', () => {
    beforeEach(() => {
      // Explicitly set the environment variable to 'false'
      process.env = {
        ...originalEnv,
        RATE_LIMITING_ENABLED: 'false'
      };
      // Clear any existing rate limit data
      resetRateLimitStore();
      // Reset console mocks for each test
      jest.clearAllMocks();
    });

    it('should not rate limit requests when disabled globally', async () => {
      const request = createMockRequest('/api/validators');

      // Make many more requests than normally allowed
      for (let i = 0; i < 100; i++) {
        const response = await middleware(request);
        expect(response instanceof NextResponse).toBe(true);
        expect(response.status).toBe(200);
      }
    });

    it('should not rate limit any endpoints when disabled', async () => {
      const endpoints = ['/api/validators', '/api/dashboard', '/api/other'];

      for (const endpoint of endpoints) {
        const request = createMockRequest(endpoint);

        // Make many more requests than normally allowed
        for (let i = 0; i < 50; i++) {
          const response = await middleware(request);
          expect(response instanceof NextResponse).toBe(true);
          expect(response.status).toBe(200);
        }
      }
    });

    it('should not track metrics when disabled', async () => {
      const request = createMockRequest('/api/validators');

      // Make several requests
      for (let i = 0; i < 31; i++) {
        await middleware(request);
      }

      // Verify no rate limit warnings were logged
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should log requests with rate limiting status', async () => {
      const request = createMockRequest('/api/validators');

      await middleware(request);

      // Verify the log message contains the disabled status
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/.*Disabled.*/)
      );
    });
  });
}); 