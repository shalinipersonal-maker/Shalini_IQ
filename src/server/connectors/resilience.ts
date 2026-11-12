/** Retry, rate-limit and error primitives shared by all connectors. Pure functions — no I/O of their own. */
export class UpstreamError extends Error {
  constructor(message: string, public status: number, public retryAfterMs?: number) {
    super(message);
    this.name = "UpstreamError";
  }
  get retryable() {
    return this.status === 429 || this.status >= 500;
  }
}

export interface RetryOptions { attempts?: number; baseMs?: number; maxMs?: number; sleep?: (ms: number) => Promise<void>; onRetry?: (attempt: number, err: unknown, waitMs: number) => void }

/** Exponential backoff with full jitter. Honours Retry-After when the upstream provides it. Non-retryable errors surface immediately. */
export async function withRetry<T>(fn: (attempt: number) => Promise<T>, o: RetryOptions = {}): Promise<{ value: T; attempts: number }> {
  const { attempts = 4, baseMs = 500, maxMs = 20_000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = o;
  for (let i = 1; ; i++) {
    try {
      return { value: await fn(i), attempts: i };
    } catch (err) {
      const retryable = err instanceof UpstreamError ? err.retryable : false;
      if (!retryable || i >= attempts) throw err;
      const backoff = Math.min(maxMs, baseMs * 2 ** (i - 1));
      const wait = (err as UpstreamError).retryAfterMs ?? Math.random() * backoff;
      o.onRetry?.(i, err, wait);
      await sleep(wait);
    }
  }
}

/** Token-bucket limiter. One instance per connector × tenant × operation (in production: backed by Redis). */
export class TokenBucket {
  private tokens: number;
  private last: number;
  constructor(private ratePerSecond: number, private burst = Math.max(1, Math.ceil(ratePerSecond)), private now: () => number = Date.now) {
    this.tokens = burst;
    this.last = now();
  }
  /** Milliseconds to wait before the next call may proceed (0 = go now). Consumes a token when it returns 0. */
  take(): number {
    const t = this.now();
    this.tokens = Math.min(this.burst, this.tokens + ((t - this.last) / 1000) * this.ratePerSecond);
    this.last = t;
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return 0;
    }
    return Math.ceil(((1 - this.tokens) / this.ratePerSecond) * 1000);
  }
}
