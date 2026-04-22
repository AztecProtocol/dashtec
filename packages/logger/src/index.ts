import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Serialize error for logging
 */
export const serializeError = (error: unknown) =>
  error instanceof Error
    ? { message: error.message, stack: error.stack, name: error.name }
    : error;

const logFormat = printf(({ level, message, timestamp, context, stack, ...meta }) => {
  const contextStr = context ? `[${context}]` : '';

  const metaObj = { ...meta };
  if (metaObj.error) {
    metaObj.error = serializeError(metaObj.error);
  }

  const replacer = (_key: string, value: any) =>
    typeof value === 'bigint' ? value.toString() : value;

  const metaStr = Object.keys(metaObj).length > 0 ? ` ${JSON.stringify(metaObj, replacer)}` : '';
  const stackStr = stack ? ` ${stack}` : '';

  return `${timestamp} ${level} ${contextStr} ${message}${metaStr}${stackStr}`;
});

/**
 * Create a Winston logger instance
 */
export const createLogger = (context?: string) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
      errors({ stack: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    ),
    defaultMeta: context ? { context } : undefined,
    transports: [
      new winston.transports.Console({
        format: combine(
          colorize(),
          logFormat
        ),
      }),
    ],
  });
};

/**
 * Default logger instance
 */
export const logger = createLogger();
