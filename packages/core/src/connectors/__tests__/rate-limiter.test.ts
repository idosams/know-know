import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter } from '../rate-limiter.js';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('tryAcquire', () => {
    it('succeeds when tokens are available', () => {
      const limiter = createRateLimiter({
        maxTokens: 3,
        refillRate: 1,
        refillIntervalMs: 1000,
      });

      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
    });

    it('fails when no tokens available', () => {
      const limiter = createRateLimiter({
        maxTokens: 1,
        refillRate: 1,
        refillIntervalMs: 1000,
      });

      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(false);
    });

    it('refills tokens after interval', () => {
      const limiter = createRateLimiter({
        maxTokens: 1,
        refillRate: 1,
        refillIntervalMs: 1000,
      });

      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(false);

      vi.advanceTimersByTime(1000);
      expect(limiter.tryAcquire()).toBe(true);
    });

    it('does not exceed maxTokens on refill', () => {
      const limiter = createRateLimiter({
        maxTokens: 2,
        refillRate: 1,
        refillIntervalMs: 1000,
      });

      // Wait a long time without consuming
      vi.advanceTimersByTime(10000);

      // Should still max out at 2
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(false);
    });
  });

  describe('acquire', () => {
    it('resolves immediately when tokens available', async () => {
      const limiter = createRateLimiter({
        maxTokens: 1,
        refillRate: 1,
        refillIntervalMs: 1000,
      });

      await limiter.acquire();
      expect(limiter.availableTokens).toBe(0);
    });

    it('waits for refill when no tokens available', async () => {
      const limiter = createRateLimiter({
        maxTokens: 1,
        refillRate: 1,
        refillIntervalMs: 100,
      });

      // Consume the only token
      limiter.tryAcquire();

      const acquirePromise = limiter.acquire();

      // Advance time to trigger refill
      vi.advanceTimersByTime(100);

      await acquirePromise;
      // If we got here, acquire resolved successfully
      expect(true).toBe(true);
    });
  });

  describe('availableTokens', () => {
    it('returns initial token count', () => {
      const limiter = createRateLimiter({
        maxTokens: 5,
        refillRate: 1,
        refillIntervalMs: 1000,
      });

      expect(limiter.availableTokens).toBe(5);
    });

    it('decreases after tryAcquire', () => {
      const limiter = createRateLimiter({
        maxTokens: 3,
        refillRate: 1,
        refillIntervalMs: 1000,
      });

      limiter.tryAcquire();
      expect(limiter.availableTokens).toBe(2);
    });

    it('refills over time', () => {
      const limiter = createRateLimiter({
        maxTokens: 3,
        refillRate: 1,
        refillIntervalMs: 1000,
      });

      limiter.tryAcquire();
      limiter.tryAcquire();
      limiter.tryAcquire();
      expect(limiter.availableTokens).toBe(0);

      vi.advanceTimersByTime(2000);
      expect(limiter.availableTokens).toBe(2);
    });
  });

  describe('refillRate', () => {
    it('refills multiple tokens per interval', () => {
      const limiter = createRateLimiter({
        maxTokens: 5,
        refillRate: 2,
        refillIntervalMs: 1000,
      });

      // Consume all tokens
      for (let i = 0; i < 5; i++) {
        limiter.tryAcquire();
      }
      expect(limiter.availableTokens).toBe(0);

      vi.advanceTimersByTime(1000);
      expect(limiter.availableTokens).toBe(2);

      vi.advanceTimersByTime(1000);
      expect(limiter.availableTokens).toBe(4);
    });
  });
});
