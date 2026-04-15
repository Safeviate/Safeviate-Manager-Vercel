'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export type MapZoomPreference = {
  minZoom: number;
  maxZoom: number;
};

type UseMapZoomPreferencesOptions = {
  storageKey: string;
  defaultMinZoom: number;
  defaultMaxZoom: number;
};

const clampZoomPreference = (value: MapZoomPreference, defaults: Required<MapZoomPreference>) => {
  const minZoom = Number.isFinite(value.minZoom) ? value.minZoom : defaults.minZoom;
  const maxZoom = Number.isFinite(value.maxZoom) ? value.maxZoom : defaults.maxZoom;
  return {
    minZoom: Math.max(0, Math.min(minZoom, maxZoom)),
    maxZoom: Math.max(maxZoom, Math.max(0, Math.min(minZoom, maxZoom))),
  };
};

export function useMapZoomPreferences({ storageKey, defaultMinZoom, defaultMaxZoom }: UseMapZoomPreferencesOptions) {
  const defaults = useMemo(() => ({ minZoom: defaultMinZoom, maxZoom: defaultMaxZoom }), [defaultMinZoom, defaultMaxZoom]);
  const [hydrated, setHydrated] = useState(false);
  const [preferences, setPreferences] = useState<MapZoomPreference>(defaults);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<MapZoomPreference>;
        setPreferences(clampZoomPreference({
          minZoom: Number(parsed.minZoom),
          maxZoom: Number(parsed.maxZoom),
        }, defaults));
      } else {
        setPreferences(defaults);
      }
    } catch {
      setPreferences(defaults);
    } finally {
      setHydrated(true);
    }
  }, [defaults, storageKey]);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch {
      // Ignore storage failures.
    }
  }, [hydrated, preferences, storageKey]);

  const update = useCallback((next: Partial<MapZoomPreference>) => {
    setPreferences((current) => clampZoomPreference({ ...current, ...next }, defaults));
  }, [defaults]);

  const save = useCallback((next?: Partial<MapZoomPreference>) => {
    setPreferences((current) => clampZoomPreference({ ...current, ...(next || {}) }, defaults));
  }, [defaults]);

  const reset = useCallback(() => setPreferences(defaults), [defaults]);

  return {
    hydrated,
    preferences,
    setZoomRange: update,
    saveZoomRange: save,
    resetZoomRange: reset,
  };
}
