'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Layers3, Loader2, PlaneTakeoff, Settings2, SlidersHorizontal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTenantConfig } from '@/hooks/use-tenant-config';
import type { Aircraft } from '@/types/aircraft';
import type { Booking } from '@/types/booking';
import type { FlightPosition, FlightSession } from '@/types/flight-session';
import { getOrCreateDeviceBinding, setDeviceLabel } from '@/lib/flight-session';
import { useGeolocationTrack } from '@/hooks/use-geolocation-track';
import { getActiveLegState } from '@/lib/active-flight';
import { isHrefEnabledForIndustry, shouldBypassIndustryRestrictions } from '@/lib/industry-access';
import { cn } from '@/lib/utils';
import { HEADER_ACTION_BUTTON_CLASS, HEADER_SECONDARY_BUTTON_CLASS, MainPageHeader } from '@/components/page-header';

const BREADCRUMB_SAMPLE_MS = 15000;
const MAX_BREADCRUMB_POINTS = 60;
const FLIGHT_SESSION_OUTBOX_PREFIX = 'safeviate:active-flight-session-outbox:';
const ACTIVE_TRACKING_STATE_PREFIX = 'safeviate:active-flight-tracking-state:';
const ACTIVE_TRACKING_SELECTION_PREFIX = 'safeviate:active-flight-selection:';

interface ActiveTrackingState {
  active: true;
  aircraftId: string;
  bookingId?: string;
  savedAt: string;
}

interface ActiveTrackingSelection {
  aircraftId: string;
  bookingId: string;
}

const ActiveFlightLiveMap = dynamic(() => import('@/components/active-flight/active-flight-live-map').then((module) => module.ActiveFlightLiveMap), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed bg-slate-950 px-6 py-12 text-center text-slate-100">
      <div className="space-y-4">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-400" />
        <p className="text-sm font-black uppercase tracking-widest">Loading Pilot Map</p>
      </div>
    </div>
  ),
});

const getFlightSessionOutboxKey = (deviceId: string) => `${FLIGHT_SESSION_OUTBOX_PREFIX}${deviceId}`;
const getActiveTrackingStateKey = (deviceId: string) => `${ACTIVE_TRACKING_STATE_PREFIX}${deviceId}`;
const getActiveTrackingSelectionKey = (deviceId: string) => `${ACTIVE_TRACKING_SELECTION_PREFIX}${deviceId}`;

const readQueuedFlightSession = (deviceId: string) => {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(getFlightSessionOutboxKey(deviceId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as FlightSession;
  } catch {
    window.localStorage.removeItem(getFlightSessionOutboxKey(deviceId));
    return null;
  }
};

const queueFlightSessionSave = (session: FlightSession) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getFlightSessionOutboxKey(session.deviceId), JSON.stringify(session));
};

const clearQueuedFlightSession = (deviceId: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(getFlightSessionOutboxKey(deviceId));
};

const readActiveTrackingState = (deviceId: string) => {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(getActiveTrackingStateKey(deviceId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ActiveTrackingState;
  } catch {
    window.localStorage.removeItem(getActiveTrackingStateKey(deviceId));
    return null;
  }
};

const saveActiveTrackingState = (deviceId: string, state: ActiveTrackingState) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getActiveTrackingStateKey(deviceId), JSON.stringify(state));
};

const clearActiveTrackingState = (deviceId: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(getActiveTrackingStateKey(deviceId));
};

const readActiveTrackingSelection = (deviceId: string) => {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(getActiveTrackingSelectionKey(deviceId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ActiveTrackingSelection;
  } catch {
    window.localStorage.removeItem(getActiveTrackingSelectionKey(deviceId));
    return null;
  }
};

const saveActiveTrackingSelection = (deviceId: string, selection: ActiveTrackingSelection) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getActiveTrackingSelectionKey(deviceId), JSON.stringify(selection));
};

const getResumeTimestamp = (session: ActiveTrackingState | FlightSession) =>
  ('updatedAt' in session && session.updatedAt) ||
  ('savedAt' in session && session.savedAt) ||
  ('startedAt' in session && session.startedAt) ||
  'resume';

