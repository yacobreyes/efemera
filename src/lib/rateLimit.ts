const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(ip: string, key: string, limit: number, windowMs: number): boolean {
  const id = `${key}:${ip}`;
  const now = Date.now();
  // Prune expired entries to prevent unbounded memory growth
  for (const [k, v] of hits) { if (now > v.reset) hits.delete(k); }
  const entry = hits.get(id);
  if (!entry || now > entry.reset) {
    hits.set(id, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}
