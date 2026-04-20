'use client';

import { useCallback, useSyncExternalStore } from 'react';
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

const normalizeHeading = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return null;
  return ((value % 360) + 360) % 360;
};

const smoothHeading = (previous: number | null, next: number | null, alpha = 0.25) => {
  if (next == null) return previous;
  if (previous == null) return next;

  const previousRadians = toRadians(previous);
  const nextRadians = toRadians(next);
  const x = (1 - alpha) * Math.cos(previousRadians) + alpha * Math.cos(nextRadians);
  const y = (1 - alpha) * Math.sin(previousRadians) + alpha * Math.sin(nextRadians);
  return normalizeHeading(toDegrees(Math.atan2(y, x)));
};

const toRadians = (value: number) => (value * Math.PI) / 180;
const toDegrees = (value: number) => (value * 180) / Math.PI;

const calculateDistanceMeters = (
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number
) => {
  const earthRadiusMeters = 6371000;
  const deltaLatitude = toRadians(endLatitude - startLatitude);
  const deltaLongitude = toRadians(endLongitude - startLongitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(startLatitude)) *
      Math.cos(toRadians(endLatitude)) *
      Math.sin(deltaLongitude / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
};

const calculateTrackBearing = (
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number
) => {
  const startLatitudeRadians = toRadians(startLatitude);
  const endLatitudeRadians = toRadians(endLatitude);
  const deltaLongitudeRadians = toRadians(endLongitude - startLongitude);
  const y = Math.sin(deltaLongitudeRadians) * Math.cos(endLatitudeRadians);
  const x =
    Math.cos(startLatitudeRadians) * Math.sin(endLatitudeRadians) -
    Math.sin(startLatitudeRadians) * Math.cos(endLatitudeRadians) * Math.cos(deltaLongitudeRadians);
  return normalizeHeading(toDegrees(Math.atan2(y, x)));
};

type GeolocationSnapshot = Pick<GeolocationState, 'position' | 'error' | 'permissionState' | 'isWatching'>;

const geolocationStore = {
  snapshot: {
    position: null,
    error: null,
    permissionState: 'idle' as PermissionState,
    isWatching: false,
  } as GeolocationSnapshot,
  watchId: null as number | null,
  smoothedHeadingTrue: null as number | null,
  listeners: new Set<() => void>(),
};

const emitGeolocationChange = () => {
  for (const listener of geolocationStore.listeners) {
    listener();
  }
};

const setGeolocationSnapshot = (patch: Partial<GeolocationSnapshot>) => {
  geolocationStore.snapshot = { ...geolocationStore.snapshot, ...patch };
  emitGeolocationChange();
};

const subscribeGeolocationStore = (listener: () => void) => {
  geolocationStore.listeners.add(listener);
  return () => {
    geolocationStore.listeners.delete(listener);
  };
};

const getGeolocationSnapshot = () => geolocationStore.snapshot;

export function useGeolocationTrack(): GeolocationState {
  const snapshot = useSyncExternalStore(subscribeGeolocationStore, getGeolocationSnapshot, getGeolocationSnapshot);

  const stopWatching = useCallback(() => {
    if (geolocationStore.watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(geolocationStore.watchId);
    }
    geolocationStore.watchId = null;
    geolocationStore.smoothedHeadingTrue = null;
    setGeolocationSnapshot({ isWatching: false, position: null });
  }, []);

  const startWatching = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeolocationSnapshot({
        permissionState: 'unsupported',
        error: 'Geolocation is not available in this browser.',
      });
      return;
    }

    if (geolocationStore.watchId !== null) return;

    geolocationStore.smoothedHeadingTrue = null;
    setGeolocationSnapshot({ error: null, isWatching: true, position: null });
    geolocationStore.watchId = navigator.geolocation.watchPosition(
      (geoPosition) => {
        const previousPosition = geolocationStore.snapshot.position;
        const speedKt = metersPerSecondToKnots(geoPosition.coords.speed);
        const browserHeading = normalizeHeading(geoPosition.coords.heading);
        const derivedHeading =
          previousPosition &&
          calculateDistanceMeters(
            previousPosition.latitude,
            previousPosition.longitude,
            geoPosition.coords.latitude,
            geoPosition.coords.longitude
          ) >= 15
            ? calculateTrackBearing(
                previousPosition.latitude,
                previousPosition.longitude,
                geoPosition.coords.latitude,
                geoPosition.coords.longitude
              )
            : null;

        const nextHeading = smoothHeading(
          geolocationStore.smoothedHeadingTrue ?? previousPosition?.headingTrue ?? null,
          derivedHeading ?? browserHeading ?? previousPosition?.headingTrue ?? null
        );
        geolocationStore.smoothedHeadingTrue = nextHeading;

        setGeolocationSnapshot({
          permissionState: 'granted',
          isWatching: true,
          position: {
            latitude: geoPosition.coords.latitude,
            longitude: geoPosition.coords.longitude,
            accuracy: geoPosition.coords.accuracy,
            altitude: geoPosition.coords.altitude,
            speedKt,
            headingTrue: nextHeading,
            timestamp: new Date(geoPosition.timestamp).toISOString(),
          },
        });
      },
      (geoError) => {
        const nextState: Partial<GeolocationSnapshot> = {
          error: geoError.message,
          isWatching: false,
        };
        if (geoError.code === geoError.PERMISSION_DENIED) {
          nextState.permissionState = 'denied';
        }
        setGeolocationSnapshot(nextState);
        stopWatching();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      }
    );
  }, [stopWatching]);

  return {
    position: snapshot.position,
    error: snapshot.error,
    permissionState: snapshot.permissionState,
    isWatching: snapshot.isWatching,
    startWatching,
    stopWatching,
  };
}
