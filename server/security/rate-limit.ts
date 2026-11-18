export class RateLimit {
  private entries = new Map<string, { count: number; until: number }>();
  allow(key: string, limit = 15, windowMs = 15 * 60000) {
    const now = Date.now();
    for (const [key, value] of this.entries)
      if (value.until < now) this.entries.delete(key);
    const value = this.entries.get(key) || { count: 0, until: now + windowMs };
    value.count++;
    this.entries.set(key, value);
    return value.count <= limit;
  }
}
