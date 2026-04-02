'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FlightPosition } from '@/types/flight-session';

type PermissionState = 'idle' | 'granted' | 'denied' | 'unsupported';

interface GeolocationState {
  position: FlightPosition | null;
  error: string | null;
  permissionState: PermissionState;
  isWatching: boolean;
  startWatching: () => void;
  stopWatching: () => void;
}

const metersPerSecondToKnots = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return null;
  return value * 1.943844;
};

export function useGeolocationTrack(): GeolocationState {
  const watchIdRef = useRef<number | null>(null);
  const [position, setPosition] = useState<FlightPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>('idle');
  const [isWatching, setIsWatching] = useState(false);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    setIsWatching(false);
  }, []);

  const startWatching = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setPermissionState('unsupported');
      setError('Geolocation is not available in this browser.');
      return;
    }

    if (watchIdRef.current !== null) return;

    setError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (geoPosition) => {
        setPermissionState('granted');
        setIsWatching(true);
        setPosition({
          latitude: geoPosition.coords.latitude,
          longitude: geoPosition.coords.longitude,
          accuracy: geoPosition.coords.accuracy,
          altitude: geoPosition.coords.altitude,
          speedKt: metersPerSecondToKnots(geoPosition.coords.speed),
          headingTrue: geoPosition.coords.heading,
          timestamp: new Date(geoPosition.timestamp).toISOString(),
        });
      },
      (geoError) => {
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setPermissionState('denied');
        }
        setError(geoError.message);
        stopWatching();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );
  }, [stopWatching]);

  useEffect(() => stopWatching, [stopWatching]);

  return {
    position,
    error,
    permissionState,
    isWatching,
    startWatching,
    stopWatching,
  };
}
