'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2, Navigation, PlaneTakeoff, Radio } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTenantConfig } from '@/hooks/use-tenant-config';
import { useTheme } from '@/components/theme-provider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { Aircraft } from '@/types/aircraft';
import type { Booking } from '@/types/booking';
import type { FlightPosition, FlightSession } from '@/types/flight-session';
import { getOrCreateDeviceBinding, setDeviceLabel } from '@/lib/flight-session';
import { useGeolocationTrack } from '@/hooks/use-geolocation-track';
import { getActiveLegState } from '@/lib/active-flight';
import { isHrefEnabledForIndustry, shouldBypassIndustryRestrictions } from '@/lib/industry-access';
import { cn } from '@/lib/utils';
import { FullScreenFlightLayout } from '@/components/active-flight/full-screen-flight-layout';
import { FlightTelemetryTable } from '@/components/active-flight/flight-telemetry-table';
import { useIsMobile } from '@/hooks/use-mobile';

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
  bookingId?: string;
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

const readInitialMapToggle = (key: string, fallback = true) => {
  if (typeof window === 'undefined') return fallback;

  try {
    const stored = window.localStorage.getItem(key);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  } catch {
    // keep fallback
  }

  return fallback;
};

export default function ActiveFlightPage() {
  const searchParams = useSearchParams();
  const { openMobile } = useSidebar();
  const { toast } = useToast();
  const { tenantId, userProfile, isLoading: isUserLoading } = useUserProfile();
  const { tenant, isLoading: isTenantLoading } = useTenantConfig();
  const { uiMode } = useTheme();
  const isMobile = useIsMobile();
  const [isMobileSelectorOpen, setIsMobileSelectorOpen] = useState(false);
  const [selectedAircraftId, setSelectedAircraftId] = useState('');
  const [selectedBookingFilterId, setSelectedBookingFilterId] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [selectedAircraftRegistration, setSelectedAircraftRegistration] = useState('');
  const [deviceLabelInput, setDeviceLabelInput] = useState('');
  const [savedDeviceLabel, setSavedDeviceLabel] = useState('');
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [aircrafts, setAircrafts] = useState<Aircraft[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hasLoadedAircrafts, setHasLoadedAircrafts] = useState(false);
  const [hasLoadedBookings, setHasLoadedBookings] = useState(false);
  const [flightSessions, setFlightSessions] = useState<FlightSession[]>([]);
  const [sessionSetupOpen, setSessionSetupOpen] = useState(false);
  const [showLayerSelectorOpen, setShowLayerSelectorOpen] = useState(false);
  const [showLayerLevelsOpen, setShowLayerLevelsOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [followOwnship, setFollowOwnship] = useState(true);
  const [centreMapNonce, setCentreMapNonce] = useState(0);
  const [airportsVisible, setAirportsVisible] = useState(() => readInitialMapToggle('safeviate.active-flight-map-airports', true));
  const [airportLabelsVisible, setAirportLabelsVisible] = useState(() => readInitialMapToggle('safeviate.active-flight-map-airport-labels', true));
  const [navaidsVisible, setNavaidsVisible] = useState(() => readInitialMapToggle('safeviate.active-flight-map-navaids', true));
  const [navaidLabelsVisible, setNavaidLabelsVisible] = useState(() => readInitialMapToggle('safeviate.active-flight-map-navaid-labels', true));
  const [isOnline, setIsOnline] = useState(true);
  const [hasQueuedSession, setHasQueuedSession] = useState(false);
  const [followOwnship, setFollowOwnship] = useState(true);
  const [mapRecenterSignal, setMapRecenterSignal] = useState(0);
  const [isLayersCardOpen, setIsLayersCardOpen] = useState(false);
  const [isMapZoomCardOpen, setIsMapZoomCardOpen] = useState(false);
  const selectionHydratedRef = useRef<string | null>(null);
  const resumeHydratedRef = useRef<string | null>(null);
  const handoffHydratedRef = useRef<string | null>(null);
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
      setHasLoadedAircrafts(true);
      if (bookingsRes.ok) {
        const data = await bookingsRes.json().catch(() => ({ bookings: [] }));
        setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      }
      setHasLoadedBookings(true);
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

  const reloadBookings = async () => {
    const response = await fetch('/api/bookings', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json().catch(() => ({ bookings: [] }));
    setBookings(Array.isArray(data.bookings) ? data.bookings : []);
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
    const handleStorage = (event: StorageEvent) => {
      if (event.key === BOOKING_UPDATES_STORAGE_KEY) {
        void reloadBookings();
      }
      syncQueuedSessionState();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('online', syncConnectivityState);
      window.removeEventListener('offline', syncConnectivityState);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBookingsUpdated = () => {
      void reloadBookings();
      void reloadFlightSessions();
    };

    window.addEventListener('safeviate-bookings-updated', handleBookingsUpdated);
    return () => window.removeEventListener('safeviate-bookings-updated', handleBookingsUpdated);
  }, []);

  const deviceBinding = useMemo(() => getOrCreateDeviceBinding(), []);
  const sortedAircraft = useMemo(() => [...aircrafts].sort((a, b) => a.tailNumber.localeCompare(b.tailNumber)), [aircrafts]);
  const selectedAircraft = useMemo(() => sortedAircraft.find((aircraft) => aircraft.id === selectedAircraftId) || null, [selectedAircraftId, sortedAircraft]);
  const bookingChoices = useMemo(
    () => bookings.filter((booking) => !selectedAircraftId || booking.aircraftId === selectedAircraftId).sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()),
    [bookings, selectedAircraftId],
  );
  const candidateBookings = useMemo(() => bookings.filter((booking) => !selectedAircraftId || booking.aircraftId === selectedAircraftId).filter((booking) => (booking.navlog?.legs?.length || 0) > 0).sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()), [bookings, selectedAircraftId]);
  const selectedBooking = useMemo(() => candidateBookings.find((booking) => booking.id === selectedBookingId) || null, [candidateBookings, selectedBookingId]);
  const selectedBookingFilter = useMemo(() => bookingChoices.find((booking) => booking.id === selectedBookingFilterId) || null, [bookingChoices, selectedBookingFilterId]);
  const selectedAircraftValue = selectedAircraft ? selectedAircraftId : undefined;
  const selectedBookingFilterValue = selectedBookingFilter ? selectedBookingFilterId : undefined;
  const selectedBookingValue = selectedBooking ? selectedBookingId : undefined;
  const mobileSelectorSummary = selectedAircraft?.tailNumber || selectedBookingFilter?.bookingNumber || selectedBooking?.bookingNumber
    ? [selectedAircraft?.tailNumber, selectedBookingFilter ? `Booking #${selectedBookingFilter.bookingNumber}` : null, selectedBooking ? `Route #${selectedBooking.bookingNumber}` : null]
        .filter(Boolean)
        .join(' • ')
    : 'Flight Setup';
  const selectedLegs = selectedBooking?.navlog?.legs || [];
  const currentDeviceSession = useMemo(
    () => flightSessions.find((session) => session.deviceId === deviceBinding?.deviceId) || null,
    [deviceBinding?.deviceId, flightSessions],
  );
  const effectivePosition = position ?? currentDeviceSession?.lastPosition ?? null;
  const activeLegState = useMemo(() => getActiveLegState(selectedLegs, effectivePosition), [effectivePosition, selectedLegs]);
  const pilotName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Pilot';
  const liveTelemetry = {
    speed: activeLegState?.groundSpeedKt ?? effectivePosition?.speedKt ?? null,
    altitude: effectivePosition?.altitude ?? null,
    heading: effectivePosition?.headingTrue ?? null,
    trailPoints: currentDeviceSession?.breadcrumb?.length ?? (effectivePosition ? 1 : 0),
  };
  const nextWaypointNumber = activeLegState?.activeLegIndex != null ? `${activeLegState.activeLegIndex + 2}` : 'N/A';
  const etaToNextLabel = activeLegState?.etaToNextMinutes != null ? `${Math.max(1, Math.round(activeLegState.etaToNextMinutes))} min` : 'N/A';
  const syncStatusLabel = hasQueuedSession ? 'Queued for Sync' : isOnline ? 'Online' : 'Offline';
  const syncStatusClassName = hasQueuedSession
    ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50'
    : isOnline
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50'
      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-50';

  useEffect(() => {
    setFollowOwnship(true);
  }, [selectedRouteSignature]);

  useEffect(() => {
    if (!openMobile) return;
    setMobileActionsOpen(false);
    setShowLayerSelectorOpen(false);
    setShowLayerLevelsOpen(false);
  }, [openMobile]);

  useEffect(() => {
    if (!sessionSetupOpen) return;
    setMobileActionsOpen(false);
  }, [sessionSetupOpen]);

  const conflictingAircraftSession = useMemo(() => {
    if (!selectedAircraft || !deviceBinding?.deviceId) return null;
    return flightSessions.find((session) => session.status === 'active' && session.aircraftId === selectedAircraft.id && session.deviceId !== deviceBinding.deviceId) || null;
  }, [deviceBinding?.deviceId, flightSessions, selectedAircraft]);

  const actionButtons = [
    {
      value: isTrackingActive ? 'stop-tracking' : 'start-tracking',
      label: isTrackingActive ? 'Stop Tracking' : 'Start Tracking',
      onClick: () => {
        if (isTrackingActive) {
          stopTrackingSession();
          return;
        }
        startTracking();
      },
      className: isTrackingActive
        ? 'border-rose-600 bg-rose-600 text-white hover:bg-rose-700'
        : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
      disabled: !isTrackingActive && (!selectedAircraft || Boolean(conflictingAircraftSession)),
    },
    {
      value: 'layers',
      label: 'Layers',
      onClick: () => {
        setIsLayersCardOpen((current) => !current);
        setIsMapZoomCardOpen(false);
      },
      className: 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
    },
    {
      value: 'map-zoom',
      label: 'Map Zoom',
      onClick: () => {
        setIsMapZoomCardOpen((current) => !current);
        setIsLayersCardOpen(false);
      },
      className: 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
    },
    {
      value: 'centre-map',
      label: 'Centre Map',
      onClick: () => {
        setMapRecenterSignal((current) => current + 1);
        setIsLayersCardOpen(false);
        setIsMapZoomCardOpen(false);
      },
      className: 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
    },
    {
      value: 'north-up',
      label: 'North Up',
      onClick: () => {
        setFollowOwnship(false);
        setIsLayersCardOpen(false);
        setIsMapZoomCardOpen(false);
      },
      className: !followOwnship ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
    },
    {
      value: 'nose-up',
      label: 'Nose Up',
      onClick: () => {
        setFollowOwnship(true);
        setIsLayersCardOpen(false);
        setIsMapZoomCardOpen(false);
      },
      className: followOwnship ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
    },
  ];

  const handleAircraftSelectionChange = (aircraftId: string) => {
    setSelectedAircraftId(aircraftId);
    const nextAircraft = sortedAircraft.find((aircraft) => aircraft.id === aircraftId) || null;
    setSelectedAircraftRegistration(nextAircraft?.tailNumber || '');
    if (!deviceBinding?.deviceId) return;
    saveActiveTrackingSelection(deviceBinding.deviceId, { aircraftId, bookingId: selectedBookingId || undefined });
  };

  const handleBookingFilterSelectionChange = (bookingId: string) => {
    setSelectedBookingFilterId(bookingId);
    if (!deviceBinding?.deviceId) return;
    saveActiveTrackingSelection(deviceBinding.deviceId, {
      aircraftId: selectedAircraftId,
      bookingId: selectedBookingId || undefined,
    });
  };

  const handleBookingSelectionChange = (bookingId: string) => {
    const nextBooking = candidateBookings.find((booking) => booking.id === bookingId) || null;
    if (!nextBooking) {
      toast({
        variant: 'destructive',
        title: 'Booking Not Available',
        description: 'Complete or cancel the earlier booking on this aircraft before starting this one.',
      });
      return;
    }

    const nextAircraftId = nextBooking?.aircraftId || selectedAircraftId;
    if (nextAircraftId !== selectedAircraftId) {
      setSelectedAircraftId(nextAircraftId);
    }
    const nextAircraft = sortedAircraft.find((aircraft) => aircraft.id === nextAircraftId) || null;
    setSelectedAircraftRegistration(nextAircraft?.tailNumber || selectedAircraftRegistration);
    setSelectedBookingId(bookingId);
    if (!deviceBinding?.deviceId) return;
    saveActiveTrackingSelection(deviceBinding.deviceId, {
      aircraftId: selectedAircraftId,
      bookingId: bookingId || undefined,
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
    if (savedSelection.bookingId) {
      setSelectedBookingFilterId(savedSelection.bookingId);
    }
  }, [deviceBinding?.deviceId]);

  useEffect(() => {
    if (!deviceBinding?.deviceId) return;

    const requestedBookingId = searchParams.get('bookingId')?.trim() || '';
    const requestedAircraftId = searchParams.get('aircraftId')?.trim() || '';
    const requestedSetup = searchParams.get('setup');
    const handoffKey = `${requestedAircraftId}:${requestedBookingId}:${requestedSetup || ''}`;

    if (!requestedBookingId && !requestedAircraftId) return;
    if (handoffHydratedRef.current === handoffKey) return;

    const requestedBookingRecord = requestedBookingId
      ? bookings.find((booking) => booking.id === requestedBookingId) || null
      : null;
    const requestedBooking = requestedBookingRecord && isBookingEligibleForTracking(bookings, requestedBookingRecord)
      ? requestedBookingRecord
      : null;

    if (requestedBookingRecord && !requestedBooking) {
      toast({
        variant: 'destructive',
        title: 'Booking Locked',
        description: 'Complete or cancel the earlier booking on this aircraft before continuing this one.',
      });
      handoffHydratedRef.current = handoffKey;
      return;
    }

    const nextAircraftId = requestedBooking?.aircraftId || requestedAircraftId;
    const nextAircraft = nextAircraftId
      ? sortedAircraft.find((aircraft) => aircraft.id === nextAircraftId) || null
      : null;

    if (!requestedBooking && !nextAircraft) return;

    const nextBookingId =
      requestedBooking?.id ||
      (nextAircraftId ? getTrackableBookings(bookings, nextAircraftId)[0]?.id || '' : '');

    setSelectedAircraftId(nextAircraft?.id || nextAircraftId);
    setSelectedBookingId(nextBookingId);
    saveActiveTrackingSelection(deviceBinding.deviceId, {
      aircraftId: nextAircraft?.id || nextAircraftId,
      bookingId: nextBookingId,
      aircraftRegistration: nextAircraft?.tailNumber || '',
    });

    if (requestedSetup === '1') {
      setSessionSetupOpen(true);
    }

    handoffHydratedRef.current = handoffKey;
  }, [bookings, deviceBinding?.deviceId, searchParams, sortedAircraft]);

  useEffect(() => {
    if (!hasLoadedAircrafts) return;
    if (!selectedAircraftId) return;
    if (selectedAircraft) return;
    setSelectedAircraftId('');
    setSelectedAircraftRegistration('');
  }, [hasLoadedAircrafts, selectedAircraft, selectedAircraftId]);

  useEffect(() => {
    if (!hasLoadedBookings) return;
    if (!selectedBookingId) return;
    if (selectedBooking) return;
    setSelectedBookingId('');
  }, [hasLoadedBookings, selectedBooking, selectedBookingId]);

  useEffect(() => {
    if (!selectedAircraft) return;
    if (selectedAircraft.tailNumber === selectedAircraftRegistration) return;
    setSelectedAircraftRegistration(selectedAircraft.tailNumber);
  }, [selectedAircraft, selectedAircraftRegistration]);

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

    if ('aircraftRegistration' in resumeSource && resumeSource.aircraftRegistration && resumeSource.aircraftRegistration !== selectedAircraftRegistration) {
      setSelectedAircraftRegistration(resumeSource.aircraftRegistration);
    }

    if (!isTrackingActive) {
      setIsTrackingActive(true);
      startWatching();
    }
  }, [deviceBinding?.deviceId, flightSessions, isTrackingActive, selectedAircraftId, selectedAircraftRegistration, selectedBookingId, startWatching]);

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
    if (!isTrackingActive || !position || !selectedAircraftId || !selectedAircraftRegistrationValue || !deviceBinding) return;
    const now = Date.now();
    if (now - lastWriteRef.current < 5000) return;
    lastWriteRef.current = now;
    const existingSession = flightSessions.find((session) => session.deviceId === deviceBinding.deviceId);
    const startedAt = existingSession?.startedAt || new Date().toISOString();
    const nextSession: FlightSession = {
      id: deviceBinding.deviceId,
      pilotId: userProfile?.id || 'unknown',
      pilotName,
      aircraftId: selectedAircraftId,
      aircraftRegistration: selectedAircraftRegistrationValue,
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
      etaToNextWaypointMinutes: activeLegState?.etaToNextWaypointMinutes,
      crossTrackErrorNm: activeLegState?.crossTrackErrorNm,
      onCourse: activeLegState?.onCourse,
      groundSpeedKt: activeLegState?.groundSpeedKt ?? position.speedKt ?? undefined,
    };
    const next = [...flightSessions.filter((session) => session.deviceId !== deviceBinding.deviceId), nextSession];
    void persistSessions(next);
  }, [activeLegState, deviceBinding, flightSessions, isTrackingActive, pilotName, position, savedDeviceLabel, selectedAircraftId, selectedAircraftRegistrationValue, selectedBooking?.id, userProfile?.id]);

  const persistSessions = async (next: FlightSession[]) => {
    setFlightSessions(next);
    const current = deviceBinding?.deviceId
      ? next.find((session) => session.deviceId === deviceBinding.deviceId)
      : next[next.length - 1];
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
    if (!selectedAircraftId || !selectedAircraftRegistrationValue || !deviceBinding) {
      toast({
        variant: 'destructive',
        title: 'Aircraft Not Selected',
        description: 'Choose an aircraft registration before starting tracking.',
      });
      return;
    }
    const aircraftLabel = selectedAircraft?.tailNumber || selectedAircraftRegistrationValue;
    if (conflictingAircraftSession) {
      toast({ variant: 'destructive', title: 'Aircraft Already In Use', description: `${aircraftLabel} is already active on another device.` });
      return;
    }
    void fetch(`/api/flight-sessions?id=${deviceBinding.deviceId}&mode=unblock`, { method: 'DELETE' });
    saveActiveTrackingState(deviceBinding.deviceId, {
      active: true,
      aircraftId: selectedAircraft.id,
      bookingId: selectedBooking?.id || undefined,
      savedAt: new Date().toISOString(),
    });
    saveActiveTrackingSelection(deviceBinding.deviceId, {
      aircraftId: selectedAircraft.id,
      bookingId: selectedBooking?.id || undefined,
    });
    setIsTrackingActive(true);
    setSessionSetupOpen(false);
    lastWriteRef.current = 0;
    void persistSessions(flightSessions.filter((session) => session.deviceId !== deviceBinding.deviceId).concat({
      id: deviceBinding.deviceId,
      pilotId: userProfile?.id || 'unknown',
      pilotName,
      aircraftId: selectedAircraft.id,
      aircraftRegistration: selectedAircraft.tailNumber,
      bookingId: selectedBooking?.id || undefined,
      status: 'active',
      deviceId: deviceBinding.deviceId,
      deviceLabel: savedDeviceLabel || deviceBinding.deviceLabel || '',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      breadcrumb: position ? buildBreadcrumb([], position) : [],
      ...(activeLegState
        ? {
            activeLegIndex: activeLegState.activeLegIndex,
            distanceToNextNm: activeLegState.distanceToNextNm,
            bearingToNext: activeLegState.bearingToNext,
            etaToNextMinutes: activeLegState.etaToNextMinutes,
            crossTrackErrorNm: activeLegState.crossTrackErrorNm,
            onCourse: activeLegState.onCourse,
            groundSpeedKt: activeLegState.groundSpeedKt ?? position?.speedKt ?? undefined,
          }
        : {}),
    }));
    startWatching();
  };

  const stopTrackingSession = async () => {
    stopWatching();
    setIsTrackingActive(false);
    lastWriteRef.current = 0;

    if (!deviceBinding) return;

    clearActiveTrackingState(deviceBinding.deviceId);
    clearQueuedFlightSession(deviceBinding.deviceId);
    setHasQueuedSession(false);
    setFlightSessions((current) => current.filter((session) => session.deviceId !== deviceBinding.deviceId));

    try {
      const response = await fetch(`/api/flight-sessions?id=${deviceBinding.deviceId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to end the active session.');
      }
      await reloadFlightSessions();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Stop Tracking Failed',
        description: error instanceof Error ? error.message : 'The live session could not be cleared right now.',
      });
    }
  };

  useEffect(() => {
    if (!hasLoadedBookings || !deviceBinding?.deviceId || !activeSessionForDevice) return;

    // Aircraft-only sessions are valid and should not be auto-stopped.
    if (!activeSessionForDevice.bookingId) return;

    if (!activeSessionBookingRecord) {
      void stopTrackingSession();
      return;
    }

    if (activeSessionForDevice.bookingId !== activeSessionBookingRecord.id) return;
    if (isBookingEligibleForTracking(bookings, activeSessionBookingRecord)) return;
    void stopTrackingSession();
  }, [activeSessionBookingRecord, activeSessionForDevice, bookings, deviceBinding?.deviceId, hasLoadedBookings, stopTrackingSession]);

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
            position={effectivePosition}
            aircraftRegistration={selectedAircraft?.tailNumber}
            activeLegIndex={activeLegState?.activeLegIndex}
            activeLegState={activeLegState}
            followOwnship={followOwnship}
            onFollowOwnshipChange={setFollowOwnship}
            centreMapNonce={centreMapNonce}
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
          position={effectivePosition}
          aircraftRegistration={selectedAircraft?.tailNumber}
          activeLegIndex={activeLegState?.activeLegIndex}
          activeLegState={activeLegState}
          fullscreen
          followOwnship={followOwnship}
          onFollowOwnshipChange={setFollowOwnship}
          centreMapNonce={centreMapNonce}
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
          <CardContent className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/5 p-0">
            <div className="sticky top-0 z-20 border-b bg-background px-2 py-1.5 md:z-[2500] md:px-3 md:py-2">
              <div className="flex items-center justify-center gap-1.5 md:gap-2" aria-label="Active flight action bar">
                <div className="hidden items-center justify-center gap-1.5 md:flex md:gap-2">
                  <Button type="button" variant="outline" className="h-8 gap-1.5 border bg-background/90 px-3 text-[9px] font-black uppercase tracking-[0.08em] shadow-sm backdrop-blur" onClick={() => setSessionSetupOpen(true)}>
                    <Settings2 className="h-4 w-4" />
                    Session Setup
                  </Button>
                  <Button type="button" variant="outline" className="h-8 gap-1.5 border bg-background/90 px-3 text-[9px] font-black uppercase tracking-[0.08em] shadow-sm backdrop-blur" onClick={() => setShowLayerSelectorOpen((current) => !current)}>
                    <Layers3 className="h-4 w-4" />
                    Layers
                  </Button>
                  <Button type="button" variant="outline" className="h-8 gap-1.5 border bg-background/90 px-3 text-[9px] font-black uppercase tracking-[0.08em] shadow-sm backdrop-blur" onClick={() => setShowLayerLevelsOpen((current) => !current)}>
                    <SlidersHorizontal className="h-4 w-4" />
                    Map Zoom
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 gap-1.5 border bg-background/90 px-3 text-[9px] font-black uppercase tracking-[0.08em] shadow-sm backdrop-blur"
                    onClick={handleCentreMap}
                  >
                    <LocateFixed className="h-4 w-4" />
                    Centre Map
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 gap-1.5 border bg-background/90 px-3 text-[9px] font-black uppercase tracking-[0.08em] shadow-sm backdrop-blur"
                    onClick={() => setFollowOwnship(false)}
                  >
                    North Up
                  </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 gap-1.5 border bg-background/90 px-3 text-[9px] font-black uppercase tracking-[0.08em] shadow-sm backdrop-blur"
                      onClick={() => setFollowOwnship(true)}
                  >
                    Nose Up
                  </Button>
                </div>
                <div className="w-full md:hidden">
                  <MobileActionDropdown icon={Settings2} label="Actions" open={mobileActionsOpen} onOpenChange={setMobileActionsOpen}>
                    <DropdownMenuItem
                      onClick={() => setSessionSetupOpen(true)}
                      className={MOBILE_ACTION_MENU_ITEM_CLASS}
                    >
                      <Settings2 className="h-4 w-4" />
                      Session Setup
                    </DropdownMenuItem>
                    <DropdownMenuCheckboxItem
                      checked={showLayerSelectorOpen}
                      onCheckedChange={(checked) => setShowLayerSelectorOpen(Boolean(checked))}
                      className={MOBILE_ACTION_MENU_STATE_ITEM_CLASS}
                    >
                      <Layers3 className="h-4 w-4" />
                      Layers
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={showLayerLevelsOpen}
                      onCheckedChange={(checked) => setShowLayerLevelsOpen(Boolean(checked))}
                      className={MOBILE_ACTION_MENU_STATE_ITEM_CLASS}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      Map Zoom
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuItem onClick={handleCentreMap} className={MOBILE_ACTION_MENU_ITEM_CLASS}>
                      <LocateFixed className="h-4 w-4" />
                      Centre Map
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1 bg-slate-200" />
                    <DropdownMenuRadioGroup
                      value={followOwnship ? 'nose' : 'north'}
                      onValueChange={(value) => setFollowOwnship(value === 'nose')}
                    >
                      <DropdownMenuRadioItem
                        value="north"
                        className={MOBILE_ACTION_MENU_STATE_ITEM_CLASS}
                      >
                        North Up
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem
                        value="nose"
                        className={MOBILE_ACTION_MENU_STATE_ITEM_CLASS}
                      >
                        Nose Up
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator className="my-1 bg-slate-200" />
                    <DropdownMenuLabel className="px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Quick Declutter
                    </DropdownMenuLabel>
                    <DropdownMenuCheckboxItem
                      checked={airportsVisible}
                      onCheckedChange={(checked) => setAirportsVisible(Boolean(checked))}
                      className={MOBILE_ACTION_MENU_STATE_ITEM_CLASS}
                    >
                      Airports
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={airportLabelsVisible}
                      onCheckedChange={(checked) => setAirportLabelsVisible(Boolean(checked))}
                      className={MOBILE_ACTION_MENU_STATE_ITEM_CLASS}
                    >
                      Airport Labels
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={navaidsVisible}
                      onCheckedChange={(checked) => setNavaidsVisible(Boolean(checked))}
                      className={MOBILE_ACTION_MENU_STATE_ITEM_CLASS}
                    >
                      Navaids
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={navaidLabelsVisible}
                      onCheckedChange={(checked) => setNavaidLabelsVisible(Boolean(checked))}
                      className={MOBILE_ACTION_MENU_STATE_ITEM_CLASS}
                    >
                      Navaid Labels
                    </DropdownMenuCheckboxItem>
                  </MobileActionDropdown>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-200">Live Telemetry</p>
                  <Radio className="h-4 w-4 text-sky-200" />
                </div>
                <p className="mt-3 text-3xl font-black text-white">{liveTelemetry.speed != null ? `${liveTelemetry.speed.toFixed(0)} kt` : 'N/A'}</p>
                <p className="mt-1 text-xs text-slate-200/80">Current speed from the device position stream.</p>
              </div>
              <Link href="/operations/fleet-tracker" className="block">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md transition hover:bg-white/14">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-200">Ops View</p>
                    <Navigation className="h-4 w-4 text-emerald-200" />
                  </div>
                  <p className="mt-3 text-lg font-black text-white">Open Fleet Tracker</p>
                  <p className="mt-1 text-xs text-slate-200/80">See this aircraft from the operations surface.</p>
                </div>
              </Link>
            </div>
          </div>
        </section>
      )}

      <Card className={cn('flex min-h-0 flex-1 flex-col border shadow-none', isModern && 'overflow-hidden border-slate-200/80 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.08)]')}>
        <div className="border-b border-slate-200/80 px-2 py-1.5 sm:px-3 sm:py-2">
          {isMobile ? (
            <Collapsible open={isMobileSelectorOpen} onOpenChange={setIsMobileSelectorOpen}>
              <div className="space-y-1.5">
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 w-full justify-between border-input bg-background px-2.5 py-1 text-[13px] font-medium text-foreground shadow-sm hover:bg-accent/40"
                  >
                    <span className="truncate">{mobileSelectorSummary}</span>
                    <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', isMobileSelectorOpen && 'rotate-180')} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1.5 pt-0.5">
                  <div className="space-y-1">
                    <Label htmlFor="active-flight-aircraft-select" className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">Aircraft Registration</Label>
                    <Select value={selectedAircraftValue} onValueChange={handleAircraftSelectionChange}>
                      <SelectTrigger id="active-flight-aircraft-select" aria-label="Aircraft registration" className="h-7 font-semibold text-[13px]">
                        <SelectValue placeholder="Select an aircraft" />
                      </SelectTrigger>
                      <SelectContent>{sortedAircraft.map((aircraft) => <SelectItem key={aircraft.id} value={aircraft.id}>{aircraft.tailNumber}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="active-flight-booking-filter-select" className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">Booking</Label>
                    <Select value={selectedBookingFilterValue} onValueChange={handleBookingFilterSelectionChange}>
                      <SelectTrigger id="active-flight-booking-filter-select" aria-label="Booking" className="h-7 font-semibold text-[13px]">
                        <SelectValue placeholder="Select a booking" />
                      </SelectTrigger>
                      <SelectContent>{bookingChoices.map((booking) => <SelectItem key={booking.id} value={booking.id}>#{booking.bookingNumber} ? {booking.date}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="active-flight-booking-select" className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">Navlog Route</Label>
                    <Select value={selectedBookingValue} onValueChange={handleBookingSelectionChange}>
                      <SelectTrigger id="active-flight-booking-select" aria-label="Navlog route" className="h-7 font-semibold text-[13px]">
                        <SelectValue placeholder="Optional: select a booking with a navlog" />
                      </SelectTrigger>
                      <SelectContent>{candidateBookings.map((booking) => <SelectItem key={booking.id} value={booking.id}>#{booking.bookingNumber} ? {booking.date} ? {(booking.navlog?.legs?.length || 0)} legs</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[220px] flex-1 space-y-1">
                <Label htmlFor="active-flight-aircraft-select" className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">Aircraft Registration</Label>
                <Select value={selectedAircraftValue} onValueChange={handleAircraftSelectionChange}>
                  <SelectTrigger id="active-flight-aircraft-select" aria-label="Aircraft registration" className="h-8 font-semibold text-[13px]">
                    <SelectValue placeholder="Select an aircraft" />
                  </SelectTrigger>
                  <SelectContent>{sortedAircraft.map((aircraft) => <SelectItem key={aircraft.id} value={aircraft.id}>{aircraft.tailNumber}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="min-w-[220px] flex-1 space-y-1">
                <Label htmlFor="active-flight-booking-filter-select" className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">Booking</Label>
                <Select value={selectedBookingFilterValue} onValueChange={handleBookingFilterSelectionChange}>
                  <SelectTrigger id="active-flight-booking-filter-select" aria-label="Booking" className="h-8 font-semibold text-[13px]">
                    <SelectValue placeholder="Select a booking" />
                  </SelectTrigger>
                  <SelectContent>{bookingChoices.map((booking) => <SelectItem key={booking.id} value={booking.id}>#{booking.bookingNumber} ? {booking.date}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="min-w-[240px] flex-1 space-y-1">
                <Label htmlFor="active-flight-booking-select" className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">Navlog Route</Label>
                <Select value={selectedBookingValue} onValueChange={handleBookingSelectionChange}>
                  <SelectTrigger id="active-flight-booking-select" aria-label="Navlog route" className="h-8 font-semibold text-[13px]">
                    <SelectValue placeholder="Optional: select a booking with a navlog" />
                  </SelectTrigger>
                  <SelectContent>{candidateBookings.map((booking) => <SelectItem key={booking.id} value={booking.id}>#{booking.bookingNumber} ? {booking.date} ? {(booking.navlog?.legs?.length || 0)} legs</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        <div className="border-b border-slate-200/80 bg-white">
          <div className="px-2 py-1.5 sm:px-3 sm:py-2">
            {isMobile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="Select flight action"
                    className="h-8 w-full justify-between border-input bg-background px-2.5 py-1 text-[13px] font-medium shadow-sm hover:bg-accent/40"
                  >
                    <span>Select Action</span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[14rem]">
                  {actionButtons.map((action) => (
                    <DropdownMenuItem
                      key={action.value}
                      disabled={action.disabled}
                      className="text-[10px] font-bold uppercase"
                      onClick={action.onClick}
                    >
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {actionButtons.map((action) => (
                  <Button
                    key={action.label}
                    type="button"
                    variant="outline"
                    className={cn('h-7 rounded-md border px-2.5 text-[9px] font-black uppercase tracking-[0.1em]', action.className)}
                    onClick={action.onClick}
                    disabled={action.disabled}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="border-b border-slate-200/80 bg-white">
          <div className="grid grid-cols-4 gap-px bg-slate-200/80 lg:grid-cols-8">
            {[
              { label: 'ALT', value: liveTelemetry.altitude != null ? `${Math.round(liveTelemetry.altitude)} m` : 'N/A' },
              { label: 'SPD', value: liveTelemetry.speed != null ? `${liveTelemetry.speed.toFixed(0)} kt` : 'N/A' },
              { label: 'DIR', value: liveTelemetry.heading != null ? `${liveTelemetry.heading.toFixed(0)}°` : 'N/A' },
              { label: 'NXT', value: nextWaypointNumber },
              { label: 'DST', value: activeLegState?.distanceToNextNm != null ? `${activeLegState.distanceToNextNm.toFixed(1)} NM` : 'N/A' },
              { label: 'WPT', value: activeLegState?.toWaypoint || 'N/A' },
              { label: 'BRG', value: activeLegState?.bearingToNext != null ? `${activeLegState.bearingToNext.toFixed(0)}°` : 'N/A' },
              { label: 'ETA', value: etaToNextLabel },
            ].map((item) => (
              <div key={item.label} className="flex min-w-0 items-center gap-1 bg-white px-1.5 py-1 sm:px-3">
                <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                  {item.label}
                </span>
                <span className="min-w-0 truncate text-[10px] font-black leading-none text-foreground">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
        <CardContent className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
          <Dialog open={isFullscreenMapOpen} onOpenChange={setIsFullscreenMapOpen}>
            <DialogContent className="fixed inset-0 m-0 h-[100dvh] w-[100vw] max-w-none max-h-none translate-x-0 translate-y-0 overflow-hidden border-0 bg-black p-0 text-slate-100 shadow-none">
              <DialogHeader className="sr-only">
                <DialogTitle>Full Flight Tracking View</DialogTitle>
              </DialogHeader>
              <FullScreenFlightLayout
                booking={selectedBooking}
                legs={selectedLegs}
                position={effectivePosition}
                aircraftRegistration={selectedAircraft?.tailNumber}
                activeLegIndex={activeLegState?.activeLegIndex}
                activeLegState={activeLegState}
                heading={liveTelemetry.heading}
                speed={liveTelemetry.speed}
                altitude={liveTelemetry.altitude}
                trailPoints={liveTelemetry.trailPoints}
                syncStatusLabel={syncStatusLabel}
                syncStatusClassName={syncStatusClassName}
                savedDeviceLabel={savedDeviceLabel}
                permissionState={permissionState}
                isWatching={isWatching}
              />
            </DialogContent>
          </Dialog>
          <div className="flex min-h-0 flex-1 flex-col space-y-4 px-0 pb-0 pt-0">
            {!isFullscreenMapOpen ? (
              <ActiveFlightLiveMap
                booking={selectedBooking}
                legs={selectedLegs}
                position={effectivePosition}
                aircraftRegistration={selectedAircraft?.tailNumber}
                activeLegIndex={activeLegState?.activeLegIndex}
                activeLegState={activeLegState}
                showControls={false}
                followOwnship={followOwnship}
                onFollowOwnshipChange={setFollowOwnship}
                recenterSignal={mapRecenterSignal}
                isLayersCardOpen={isLayersCardOpen}
                isMapZoomCardOpen={isMapZoomCardOpen}
                onLayersCardOpenChange={setIsLayersCardOpen}
                onMapZoomCardOpenChange={setIsMapZoomCardOpen}
              />
            ) : (
              <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed bg-muted/10 px-6 py-12 text-center text-sm text-muted-foreground">
                Full screen map is open. Close it to restore the compact pilot map.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
