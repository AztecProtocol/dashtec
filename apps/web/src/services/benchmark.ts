import { performance } from 'perf_hooks';

/**
 * Benchmark service for tracking API performance
 * Provides chainable API for measuring operation durations
 */
export class Benchmark {
  private startTime: number;
  private marks: Map<string, number> = new Map();
  private results: Map<string, number> = new Map();

  constructor() {
    this.startTime = performance.now();
  }

  /**
   * Start timing a named operation
   */
  start(name: string): this {
    this.marks.set(name, performance.now());
    return this;
  }

  /**
   * End timing a named operation and record result
   */
  end(name: string): this {
    const startMark = this.marks.get(name);
    if (!startMark) {
      console.warn(`Benchmark: No start mark found for "${name}"`);
      return this;
    }

    const duration = performance.now() - startMark;
    this.results.set(name, duration);
    this.marks.delete(name);
    return this;
  }

  /**
   * Get total duration since benchmark creation
   */
  getTotal(): number {
    return performance.now() - this.startTime;
  }

  /**
   * Get duration for a specific benchmark
   */
  get(name: string): number | undefined {
    return this.results.get(name);
  }

  /**
   * Get formatted results for API response
   */
  getResults(): {
    total: string;
    details: Record<string, string>;
  } {
    const total = this.getTotal();
    const details: Record<string, string> = {};

    for (const [name, duration] of this.results.entries()) {
      details[name] = `${duration.toFixed(2)}ms`;
    }

    return {
      total: `${total.toFixed(2)}ms`,
      details,
    };
  }

  /**
   * Get raw results (useful for further processing)
   */
  getRaw(): {
    total: number;
    details: Record<string, number>;
  } {
    const total = this.getTotal();
    const details: Record<string, number> = {};

    for (const [name, duration] of this.results.entries()) {
      details[name] = duration;
    }

    return {
      total,
      details,
    };
  }
}

/**
 * Create a new benchmark instance
 */
export function createBenchmark(): Benchmark {
  return new Benchmark();
}
