'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { MapContainer, useMap } from 'react-leaflet';

function MapResizeController() {
  const map = useMap();

  useEffect(() => {
    let frameId = 0;

    const refreshMapSize = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        map.invalidateSize(false);
      });
    };

    refreshMapSize();

    const container = map.getContainer();
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(refreshMapSize) : null;
    resizeObserver?.observe(container);
    resizeObserver?.observe(container.parentElement || container);

    window.addEventListener('resize', refreshMapSize);
    window.addEventListener('orientationchange', refreshMapSize);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', refreshMapSize);
      window.removeEventListener('orientationchange', refreshMapSize);
    };
  }, [map]);

  return null;
}

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
  const [instanceKey] = useState(() => `leaflet-map-${Math.random().toString(36).slice(2)}`);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      const map = mapRef.current;
      if (!map) return;

      try {
        map.off();
        map.remove();
      } catch {
        // Ignore teardown noise during dev remounts.
      } finally {
        mapRef.current = null;
      }
    };
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
      key={instanceKey}
      ref={(map) => {
        mapRef.current = map;
      }}
      center={center}
      zoom={zoom}
      minZoom={minZoom}
      maxZoom={maxZoom}
      scrollWheelZoom
      wheelPxPerZoomLevel={wheelPxPerZoomLevel}
      zoomAnimation={zoomAnimation}
      preferCanvas={preferCanvas}
      className={className}
      style={mergedStyle}
    >
      <MapResizeController />
      {children}
    </MapContainer>
  );
}
