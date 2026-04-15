'use client';

import { useMemo } from 'react';
import { useTenantConfig } from './use-tenant-config';

export type MapSettings = {
  id?: string;
  defaultBaseLayer?: 'light' | 'satellite';
  minZoom?: number;
  maxZoom?: number;
  lightTileUrl?: string;
  satelliteTileUrl?: string;
  attribution?: string;
};

const DEFAULT_MAP_SETTINGS: Required<Pick<MapSettings, 'defaultBaseLayer' | 'minZoom' | 'maxZoom'>> = {
  defaultBaseLayer: 'light',
  minZoom: 3,
  maxZoom: 18,
};

export function useMapSettings() {
  const { tenant, isLoading } = useTenantConfig();

  return useMemo(() => {
    const rawSettings = tenant ? (tenant as unknown as Record<string, unknown>)['map-settings'] : null;
    const mapSettings =
      rawSettings && typeof rawSettings === 'object'
        ? (rawSettings as MapSettings)
        : {};
    const minZoom = Number(mapSettings.minZoom);
    const maxZoom = Number(mapSettings.maxZoom);

    return {
      isLoading,
      settings: {
        defaultBaseLayer: mapSettings.defaultBaseLayer ?? DEFAULT_MAP_SETTINGS.defaultBaseLayer,
        minZoom: Number.isFinite(minZoom) ? minZoom : DEFAULT_MAP_SETTINGS.minZoom,
        maxZoom: Number.isFinite(maxZoom) ? maxZoom : DEFAULT_MAP_SETTINGS.maxZoom,
        lightTileUrl: mapSettings.lightTileUrl,
        satelliteTileUrl: mapSettings.satelliteTileUrl,
        attribution: mapSettings.attribution,
      },
    };
  }, [isLoading, tenant]);
}
