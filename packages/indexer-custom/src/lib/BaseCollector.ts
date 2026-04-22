import express, { Request, Response, Application } from 'express';
import { prisma } from './prisma';
import { createLogger } from '@dashtec/shared-utils';
import { config } from '../config/config';

export interface DependencyStatus {
  status: 'HEALTHY' | 'UNHEALTHY';
  message: string;
  timestamp: string;
}

export interface HealthStatus {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  timestamp: string;
  uptime: number;
  lastSuccessfulRun?: string;
  lastError?: string;
  errorCount: number;
  successCount: number;
  consecutiveErrors: number;
  metrics: {
    averageRunTime?: number;
    lastRunTime?: number;
    totalRuns: number;
  };
  dependencies?: {
    database?: DependencyStatus;
    sourceDatabase?: DependencyStatus;
    rpc?: DependencyStatus;
    api?: DependencyStatus;
  };
}

export interface CollectorMetrics {
  startTime: Date;
  lastSuccessfulRun?: Date;
  lastError?: string;
  lastErrorTime?: Date;
  errorCount: number;
  successCount: number;
  consecutiveErrors: number;
  runTimes: number[];
  isRunning: boolean;
}

/**
 * Base class for all collectors with health check endpoints
 */
export abstract class BaseCollector {
  protected healthServer?: Application;
  protected healthPort: number;
  protected collectorName: string;
  protected metrics: CollectorMetrics;
  protected logger: ReturnType<typeof createLogger>;

  constructor(collectorName: string, portOffset: number = 0) {
    this.collectorName = collectorName;
    this.healthPort = 4000 + portOffset; // Base port 4000
    this.logger = createLogger(collectorName);
    this.metrics = {
      startTime: new Date(),
      errorCount: 0,
      successCount: 0,
      consecutiveErrors: 0,
      runTimes: [],
      isRunning: false,
    };

    this.initHealthServer();
  }

  private initHealthServer(): void {
    this.healthServer = express();
    this.healthServer.use(express.json());

    // Health check endpoint
    this.healthServer.get('/health', async (req: Request, res: Response) => {
      try {
        const healthStatus = await this.getHealthStatus();
        const statusCode = healthStatus.status === 'HEALTHY' ? 200 :
          healthStatus.status === 'DEGRADED' ? 200 : 503;

        res.status(statusCode).json(healthStatus);
      } catch (error) {
        this.logger.error('Health check failed', { error });
        res.status(503).json({
          status: 'UNHEALTHY',
          timestamp: new Date().toISOString(),
          error: 'Health check failed',
        });
      }
    });

    // Metrics endpoint
    this.healthServer.get('/metrics', (req: Request, res: Response) => {
      res.json({
        collector: this.collectorName,
        ...this.metrics,
        uptime: Date.now() - this.metrics.startTime.getTime(),
      });
    });

    // Ready check endpoint
    this.healthServer.get('/ready', (req: Request, res: Response) => {
      const isReady = this.isReady();
      res.status(isReady ? 200 : 503).json({
        ready: isReady,
        collector: this.collectorName,
        timestamp: new Date().toISOString(),
      });
    });

    this.startHealthServer();
  }

