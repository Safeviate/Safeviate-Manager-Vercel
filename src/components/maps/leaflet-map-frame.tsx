'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { MapContainer } from 'react-leaflet';

type LeafletMapFrameProps = {
  center: [number, number];
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  zoomAnimation?: boolean;
  preferCanvas?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export function LeafletMapFrame({
  center,
  zoom,
  minZoom,
  maxZoom,
  zoomAnimation,
  preferCanvas,
  className,
  style,
  children,
}: LeafletMapFrameProps) {
  const mapKey = `${minZoom ?? 'min'}-${maxZoom ?? 'max'}`;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <MapContainer
      key={mapKey}
      center={center}
      zoom={zoom}
      minZoom={minZoom}
      maxZoom={maxZoom}
      scrollWheelZoom
      zoomAnimation={zoomAnimation}
      preferCanvas={preferCanvas}
      className={className}
      style={style}
    >
      {children}
    </MapContainer>
  );
}
