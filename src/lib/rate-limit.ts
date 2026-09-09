type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (b.count >= limit) return { allowed: false, remaining: 0 };
  b.count++;
  return { allowed: true, remaining: limit - b.count };
}

// periodic cleanup to avoid memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
  }, 60_000).unref?.();
}