  private async startHealthServer(attempt: number = 0): Promise<void> {
    const maxAttempts = 10;
    const currentPort = this.healthPort + attempt;

    if (attempt >= maxAttempts) {
      this.logger.error(`Failed to start health server after ${maxAttempts} attempts`);
      return;
    }

    return new Promise((resolve) => {
      this.healthServer!.listen(currentPort)
        .on('listening', () => {
          this.healthPort = currentPort;
          this.logger.info(`Health check server running on port ${currentPort}`);
          this.logger.info(`Health endpoint: http://localhost:${currentPort}/health`);
          resolve();
        })
        .on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            this.logger.debug(`Port ${currentPort} in use, trying next port...`);
            this.startHealthServer(attempt + 1).then(resolve);
          } else {
            this.logger.error(`Health server error on port ${currentPort}`, { error });
            this.startHealthServer(attempt + 1).then(resolve);
          }
        });
    });
  }

  protected async getHealthStatus(): Promise<HealthStatus> {
    const now = new Date();
    const uptime = now.getTime() - this.metrics.startTime.getTime();

    let status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = 'HEALTHY';

    if (this.metrics.consecutiveErrors >= 5) {
      status = 'UNHEALTHY';
    } else if (this.metrics.consecutiveErrors >= 3) {
      status = 'DEGRADED';
    } else if (this.metrics.consecutiveErrors >= 1) {
      if (this.metrics.lastErrorTime &&
        (now.getTime() - this.metrics.lastErrorTime.getTime()) < 300000) {
        status = 'DEGRADED';
      }
    }

    const averageRunTime = this.metrics.runTimes.length > 0
      ? this.metrics.runTimes.reduce((a, b) => a + b, 0) / this.metrics.runTimes.length
      : undefined;

    return {
      status,
      timestamp: now.toISOString(),
      uptime,
      lastSuccessfulRun: this.metrics.lastSuccessfulRun?.toISOString(),
      lastError: this.metrics.lastError,
      errorCount: this.metrics.errorCount,
      successCount: this.metrics.successCount,
      consecutiveErrors: this.metrics.consecutiveErrors,
      metrics: {
        averageRunTime,
        lastRunTime: this.metrics.runTimes[this.metrics.runTimes.length - 1],
        totalRuns: this.metrics.errorCount + this.metrics.successCount,
      },
      dependencies: await this.checkDependencies(),
    };
  }

  protected recordSuccess(runTime?: number): void {
    this.metrics.successCount++;
    this.metrics.lastSuccessfulRun = new Date();
    this.metrics.consecutiveErrors = 0;
    this.metrics.isRunning = false;

    if (runTime !== undefined) {
      this.metrics.runTimes.push(runTime);
      if (this.metrics.runTimes.length > 100) {
        this.metrics.runTimes = this.metrics.runTimes.slice(-100);
      }
    }

    this.logger.debug(`Recorded successful run. Total: ${this.metrics.successCount}`);
  }

  protected async recordError(error: string | Error): Promise<void> {
    this.metrics.errorCount++;
    this.metrics.consecutiveErrors++;
    this.metrics.lastError = error instanceof Error ? error.message : error;
    this.metrics.lastErrorTime = new Date();
    this.metrics.isRunning = false;

    this.logger.error(`Recorded error. Total: ${this.metrics.errorCount}, consecutive: ${this.metrics.consecutiveErrors}`, {
      error: this.metrics.lastError,
    });

    // Insert error into AppErrorLog
    try {
      await prisma.appErrorLog.create({
        data: {
          error_code: this.collectorName,
          message: this.metrics.lastError,
          stack_trace: error instanceof Error ? error.stack : undefined,
        },
      });
    } catch (dbError) {
      this.logger.error('Failed to insert error into AppErrorLog', { error: dbError });
    }
  }

  protected startRun(): void {
    this.metrics.isRunning = true;
  }

  protected isReady(): boolean {
    return !this.metrics.isRunning && this.metrics.successCount > 0;
  }

  protected async checkDependencies(): Promise<HealthStatus['dependencies']> {
    return {};
  }

  protected async checkDatabaseHealth(): Promise<DependencyStatus> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'HEALTHY',
        message: 'Database connection successful',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Database health check failed', { error });
      return {
        status: 'UNHEALTHY',
        message: `Database check failed: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  protected async checkRpcHealth(rpcUrl: string, method: string = 'eth_blockNumber', params: any[] = []): Promise<DependencyStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const isHealthy = response.ok || response.status === 400;
      return {
        status: isHealthy ? 'HEALTHY' : 'UNHEALTHY',
        message: isHealthy ? 'RPC connection successful' : `RPC returned status ${response.status}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.debug(`RPC health check failed for ${rpcUrl}`, { error });
      return {
        status: 'UNHEALTHY',
        message: `RPC check failed: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  protected async checkHttpHealth(url: string, endpoint: string = '/health'): Promise<DependencyStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${url}${endpoint}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      return {
        status: response.ok ? 'HEALTHY' : 'UNHEALTHY',
        message: response.ok ? 'HTTP check successful' : `HTTP returned status ${response.status}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.debug(`HTTP health check failed for ${url}`, { error });
      return {
        status: 'UNHEALTHY',
        message: `HTTP check failed: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  public getHealthPort(): number {
    return this.healthPort;
  }

  public async shutdown(): Promise<void> {
    if (this.healthServer) {
      this.logger.info('Shutting down health check server...');
    }
  }

  /**
   * Helper to run collector as standalone module with ESM entry point
   */
  public static runAsStandalone<T extends BaseCollector>(
    CollectorClass: new () => T,
    shouldStart?: (collector: T) => boolean
  ): void {
    const isMainModule = import.meta.url === `file://${process.argv[1]}`;

    if (isMainModule) {
      const collector = new CollectorClass();

      // Check if collector should start (e.g., for disabled collectors)
      if (shouldStart && !shouldStart(collector)) {
        console.log(`${collector.collectorName} is disabled. Exiting.`);
        process.exit(0);
      }

      collector.start().catch(error => {
        console.error(`Failed to start ${collector.collectorName}`, error);
        process.exit(1);
      });

      // Graceful shutdown
      const gracefulShutdown = async () => {
        console.log('Received shutdown signal. Shutting down gracefully...');
        await collector.shutdown();
        console.log('Graceful shutdown finished.');
        process.exit(0);
      };

      process.on('SIGINT', gracefulShutdown);
      process.on('SIGTERM', gracefulShutdown);
    }
  }

  public abstract start(): Promise<void>;
  protected abstract collectData(): Promise<void>;
}