export default function ActiveFlightPage() {
  const { toast } = useToast();
  const { tenantId, userProfile, isLoading: isUserLoading } = useUserProfile();
  const { tenant, isLoading: isTenantLoading } = useTenantConfig();
  const [selectedAircraftId, setSelectedAircraftId] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [deviceLabelInput, setDeviceLabelInput] = useState('');
  const [savedDeviceLabel, setSavedDeviceLabel] = useState('');
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [aircrafts, setAircrafts] = useState<Aircraft[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [flightSessions, setFlightSessions] = useState<FlightSession[]>([]);
  const [sessionSetupOpen, setSessionSetupOpen] = useState(false);
  const [showLayerSelectorOpen, setShowLayerSelectorOpen] = useState(false);
  const [showLayerLevelsOpen, setShowLayerLevelsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [hasQueuedSession, setHasQueuedSession] = useState(false);
  const selectionHydratedRef = useRef<string | null>(null);
  const resumeHydratedRef = useRef<string | null>(null);
  const lastWriteRef = useRef(0);
  const { position, error: geolocationError, permissionState, isWatching, startWatching, stopWatching } = useGeolocationTrack();
  useEffect(() => {
    const binding = getOrCreateDeviceBinding();
    if (!binding) return;
    setSavedDeviceLabel(binding.deviceLabel || '');
    setDeviceLabelInput(binding.deviceLabel || '');
  }, []);

  useEffect(() => {
    const load = async () => {
      const [aircraftRes, bookingsRes, sessionsRes] = await Promise.all([
        fetch('/api/aircraft', { cache: 'no-store' }),
        fetch('/api/bookings', { cache: 'no-store' }),
        fetch('/api/flight-sessions', { cache: 'no-store' }),
      ]);
      if (aircraftRes.ok) {
        const data = await aircraftRes.json().catch(() => ({ aircraft: [] }));
        setAircrafts(Array.isArray(data.aircraft) ? data.aircraft : []);
      }
      if (bookingsRes.ok) {
        const data = await bookingsRes.json().catch(() => ({ bookings: [] }));
        setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      }
      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setFlightSessions(Array.isArray(data.sessions) ? data.sessions : []);
      }
    };
    void load();
  }, []);

  const reloadFlightSessions = async () => {
    const response = await fetch('/api/flight-sessions', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    setFlightSessions(Array.isArray(data.sessions) ? data.sessions : []);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncConnectivityState = () => {
      setIsOnline(window.navigator.onLine);
    };

    const syncQueuedSessionState = () => {
      const binding = getOrCreateDeviceBinding();
      if (!binding?.deviceId) {
        setHasQueuedSession(false);
        return;
      }

      setHasQueuedSession(Boolean(readQueuedFlightSession(binding.deviceId)));
    };

    syncConnectivityState();
    syncQueuedSessionState();

    window.addEventListener('online', syncConnectivityState);
    window.addEventListener('offline', syncConnectivityState);
    window.addEventListener('storage', syncQueuedSessionState);

    return () => {
      window.removeEventListener('online', syncConnectivityState);
      window.removeEventListener('offline', syncConnectivityState);
      window.removeEventListener('storage', syncQueuedSessionState);
    };
  }, []);

  const deviceBinding = useMemo(() => getOrCreateDeviceBinding(), []);
  const sortedAircraft = useMemo(() => [...aircrafts].sort((a, b) => a.tailNumber.localeCompare(b.tailNumber)), [aircrafts]);
  const selectedAircraft = useMemo(() => sortedAircraft.find((aircraft) => aircraft.id === selectedAircraftId) || null, [selectedAircraftId, sortedAircraft]);
  const candidateBookings = useMemo(() => bookings.filter((booking) => !selectedAircraftId || booking.aircraftId === selectedAircraftId).filter((booking) => (booking.navlog?.legs?.length || 0) > 0).sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()), [bookings, selectedAircraftId]);
  const selectedBooking = useMemo(() => candidateBookings.find((booking) => booking.id === selectedBookingId) || null, [candidateBookings, selectedBookingId]);
  const selectedAircraftValue = selectedAircraft ? selectedAircraftId : undefined;
  const selectedBookingValue = selectedBooking ? selectedBookingId : undefined;
  const selectedLegs = selectedBooking?.navlog?.legs || [];
  const activeLegState = useMemo(() => getActiveLegState(selectedLegs, position), [selectedLegs, position]);
  const pilotName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Pilot';
  const liveTelemetry = {
    speed: activeLegState?.groundSpeedKt ?? position?.speedKt ?? null,
    altitude: position?.altitude ?? null,
    heading: position?.headingTrue ?? null,
    trailPoints: flightSessions.find((session) => session.deviceId === deviceBinding?.deviceId)?.breadcrumb?.length ?? (position ? 1 : 0),
  };
  const syncStatusLabel = hasQueuedSession ? 'Queued for Sync' : isOnline ? 'Online' : 'Offline';
  const syncStatusClassName = hasQueuedSession
    ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50'
    : isOnline
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50'
      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-50';

  const conflictingAircraftSession = useMemo(() => {
    if (!selectedAircraft || !deviceBinding?.deviceId) return null;
    return flightSessions.find((session) => session.status === 'active' && session.aircraftId === selectedAircraft.id && session.deviceId !== deviceBinding.deviceId) || null;
  }, [deviceBinding?.deviceId, flightSessions, selectedAircraft]);

  const handleAircraftSelectionChange = (aircraftId: string) => {
    setSelectedAircraftId(aircraftId);
    if (!deviceBinding?.deviceId) return;
    const nextBooking = bookings.find((booking) => booking.aircraftId === aircraftId && (booking.navlog?.legs?.length || 0) > 0) || null;
    const bookingId = nextBooking?.id || '';
    setSelectedBookingId(bookingId);
    saveActiveTrackingSelection(deviceBinding.deviceId, { aircraftId, bookingId });
  };

  const handleBookingSelectionChange = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    if (!deviceBinding?.deviceId) return;
    saveActiveTrackingSelection(deviceBinding.deviceId, {
      aircraftId: selectedAircraftId,
      bookingId,
    });
  };

  useEffect(() => {
    if (!deviceBinding?.deviceId) return;
    if (selectionHydratedRef.current === deviceBinding.deviceId) return;
    selectionHydratedRef.current = deviceBinding.deviceId;

    const savedSelection = readActiveTrackingSelection(deviceBinding.deviceId);
    if (!savedSelection) return;

    if (savedSelection.aircraftId) {
      setSelectedAircraftId(savedSelection.aircraftId);
    }

    if (savedSelection.bookingId) {
      setSelectedBookingId(savedSelection.bookingId);
    }
  }, [deviceBinding?.deviceId]);

  useEffect(() => {
    if (!selectedAircraftId) return;
    if (selectedAircraft) return;
    setSelectedAircraftId('');
  }, [selectedAircraft, selectedAircraftId]);

  useEffect(() => {
    if (!selectedBookingId) return;
    if (selectedBooking) return;
    setSelectedBookingId('');
  }, [selectedBooking, selectedBookingId]);

  useEffect(() => {
    if (!deviceBinding?.deviceId) return;

    const serverSession = flightSessions.find((session) => session.deviceId === deviceBinding.deviceId && session.status === 'active') || null;
    const persistedState = readActiveTrackingState(deviceBinding.deviceId);
    const resumeSource = serverSession || persistedState;
    if (!resumeSource) return;

    const resumeKey = `${deviceBinding.deviceId}:${getResumeTimestamp(resumeSource)}`;
    if (resumeHydratedRef.current === resumeKey) return;
    resumeHydratedRef.current = resumeKey;

    if (resumeSource.aircraftId && resumeSource.aircraftId !== selectedAircraftId) {
      setSelectedAircraftId(resumeSource.aircraftId);
    }

    if (resumeSource.bookingId && resumeSource.bookingId !== selectedBookingId) {
      setSelectedBookingId(resumeSource.bookingId);
    }

    if (!isTrackingActive) {
      setIsTrackingActive(true);
      startWatching();
    }
  }, [deviceBinding?.deviceId, flightSessions, isTrackingActive, selectedAircraftId, selectedBookingId, startWatching]);

  const buildBreadcrumb = (existing: FlightPosition[] | undefined, nextPosition: FlightPosition | null) => {
    if (!nextPosition) return existing || [];
    const trail = Array.isArray(existing) ? [...existing] : [];
    const lastPoint = trail[trail.length - 1];
    if (!lastPoint) {
      return [nextPosition];
    }

    const lastTime = new Date(lastPoint.timestamp).getTime();
    const nextTime = new Date(nextPosition.timestamp).getTime();
    if (!Number.isNaN(lastTime) && !Number.isNaN(nextTime) && nextTime - lastTime < BREADCRUMB_SAMPLE_MS) {
      return trail;
    }

    trail.push(nextPosition);
    return trail.slice(-MAX_BREADCRUMB_POINTS);
  };

  useEffect(() => {
    if (!deviceBinding?.deviceId || typeof window === 'undefined') return;

    const flushQueuedSession = async () => {
      if (!navigator.onLine) return;

      const queuedSession = readQueuedFlightSession(deviceBinding.deviceId);
      if (!queuedSession) return;

      try {
        const response = await fetch('/api/flight-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: queuedSession }),
        });

        if (response.ok) {
          clearQueuedFlightSession(deviceBinding.deviceId);
        }
      } catch {
        // Keep the queued session until the browser regains connectivity.
      }
    };

    void flushQueuedSession();

    const handleOnline = () => {
      void flushQueuedSession();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [deviceBinding?.deviceId]);

  useEffect(() => {
    if (!isTrackingActive || !position || !selectedAircraft || !deviceBinding) return;
    const now = Date.now();
    if (now - lastWriteRef.current < 5000) return;
    lastWriteRef.current = now;
    const existingSession = flightSessions.find((session) => session.deviceId === deviceBinding.deviceId);
    const startedAt = existingSession?.startedAt || new Date().toISOString();
    const nextSession: FlightSession = {
      id: deviceBinding.deviceId,
      pilotId: userProfile?.id || 'unknown',
      pilotName,
      aircraftId: selectedAircraft.id,
      aircraftRegistration: selectedAircraft.tailNumber,
      bookingId: selectedBooking?.id || '',
      status: 'active',
      deviceId: deviceBinding.deviceId,
      deviceLabel: savedDeviceLabel || deviceBinding.deviceLabel || '',
      activeLegIndex: activeLegState?.activeLegIndex ?? 0,
      startedAt,
      updatedAt: new Date().toISOString(),
      lastPosition: position,
      breadcrumb: buildBreadcrumb(existingSession?.breadcrumb, position),
      distanceToNextNm: activeLegState?.distanceToNextNm,
      bearingToNext: activeLegState?.bearingToNext,
      etaToNextMinutes: activeLegState?.etaToNextMinutes,
      crossTrackErrorNm: activeLegState?.crossTrackErrorNm,
      onCourse: activeLegState?.onCourse,
      groundSpeedKt: activeLegState?.groundSpeedKt ?? position.speedKt ?? undefined,
    };
    const next = [...flightSessions.filter((session) => session.deviceId !== deviceBinding.deviceId), nextSession];
    void persistSessions(next);
  }, [activeLegState, deviceBinding, flightSessions, isTrackingActive, pilotName, position, savedDeviceLabel, selectedAircraft, selectedBooking?.id, userProfile?.id]);

  const persistSessions = async (next: FlightSession[]) => {
    setFlightSessions(next);
    const current = next[next.length - 1];
    if (!current) return;
    try {
      const response = await fetch('/api/flight-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: current }),
      });

      if (response.status === 423) {
        setIsTrackingActive(false);
        stopWatching();
        if (deviceBinding?.deviceId) {
          clearActiveTrackingState(deviceBinding.deviceId);
        }
        toast({ variant: 'destructive', title: 'Tracking Ended By Ops', description: 'This device was cleared from fleet operations. Start tracking again to rejoin.' });
        await reloadFlightSessions();
        return;
      }

      if (!response.ok) {
        queueFlightSessionSave(current);
        setHasQueuedSession(true);
        return;
      }

      clearQueuedFlightSession(current.deviceId);
      setHasQueuedSession(false);
    } catch {
      queueFlightSessionSave(current);
      setHasQueuedSession(true);
    }
  };

  const startTracking = () => {
    if (!selectedAircraft || !deviceBinding) return;
    if (conflictingAircraftSession) {
      toast({ variant: 'destructive', title: 'Aircraft Already In Use', description: `${selectedAircraft.tailNumber} is already active on another device.` });
      return;
    }
    void fetch(`/api/flight-sessions?id=${deviceBinding.deviceId}&mode=unblock`, { method: 'DELETE' });
    saveActiveTrackingState(deviceBinding.deviceId, {
      active: true,
      aircraftId: selectedAircraft.id,
      bookingId: selectedBooking?.id,
      savedAt: new Date().toISOString(),
    });
    saveActiveTrackingSelection(deviceBinding.deviceId, {
      aircraftId: selectedAircraft.id,
      bookingId: selectedBooking?.id || '',
    });
    setIsTrackingActive(true);
    lastWriteRef.current = 0;
    void persistSessions(flightSessions.filter((session) => session.deviceId !== deviceBinding.deviceId).concat({
      id: deviceBinding.deviceId,
      pilotId: userProfile?.id || 'unknown',
      pilotName,
      aircraftId: selectedAircraft.id,
      aircraftRegistration: selectedAircraft.tailNumber,
      bookingId: selectedBooking?.id || '',
      status: 'active',
      deviceId: deviceBinding.deviceId,
      deviceLabel: savedDeviceLabel || deviceBinding.deviceLabel || '',
      activeLegIndex: activeLegState?.activeLegIndex ?? 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      breadcrumb: position ? buildBreadcrumb([], position) : [],
    }));
    startWatching();
  };

  const stopTrackingSession = () => {
    stopWatching();
    setIsTrackingActive(false);
    if (!deviceBinding) return;
    clearActiveTrackingState(deviceBinding.deviceId);
    void persistSessions(flightSessions.map((session) => session.deviceId === deviceBinding.deviceId ? { ...session, status: 'completed', endedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : session));
  };

  function LegacyFullscreenFlightLayout({ children: _children }: { children?: unknown }) {
    /*
      <div className="grid h-full min-h-0 grid-rows-[1fr] gap-3 md:grid-rows-[auto,minmax(44vh,1fr),auto]">
        <div className="hidden rounded-2xl border border-slate-800 bg-slate-900/95 px-4 py-3 shadow-[0_20px_40px_rgba(15,23,42,0.28)] md:block">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border border-slate-700 bg-slate-800 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-100 hover:bg-slate-800">
                  {isTrackingActive ? 'Tracking active' : 'Tracking idle'}
                </Badge>
                <Badge className={cn('px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]', syncStatusClassName)}>
                  {syncStatusLabel}
                </Badge>
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
                {selectedBooking
                  ? `Route ${selectedBooking.bookingNumber} • ${selectedLegs.length} legs • ${activeLegState?.toWaypoint || 'No active waypoint'}`
                  : 'Select a booking with a navlog to show route progress'}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">TRK</p>
                <p className="mt-1 text-sm font-black text-slate-100">{liveTelemetry.heading != null ? `${liveTelemetry.heading.toFixed(0)}°` : 'N/A'}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">SPD</p>
                <p className="mt-1 text-sm font-black text-slate-100">{liveTelemetry.speed != null ? `${liveTelemetry.speed.toFixed(0)} kt` : 'N/A'}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ALT</p>
                <p className="mt-1 text-sm font-black text-slate-100">{liveTelemetry.altitude != null ? `${Math.round(liveTelemetry.altitude)} m` : 'N/A'}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">TRK</p>
                <p className="mt-1 text-sm font-black text-slate-100">{liveTelemetry.trailPoints} pts</p>
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 overflow-hidden rounded-2xl border border-slate-800 bg-black shadow-[0_22px_50px_rgba(15,23,42,0.35)] md:rounded-2xl">
          <ActiveFlightLiveMap
            booking={selectedBooking}
            legs={selectedLegs}
            position={position}
            aircraftRegistration={selectedAircraft?.tailNumber}
            activeLegIndex={activeLegState?.activeLegIndex}
            activeLegState={activeLegState}
          />
        </div>

        <div className="hidden max-h-[28vh] gap-3 overflow-y-auto pb-1 md:grid lg:grid-cols-[1.1fr_0.9fr_0.9fr]">
          <Card className="border border-slate-800 bg-slate-900/95 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-100">Route Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {activeLegState ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">From</p>
                      <p className="mt-1 font-black text-slate-100">{activeLegState.fromWaypoint || 'N/A'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">To</p>
                      <p className="mt-1 font-black text-slate-100">{activeLegState.toWaypoint || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dist</p>
                      <p className="mt-1 font-black text-slate-100">{activeLegState.distanceToNextNm != null ? `${activeLegState.distanceToNextNm.toFixed(1)} NM` : 'N/A'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Brg</p>
                      <p className="mt-1 font-black text-slate-100">{activeLegState.bearingToNext != null ? `${activeLegState.bearingToNext.toFixed(0)}°` : 'N/A'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">XTK</p>
                      <p className="mt-1 font-black text-slate-100">{activeLegState.crossTrackErrorNm != null ? `${activeLegState.crossTrackErrorNm.toFixed(1)} NM` : 'N/A'}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/70 p-4 text-slate-300">
                  Select a booking with a navlog and start tracking to populate route progress.
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border border-slate-800 bg-slate-900/95 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-100">Telemetry</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Track</p>
                <p className="mt-1 text-sm font-black text-slate-100">{liveTelemetry.heading != null ? `${liveTelemetry.heading.toFixed(0)}°` : 'N/A'}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Speed</p>
                <p className="mt-1 text-sm font-black text-slate-100">{liveTelemetry.speed != null ? `${liveTelemetry.speed.toFixed(0)} kt` : 'N/A'}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Altitude</p>
                <p className="mt-1 text-sm font-black text-slate-100">{liveTelemetry.altitude != null ? `${Math.round(liveTelemetry.altitude)} m` : 'N/A'}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Breadcrumb</p>
                <p className="mt-1 text-sm font-black text-slate-100">{liveTelemetry.trailPoints} pts</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-800 bg-slate-900/95 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-100">Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Device</p>
                <p className="mt-1 font-black text-slate-100">{savedDeviceLabel || 'Unnamed device'}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sync</p>
                <p className="mt-1 font-black text-slate-100">{syncStatusLabel}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Map Mode</p>
                <p className="mt-1 font-black text-slate-100">{activeLegState ? 'Route Follow' : 'Ownship Follow'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    */
    return (
      <div className="relative h-full min-h-0 overflow-hidden bg-black">
        <ActiveFlightLiveMap
          booking={selectedBooking}
          legs={selectedLegs}
          position={position}
          aircraftRegistration={selectedAircraft?.tailNumber}
          activeLegIndex={activeLegState?.activeLegIndex}
          activeLegState={activeLegState}
          fullscreen
        />
      </div>
    );
  }

  const canAccessActiveFlight = shouldBypassIndustryRestrictions(tenant?.id) || isHrefEnabledForIndustry('/operations/active-flight', tenant?.industry) || (tenant?.enabledMenus?.includes('/operations/active-flight') ?? false);

  if (isTenantLoading) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md border shadow-none">
          <CardContent className="flex items-center gap-3 p-6">
            <Loader2 className="h-5 w-5 animate-spin text-sky-500" />
            <div className="space-y-1">
              <p className="text-sm font-black uppercase tracking-widest">Loading Active Flight</p>
              <p className="text-sm text-muted-foreground">Resolving tenant access...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canAccessActiveFlight) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-lg border shadow-none">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tight">Active Flight Unavailable</CardTitle>
            <CardDescription>This tenant does not have access to the active flight screen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your current company setup does not include this module. An administrator can enable it from Page Format if needed.
            </p>
            <Button asChild variant="outline" className="font-black uppercase">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden px-1">
        <Card className="flex h-full flex-col overflow-hidden border shadow-none">
          <div className="sticky top-0 z-30 border-b bg-card">
            <MainPageHeader title="Active Flight" />
          </div>
          <CardContent className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/5 p-0">
            <div className="sticky top-0 z-20 border-b bg-background px-4 py-3 md:px-6">
              <div className="flex flex-wrap items-end justify-end gap-2" aria-label="Active flight action bar">
                <div className="hidden flex-wrap items-end justify-end gap-2 md:flex">
                  <Button type="button" variant="outline" className="h-10 gap-2 border bg-background/90 px-4 text-[10px] font-black uppercase tracking-widest shadow-sm backdrop-blur" onClick={() => setSessionSetupOpen(true)}>
                    <Settings2 className="h-4 w-4" />
                    Session Setup
                  </Button>
                  <Button type="button" variant="outline" className="h-10 gap-2 border bg-background/90 px-4 text-[10px] font-black uppercase tracking-widest shadow-sm backdrop-blur" onClick={() => setShowLayerSelectorOpen((current) => !current)}>
                    <Layers3 className="h-4 w-4" />
                    Layers
                  </Button>
                  <Button type="button" variant="outline" className="h-10 gap-2 border bg-background/90 px-4 text-[10px] font-black uppercase tracking-widest shadow-sm backdrop-blur" onClick={() => setShowLayerLevelsOpen((current) => !current)}>
                    <SlidersHorizontal className="h-4 w-4" />
                    Map Zoom
                  </Button>
                  <Button asChild className={HEADER_ACTION_BUTTON_CLASS}>
                    <Link href="/operations/fleet-tracker">
                      <PlaneTakeoff size={14} className="mr-2" />
                      Fleet Tracker
                    </Link>
                  </Button>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 w-full justify-between rounded-xl border-slate-300 bg-background px-4 text-sm font-medium shadow-sm hover:bg-muted md:hidden">
                      <span className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        Actions
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]">
                    <DropdownMenuItem onClick={() => setSessionSetupOpen(true)}>
                      <Settings2 className="mr-2 h-4 w-4" /> Session Setup
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowLayerSelectorOpen((current) => !current)}>
                      <Layers3 className="mr-2 h-4 w-4" /> {showLayerSelectorOpen ? 'Hide Layers' : 'Show Layers'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowLayerLevelsOpen((current) => !current)}>
                      <SlidersHorizontal className="mr-2 h-4 w-4" /> {showLayerLevelsOpen ? 'Hide Map Zoom' : 'Show Map Zoom'}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/operations/fleet-tracker">
                        <PlaneTakeoff className="mr-2 h-4 w-4" /> Fleet Tracker
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <div className="absolute inset-0">
                <ActiveFlightLiveMap
                  booking={selectedBooking}
                  legs={selectedLegs}
                  position={position}
                  aircraftRegistration={selectedAircraft?.tailNumber}
                  activeLegIndex={activeLegState?.activeLegIndex}
                  activeLegState={activeLegState}
                  compactLayout
                  layerSelectorOpen={showLayerSelectorOpen}
                  layerLevelsOpen={showLayerLevelsOpen}
                  onLayerSelectorOpenChange={setShowLayerSelectorOpen}
                  onLayerLevelsOpenChange={setShowLayerLevelsOpen}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={sessionSetupOpen} onOpenChange={setSessionSetupOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest">Session Setup</DialogTitle>
            <DialogDescription>Choose which aircraft this device is broadcasting as.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Signed-In Pilot</p>
                <p className="mt-2 text-sm font-black uppercase">{isUserLoading ? 'Loading profile...' : pilotName}</p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{tenantId ? `Tenant: ${tenantId}` : 'Tenant not resolved yet'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Device Binding</p>
                <p className="mt-2 break-all text-xs font-mono font-bold">{deviceBinding?.deviceId || 'Generating local device id...'}</p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Browser-backed session identity for this phone or tablet</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="device-label-input" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Device Label</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input id="device-label-input" value={deviceLabelInput} onChange={(event) => setDeviceLabelInput(event.target.value)} placeholder="e.g. Barry Samsung A54" className="font-semibold" />
                <Button type="button" variant="outline" className={HEADER_SECONDARY_BUTTON_CLASS} onClick={() => { setDeviceLabel(deviceLabelInput); setSavedDeviceLabel(deviceLabelInput.trim()); }}>
                  Save Label
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="active-flight-aircraft-select" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aircraft Registration</Label>
              <select
                id="active-flight-aircraft-select"
                aria-label="Aircraft registration"
                value={selectedAircraftId}
                onChange={(event) => handleAircraftSelectionChange(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select an aircraft</option>
                {sortedAircraft.map((aircraft) => (
                  <option key={aircraft.id} value={aircraft.id}>
                    {aircraft.tailNumber}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="active-flight-booking-select" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Booking / Navlog Route</Label>
              <select
                id="active-flight-booking-select"
                aria-label="Booking or navlog route"
                value={selectedBookingId}
                onChange={(event) => handleBookingSelectionChange(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select a booking with a navlog</option>
                {candidateBookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    #{booking.bookingNumber} - {booking.date} - {(booking.navlog?.legs?.length || 0)} legs
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Button className={HEADER_ACTION_BUTTON_CLASS} disabled={!selectedAircraft || !!conflictingAircraftSession} onClick={startTracking}><PlaneTakeoff className="mr-2 h-4 w-4" />Start Tracking</Button>
              <Button variant="outline" className={HEADER_SECONDARY_BUTTON_CLASS} disabled={!isTrackingActive} onClick={stopTrackingSession}>Stop Tracking</Button>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/10 px-4 py-3 text-xs">
              <span className="font-black uppercase tracking-widest text-muted-foreground">Sync Status</span>
              <Badge className={cn('px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]', syncStatusClassName)}>{syncStatusLabel}</Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
