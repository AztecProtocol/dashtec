/**
 * Error Logger Utility
 * 
 * This module provides functions to log errors to the AppErrorLog schema
 * with proper categorization and error details.
 */

import prisma from '@/lib/prisma';

export interface ErrorLogData {
  error_code: string;
  message: string;
  stack_trace?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an error to the AppErrorLog table
 */
export async function logError(error: Error | string, errorCode: string, metadata?: Record<string, any>): Promise<void> {
  try {
    const message = typeof error === 'string' ? error : error.message;
    const stackTrace = typeof error === 'string' ? undefined : error.stack;

    if (process.env.NODE_ENV === 'development') {
      console.error(error)
    }

    await prisma.appErrorLog.create({
      data: {
        error_code: errorCode,
        message: metadata ? `${message} | Metadata: ${JSON.stringify(metadata)}` : message,
        stack_trace: stackTrace,
      }
    });
  } catch (logError) {
    // If logging fails, at least log to console
    console.error('Failed to log error to database:', logError);
    console.error('Original error:', error);
  }
}

/**
 * Log X OAuth specific errors
 */
export async function logXOAuthError(error: Error | string, step: string, metadata?: Record<string, any>): Promise<void> {
  const errorCode = `X_OAUTH_${step.toUpperCase()}_ERROR`;
  await logError(error, errorCode, {
    step,
    ...metadata
  });
}

/**
 * Log wallet verification errors
 */
export async function logWalletVerificationError(error: Error | string, metadata?: Record<string, any>): Promise<void> {
  await logError(error, 'WALLET_VERIFICATION_ERROR', metadata);
}

/**
 * Log database operation errors
 */
export async function logDatabaseError(error: Error | string, operation: string, metadata?: Record<string, any>): Promise<void> {
  const errorCode = `DB_${operation.toUpperCase()}_ERROR`;
  await logError(error, errorCode, metadata);
}

/**
 * Log session-related errors
 */
export async function logSessionError(error: Error | string, operation: string, metadata?: Record<string, any>): Promise<void> {
  const errorCode = `SESSION_${operation.toUpperCase()}_ERROR`;
  await logError(error, errorCode, metadata);
}

/**
 * Get recent error logs
 */
export async function getRecentErrorLogs(limit: number = 50): Promise<any[]> {
  return await prisma.appErrorLog.findMany({
    orderBy: { created_at: 'desc' },
    take: limit
  });
}

/**
 * Get error logs by error code
 */
export async function getErrorLogsByCode(errorCode: string, limit: number = 50): Promise<any[]> {
  return await prisma.appErrorLog.findMany({
    where: { error_code: errorCode },
    orderBy: { created_at: 'desc' },
    take: limit
  });
} 