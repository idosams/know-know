/**
 * @knowgraph
 * type: module
 * description: Token bucket rate limiter for connector API calls
 * owner: knowgraph-core
 * status: experimental
 * tags: [connector, rate-limiter, throttle, api]
 * context:
 *   business_goal: Prevent API rate limit violations when syncing with external services
 *   domain: connectors
 */

export interface RateLimiter {
  acquire(): Promise<void>;
  tryAcquire(): boolean;
  readonly availableTokens: number;
}

export interface RateLimiterOptions {
  readonly maxTokens: number;
  readonly refillRate: number;
  readonly refillIntervalMs: number;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { maxTokens, refillRate, refillIntervalMs } = options;
  let tokens = maxTokens;
  let lastRefillTime = Date.now();

  function refill(): void {
    const now = Date.now();
    const elapsed = now - lastRefillTime;
    const intervals = Math.floor(elapsed / refillIntervalMs);

    if (intervals > 0) {
      tokens = Math.min(maxTokens, tokens + intervals * refillRate);
      lastRefillTime = now;
    }
  }

  function tryAcquire(): boolean {
    refill();
    if (tokens > 0) {
      tokens--;
      return true;
    }
    return false;
  }

  async function acquire(): Promise<void> {
    if (tryAcquire()) return;

    const waitTime = refillIntervalMs - (Date.now() - lastRefillTime);
    await new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, waitTime)));
    refill();

    if (tokens > 0) {
      tokens--;
      return;
    }

    return acquire();
  }

  return {
    acquire,
    tryAcquire,
    get availableTokens(): number {
      refill();
      return tokens;
    },
  };
}
