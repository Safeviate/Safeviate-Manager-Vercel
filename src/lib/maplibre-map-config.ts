const trimUrl = (value: string | undefined) => value?.trim() || '';

export const MAPLIBRE_BASE_STYLES = {
  light: trimUrl(process.env.NEXT_PUBLIC_MAPLIBRE_LIGHT_STYLE_URL) || 'https://tiles.openfreemap.org/styles/liberty',
  satellite: trimUrl(process.env.NEXT_PUBLIC_MAPLIBRE_SATELLITE_STYLE_URL) || 'https://tiles.openfreemap.org/styles/bright',
} as const;

export const OPENAIP_VECTOR_TILE_URL = trimUrl(process.env.NEXT_PUBLIC_OPENAIP_VECTOR_TILE_URL);
