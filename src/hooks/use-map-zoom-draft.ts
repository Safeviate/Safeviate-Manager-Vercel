'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MapZoomPreference } from '@/hooks/use-map-zoom-preferences';

type UseMapZoomDraftOptions = {
  minZoom: number;
  maxZoom: number;
  setZoomRange: (next: Partial<MapZoomPreference>) => void;
  saveZoomRange: (next?: Partial<MapZoomPreference>) => void;
};

export function useMapZoomDraft({ minZoom, maxZoom, setZoomRange, saveZoomRange }: UseMapZoomDraftOptions) {
  const [draftMin, setDraftMin] = useState(String(minZoom));
  const [draftMax, setDraftMax] = useState(String(maxZoom));

  useEffect(() => {
    setDraftMin(String(minZoom));
    setDraftMax(String(maxZoom));
  }, [maxZoom, minZoom]);

  const saveDrafts = useCallback(() => {
    const parsed = Number(draftMin);
    const nextMin = Number.isFinite(parsed) ? parsed : minZoom;
    const clampedMin = Math.max(0, Math.min(nextMin, maxZoom));
    const parsedMax = Number(draftMax);
    const nextMax = Number.isFinite(parsedMax) ? parsedMax : maxZoom;
    const clampedMax = Math.max(clampedMin, Math.max(0, nextMax));
    setZoomRange({ minZoom: clampedMin, maxZoom: clampedMax });
    saveZoomRange({ minZoom: clampedMin, maxZoom: clampedMax });
  }, [draftMax, draftMin, maxZoom, minZoom, saveZoomRange, setZoomRange]);

  return {
    draftMin,
    draftMax,
    setDraftMin,
    setDraftMax,
    saveDrafts,
  };
}
