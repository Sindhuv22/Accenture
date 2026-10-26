/**
 * Rate Limiter for API requests and token usage.
 * Tracks requests and estimated tokens in a sliding 60-second window.
 */

export interface RateLimiterConfig {
  maxRequestsPerMinute: number;
  maxTokensPerMinute: number;
  maxConcurrent: number;
}

export const DEFAULT_RATE_LIMITS: RateLimiterConfig = {
  maxRequestsPerMinute: 50,
  maxTokensPerMinute: 100000,
  maxConcurrent: 5
};

interface RequestRecord {
  timestamp: number;
  tokens: number;
}

export class RateLimiter {
  private config: RateLimiterConfig;
  private requestHistory: RequestRecord[] = [];
  private activeRequests = 0;
  private waitQueue: Array<() => void> = [];

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMITS, ...config };
  }

  async acquire(estimatedTokens: number = 1000): Promise<void> {
    if (
      !Number.isFinite(estimatedTokens) ||
      estimatedTokens < 0 ||
      estimatedTokens > this.config.maxTokensPerMinute
    ) {
      throw new Error('Invalid or excessive token estimate');
    }

    await this.waitForSlot();

    try {
      await this.waitForRateLimit(estimatedTokens);
      this.activeRequests++;
      this.requestHistory.push({
        timestamp: Date.now(),
        tokens: estimatedTokens
      });
    } catch (error) {
      const next = this.waitQueue.shift();
      if (next) next();
      throw error;
    }
  }

  release(actualTokens?: number): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);

    if (actualTokens !== undefined && this.requestHistory.length > 0) {
      const last = this.requestHistory[this.requestHistory.length - 1];
      if (last) {
        last.tokens = Math.max(0, actualTokens);
      }
    }

    const next = this.waitQueue.shift();
    if (next) next();
  }

  getStatus(): {
    activeRequests: number;
    requestsInWindow: number;
    tokensInWindow: number;
    availableRequests: number;
    availableTokens: number;
  } {
    this.pruneOldRecords();

    const requestsInWindow = this.requestHistory.length;
    const tokensInWindow = this.requestHistory.reduce(
      (sum, record) => sum + record.tokens,
      0
    );

    return {
      activeRequests: this.activeRequests,
      requestsInWindow,
      tokensInWindow,
      availableRequests: Math.max(
        0,
        this.config.maxRequestsPerMinute - requestsInWindow
      ),
      availableTokens: Math.max(
        0,
        this.config.maxTokensPerMinute - tokensInWindow
      )
    };
  }

  canProceed(estimatedTokens: number = 1000): boolean {
    this.pruneOldRecords();

    const tokensInWindow = this.requestHistory.reduce(
      (sum, record) => sum + record.tokens,
      0
    );

    return (
      this.activeRequests < this.config.maxConcurrent &&
      this.requestHistory.length < this.config.maxRequestsPerMinute &&
      tokensInWindow + estimatedTokens <= this.config.maxTokensPerMinute
    );
  }

  private async waitForSlot(): Promise<void> {
    while (this.activeRequests >= this.config.maxConcurrent) {
      await new Promise<void>(resolve => {
        this.waitQueue.push(resolve);
      });
    }
  }

  private async waitForRateLimit(
    estimatedTokens: number
  ): Promise<void> {
    while (true) {
      this.pruneOldRecords();

      const tokensInWindow = this.requestHistory.reduce(
        (sum, record) => sum + record.tokens,
        0
      );

      const requestLimitReached =
        this.requestHistory.length >= this.config.maxRequestsPerMinute;

      const tokenLimitReached =
        tokensInWindow + estimatedTokens >
        this.config.maxTokensPerMinute;

      if (!requestLimitReached && !tokenLimitReached) {
        return;
      }

      const oldest = this.requestHistory[0];

      if (!oldest) {
        throw new Error('Rate limit cannot be satisfied');
      }

      const waitTime = Math.min(
        5000,
        Math.max(100, oldest.timestamp + 60100 - Date.now())
      );

      await new Promise<void>(resolve => {
        setTimeout(resolve, waitTime);
      });
    }
  }

  private pruneOldRecords(): void {
    const cutoff = Date.now() - 60000;

    this.requestHistory = this.requestHistory.filter(
      record => record.timestamp > cutoff
    );
  }
}

export function withRateLimit<T>(
  rateLimiter: RateLimiter,
  fn: () => Promise<T>,
  estimatedTokens: number = 1000
): Promise<T> {
  return (async () => {
    await rateLimiter.acquire(estimatedTokens);

    try {
      return await fn();
    } finally {
      rateLimiter.release();
    }
  })();
}

export const globalRateLimiter = new RateLimiter();
