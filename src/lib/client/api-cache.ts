'use client';

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const valueCache = new Map<string, CacheEntry<unknown>>();
const inflightCache = new Map<string, Promise<unknown>>();

export async function getOrSetClientApiCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const existing = valueCache.get(key) as CacheEntry<T> | undefined;
  if (existing && existing.expiresAt > now) {
    return existing.value;
  }

  const inflight = inflightCache.get(key) as Promise<T> | undefined;
  if (inflight) {
    return inflight;
  }

  const nextPromise = loader()
    .then((value) => {
      valueCache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
      inflightCache.delete(key);
      return value;
    })
    .catch((error) => {
      inflightCache.delete(key);
      throw error;
    });

  inflightCache.set(key, nextPromise);
  return nextPromise;
}

export function invalidateClientApiCache(key: string) {
  valueCache.delete(key);
  inflightCache.delete(key);
}
