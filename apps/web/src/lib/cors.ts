import { NextRequest, NextResponse } from 'next/server';

const allowedOrigins = [
  'https://aldebaranode.xyz',
  'https://www.aldebaranode.xyz',
  'http://localhost:3000', 
  'http://localhost:3001', 
  process.env.APP_URL, 
].filter(Boolean); 

export function corsHeaders(origin: string | null): Record<string, string> {
  // Check if the origin is allowed
  const isAllowed = !origin || allowedOrigins.includes(origin);

  if (isAllowed && origin) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400', // 24 hours
    };
  }

  // Default headers when origin is not allowed or not present
  return {};
}

export function handleCorsPreflightRequest(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers = corsHeaders(origin);

  return new NextResponse(null, {
    status: 200,
    headers: headers,
  });
}

export function addCorsHeaders(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers = corsHeaders(origin);

  // Add CORS headers to the response
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}