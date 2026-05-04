'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { MapContainer } from 'react-leaflet';

type LeafletMapFrameProps = {
  center: [number, number];
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  wheelPxPerZoomLevel?: number;
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
  wheelPxPerZoomLevel = 100,
  zoomAnimation,
  preferCanvas,
  className,
  style,
  children,
}: LeafletMapFrameProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const mergedStyle: CSSProperties = {
    ...style,
    touchAction: 'none',
    overscrollBehavior: 'none',
  };

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={minZoom}
      maxZoom={maxZoom}
      scrollWheelZoom
      wheelPxPerZoomLevel={wheelPxPerZoomLevel}
      zoomAnimation={zoomAnimation}
      preferCanvas={preferCanvas}
      className={className ? `${className} cursor-crosshair` : 'cursor-crosshair'}
      style={mergedStyle}
    >
      {children}
    </MapContainer>
  );
}
