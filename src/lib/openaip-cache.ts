'use client';

type OpenAipCacheEntry = {
  expiresAt: number;
  payload: unknown;
};

const memoryCache = new Map<string, OpenAipCacheEntry>();
let lastCacheHit = false;

const getTtlMs = (url: string) => {
  const parsed = new URL(url, 'http://localhost');
  return parsed.searchParams.has('search') ? 5 * 60 * 1000 : 90 * 1000;
};

export function getCachedOpenAipResponse<T>(cacheKey: string): T | null {
  const now = Date.now();
  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    lastCacheHit = true;
    return cached.payload as T;
  }

  if (cached) {
    memoryCache.delete(cacheKey);
  }

  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.sessionStorage.getItem(cacheKey);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as OpenAipCacheEntry;
    if (!parsed?.expiresAt || parsed.expiresAt <= now) {
      window.sessionStorage.removeItem(cacheKey);
      return null;
    }

    memoryCache.set(cacheKey, parsed);
    lastCacheHit = true;
    return parsed.payload as T;
  } catch {
    return null;
  }
}

export function setCachedOpenAipResponse(cacheKey: string, url: string, payload: unknown) {
  const entry: OpenAipCacheEntry = {
    expiresAt: Date.now() + getTtlMs(url),
    payload,
  };

  memoryCache.set(cacheKey, entry);

  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch {
    // Ignore storage failures.
  }
}

export function consumeOpenAipCacheHit() {
  const wasCacheHit = lastCacheHit;
  lastCacheHit = false;
  return wasCacheHit;
}

export function clearOpenAipCache() {
  memoryCache.clear();
  lastCacheHit = false;

  if (typeof window === 'undefined') return;

  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith('safeviate.openaip:')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Ignore storage failures.
  }
}
