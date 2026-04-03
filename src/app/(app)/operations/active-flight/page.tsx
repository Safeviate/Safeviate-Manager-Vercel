'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { collection, doc } from 'firebase/firestore';
import { Loader2, MapPinned, Navigation, PlaneTakeoff, Radio, Smartphone, TimerReset } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { setDocumentNonBlocking } from '@/firebase';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { Aircraft } from '@/types/aircraft';
import type { Booking } from '@/types/booking';
import { getOrCreateDeviceBinding, setDeviceLabel } from '@/lib/flight-session';
import { useGeolocationTrack } from '@/hooks/use-geolocation-track';
import { getActiveLegState } from '@/lib/active-flight';

const ActiveFlightLiveMap = dynamic(
  () => import('@/components/active-flight/active-flight-live-map').then((module) => module.ActiveFlightLiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed bg-slate-950 px-6 py-12 text-center text-slate-100">
        <div className="space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-400" />
          <p className="text-sm font-black uppercase tracking-widest">Loading Pilot Map</p>
        </div>
      </div>
    ),
  }
);

export default function ActiveFlightPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { tenantId, userProfile, isLoading: isUserLoading } = useUserProfile();
  const [selectedAircraftId, setSelectedAircraftId] = useState<string>('');
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [deviceLabelInput, setDeviceLabelInput] = useState('');
  const [savedDeviceLabel, setSavedDeviceLabel] = useState<string>('');
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [manualLegIndex, setManualLegIndex] = useState<number>(0);
  const lastWriteRef = useRef<number>(0);
  const {
    position,
    error: geolocationError,
    permissionState,
    isWatching,
    startWatching,
    stopWatching,
  } = useGeolocationTrack();

  const aircraftQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return collection(firestore, `tenants/${tenantId}/aircrafts`);
  }, [firestore, tenantId]);

  const { data: aircrafts, isLoading: isAircraftLoading } = useCollection<Aircraft>(aircraftQuery);

  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return collection(firestore, `tenants/${tenantId}/bookings`);
  }, [firestore, tenantId]);

  const { data: bookings } = useCollection<Booking>(bookingsQuery);

  const flightSessionsQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return collection(firestore, `tenants/${tenantId}/flightSessions`);
  }, [firestore, tenantId]);

  const { data: flightSessions } = useCollection<any>(flightSessionsQuery);

  useEffect(() => {
    const binding = getOrCreateDeviceBinding();
    if (!binding) return;

    setSavedDeviceLabel(binding.deviceLabel || '');
    setDeviceLabelInput(binding.deviceLabel || '');
  }, []);

  const sortedAircraft = useMemo(() => {
    return [...(aircrafts || [])].sort((a, b) => a.tailNumber.localeCompare(b.tailNumber));
  }, [aircrafts]);

  const selectedAircraft = useMemo(
    () => sortedAircraft.find((aircraft) => aircraft.id === selectedAircraftId) || null,
    [selectedAircraftId, sortedAircraft]
  );

  const candidateBookings = useMemo(() => {
    return (bookings || [])
      .filter((booking) => !selectedAircraftId || booking.aircraftId === selectedAircraftId)
      .filter((booking) => (booking.navlog?.legs?.length || 0) > 0)
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
  }, [bookings, selectedAircraftId]);

  const selectedBooking = useMemo(
    () => candidateBookings.find((booking) => booking.id === selectedBookingId) || null,
    [candidateBookings, selectedBookingId]
  );

  const selectedLegs = selectedBooking?.navlog?.legs || [];
  const activeLegState = useMemo(
    () => getActiveLegState(selectedLegs, position, manualLegIndex),
    [selectedLegs, position, manualLegIndex]
  );

  useEffect(() => {
    setManualLegIndex(0);
  }, [selectedBookingId]);

  useEffect(() => {
    if (!activeLegState) return;
    if (activeLegState.activeLegIndex !== manualLegIndex) {
      setManualLegIndex(activeLegState.activeLegIndex);
    }
  }, [activeLegState, manualLegIndex]);

  const deviceBinding = useMemo(() => getOrCreateDeviceBinding(), [savedDeviceLabel]);
  const pilotName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Pilot';
  const sessionRef = useMemoFirebase(() => {
    if (!firestore || !tenantId || !deviceBinding?.deviceId) return null;
    return doc(firestore, `tenants/${tenantId}/flightSessions`, deviceBinding.deviceId);
  }, [deviceBinding?.deviceId, firestore, tenantId]);

  const conflictingAircraftSession = useMemo(() => {
    if (!selectedAircraft || !deviceBinding?.deviceId) return null;

    return (flightSessions || []).find(
      (session) =>
        session.status === 'active' &&
        session.aircraftId === selectedAircraft.id &&
        session.deviceId !== deviceBinding.deviceId
    );
  }, [deviceBinding?.deviceId, flightSessions, selectedAircraft]);

  useEffect(() => {
    if (!isTrackingActive || !position || !selectedAircraft || !deviceBinding || !sessionRef) return;

    const now = Date.now();
    if (now - lastWriteRef.current < 5000) return;

    lastWriteRef.current = now;
    setDocumentNonBlocking(
      sessionRef,
      {
        pilotId: user?.uid || '',
        pilotName,
        aircraftId: selectedAircraft.id,
        aircraftRegistration: selectedAircraft.tailNumber,
        bookingId: selectedBooking?.id || '',
        status: 'active',
        deviceId: deviceBinding.deviceId,
        deviceLabel: savedDeviceLabel || deviceBinding.deviceLabel || '',
        activeLegIndex: activeLegState?.activeLegIndex ?? null,
        updatedAt: new Date().toISOString(),
        lastPosition: position,
        distanceToNextNm: activeLegState?.distanceToNextNm ?? null,
        bearingToNext: activeLegState?.bearingToNext ?? null,
        etaToNextMinutes: activeLegState?.etaToNextMinutes ?? null,
        crossTrackErrorNm: activeLegState?.crossTrackErrorNm ?? null,
        onCourse: activeLegState?.onCourse ?? null,
        groundSpeedKt: activeLegState?.groundSpeedKt ?? position.speedKt ?? null,
      },
      { merge: true }
    );
  }, [activeLegState?.activeLegIndex, activeLegState?.bearingToNext, activeLegState?.crossTrackErrorNm, activeLegState?.distanceToNextNm, activeLegState?.etaToNextMinutes, activeLegState?.groundSpeedKt, activeLegState?.onCourse, deviceBinding, pilotName, position, savedDeviceLabel, selectedAircraft, selectedBooking?.id, sessionRef, user?.uid, isTrackingActive]);

  const startTracking = () => {
    if (!selectedAircraft || !sessionRef || !deviceBinding || !user) return;
    if (conflictingAircraftSession) {
      toast({
        variant: 'destructive',
        title: 'Aircraft Already In Use',
        description: `${selectedAircraft.tailNumber} is already being broadcast by ${conflictingAircraftSession.pilotName || 'another device'}. Stop that session first or choose another registration.`,
      });
      return;
    }

    setIsTrackingActive(true);
    lastWriteRef.current = 0;
    setDocumentNonBlocking(
      sessionRef,
      {
        pilotId: user.uid,
        pilotName,
        aircraftId: selectedAircraft.id,
        aircraftRegistration: selectedAircraft.tailNumber,
        bookingId: selectedBooking?.id || '',
        status: 'active',
        deviceId: deviceBinding.deviceId,
        deviceLabel: savedDeviceLabel || deviceBinding.deviceLabel || '',
        activeLegIndex: activeLegState?.activeLegIndex ?? null,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    startWatching();
  };

  const stopTrackingSession = () => {
    stopWatching();
    setIsTrackingActive(false);
    if (!sessionRef) return;

    setDocumentNonBlocking(
      sessionRef,
      {
        status: 'completed',
        endedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1200px] flex-1 flex-col gap-6 overflow-y-auto p-4 pt-6 md:p-8">
      <Card className="border shadow-none">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest">
                  Pilot Surface
                </Badge>
                <Badge className="text-[10px] font-black uppercase tracking-widest">
                  Active Flight
                </Badge>
              </div>
              <CardTitle className="text-2xl font-black uppercase tracking-tight">
                Register This Device To An Aircraft
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm">
                The signed-in pilot starts here before live tracking begins. This page binds the current phone or tablet
                to an aircraft registration for the active session, then hands off to the moving-map workflow.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="font-black uppercase">
                <Link href="/operations/fleet-tracker">
                  <Radio className="mr-2 h-4 w-4" />
                  Open Fleet Tracker
                </Link>
              </Button>
              <Button asChild className="font-black uppercase">
                <Link href="/operations/flight-planner">
                  <Navigation className="mr-2 h-4 w-4" />
                  Route Planner
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border shadow-none">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest">Session Setup</CardTitle>
              <CardDescription>
                Choose which aircraft this device is broadcasting as, then continue into the pilot moving-map screen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border bg-muted/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Signed-In Pilot</p>
                  <p className="mt-2 text-sm font-black uppercase">{isUserLoading ? 'Loading profile...' : pilotName}</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {tenantId ? `Tenant: ${tenantId}` : 'Tenant not resolved yet'}
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Device Binding</p>
                  <p className="mt-2 break-all text-xs font-mono font-bold">
                    {deviceBinding?.deviceId || 'Generating local device id...'}
                  </p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Browser-backed session identity for this phone or tablet
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Device Label
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={deviceLabelInput}
                    onChange={(event) => setDeviceLabelInput(event.target.value)}
                    placeholder="e.g. Barry Samsung A54"
                    className="font-semibold"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="font-black uppercase"
                    onClick={() => {
                      setDeviceLabel(deviceLabelInput);
                      setSavedDeviceLabel(deviceLabelInput.trim());
                    }}
                  >
                    Save Label
                  </Button>
                </div>
                <p className="text-[10px] font-medium text-muted-foreground">
                  Saved label: {savedDeviceLabel || 'Not set yet'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Aircraft Registration
                </label>
                <Select value={selectedAircraftId} onValueChange={setSelectedAircraftId}>
                  <SelectTrigger className="font-semibold">
                    <SelectValue placeholder={isAircraftLoading ? 'Loading aircraft...' : 'Select an aircraft'} />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedAircraft.map((aircraft) => (
                      <SelectItem key={aircraft.id} value={aircraft.id}>
                        {aircraft.tailNumber} {aircraft.make ? `• ${aircraft.make} ${aircraft.model || ''}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isAircraftLoading && sortedAircraft.length === 0 && (
                  <p className="text-[10px] font-medium text-muted-foreground">
                    No aircraft are available in this tenant yet.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Booking / Navlog Route
                </label>
                <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
                  <SelectTrigger className="font-semibold">
                    <SelectValue placeholder="Select a booking with a navlog" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidateBookings.map((booking) => (
                      <SelectItem key={booking.id} value={booking.id}>
                        #{booking.bookingNumber} • {booking.date} • {(booking.navlog?.legs?.length || 0)} legs
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] font-medium text-muted-foreground">
                  Optional for now, but selecting a booking will draw its navlog route on the live pilot map.
                </p>
              </div>

              <div className="rounded-xl border border-dashed bg-background p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Next Wiring Step</p>
                <p className="mt-2 text-sm font-medium">
                  This slice now writes the signed-in device coordinates to a live session document over Firestore while
                  tracking is running. The next step is feeding that stream into the full moving map.
                </p>
              </div>

              {conflictingAircraftSession && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                  {selectedAircraft?.tailNumber} is already active on another device for{' '}
                  <span className="font-black">{conflictingAircraftSession.pilotName || 'another pilot'}</span>.
                  Stop that session first or choose another aircraft.
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <Button
                  className="w-full font-black uppercase"
                  disabled={!selectedAircraft || !user || !!conflictingAircraftSession}
                  onClick={startTracking}
                >
                  <PlaneTakeoff className="mr-2 h-4 w-4" />
                  Start Tracking As {selectedAircraft?.tailNumber || 'Selected Aircraft'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full font-black uppercase"
                  disabled={!isTrackingActive}
                  onClick={stopTrackingSession}
                >
                  Stop Tracking
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border shadow-none">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest">Binding Preview</CardTitle>
                <CardDescription>What the live flight session will advertise to the school tracker.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-lg border bg-muted/10 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pilot</p>
                  <p className="mt-1 font-black uppercase">{pilotName}</p>
                </div>
                <div className="rounded-lg border bg-muted/10 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aircraft</p>
                  <p className="mt-1 font-black uppercase">{selectedAircraft?.tailNumber || 'Not selected yet'}</p>
                </div>
                <div className="rounded-lg border bg-muted/10 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Booking Route</p>
                  <p className="mt-1 font-black uppercase">
                    {selectedBooking ? `#${selectedBooking.bookingNumber}` : 'No route selected'}
                  </p>
                  <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                    {selectedLegs.length > 0 ? `${selectedLegs.length} navlog legs ready for overlay` : 'Select a booking to draw the route'}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/10 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Device Label</p>
                  <p className="mt-1 font-black">{savedDeviceLabel || 'Unnamed device'}</p>
                </div>
                <div className="rounded-lg border bg-muted/10 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tracking State</p>
                  <p className="mt-1 font-black uppercase">
                    {isTrackingActive ? (isWatching ? 'Broadcasting Live' : 'Starting GPS') : 'Idle'}
                  </p>
                  <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                    Permission: {permissionState}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-none">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest">Pilot Live Map</CardTitle>
                <CardDescription>
                  Live ownship position with the selected booking route overlaid from navlog legs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActiveFlightLiveMap
                  booking={selectedBooking}
                  legs={selectedLegs}
                  position={position}
                  aircraftRegistration={selectedAircraft?.tailNumber}
                  activeLegIndex={activeLegState?.activeLegIndex}
                />
              </CardContent>
            </Card>

            <Card className="border shadow-none">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest">Active Leg Status</CardTitle>
                <CardDescription>
                  Live next-waypoint guidance derived from the selected booking route and this device position.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {activeLegState ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border bg-muted/10 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current Leg</p>
                        <p className="mt-1 font-black uppercase">
                          {activeLegState.fromWaypoint || 'Origin'} to {activeLegState.toWaypoint || 'Next'}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/10 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Leg State</p>
                        <p className="mt-1 font-black uppercase">
                          {activeLegState.hasArrived ? 'At Waypoint' : `Leg ${activeLegState.activeLegIndex + 1}`}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border bg-muted/10 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Distance To Next</p>
                        <p className="mt-1 font-black">
                          {activeLegState.distanceToNextNm != null ? `${activeLegState.distanceToNextNm.toFixed(1)} NM` : 'Unavailable'}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/10 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bearing To Next</p>
                        <p className="mt-1 font-black">
                          {activeLegState.bearingToNext != null ? `${activeLegState.bearingToNext.toFixed(0)}°` : 'Unavailable'}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/10 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">ETA To Next</p>
                        <p className="mt-1 font-black">
                          {activeLegState.etaToNextMinutes != null ? `${activeLegState.etaToNextMinutes.toFixed(0)} min` : 'Unavailable'}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border bg-muted/10 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cross Track Error</p>
                        <p className="mt-1 font-black">
                          {activeLegState.crossTrackErrorNm != null ? `${activeLegState.crossTrackErrorNm.toFixed(2)} NM` : 'Unavailable'}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/10 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Course Status</p>
                        <p
                          className={`mt-1 font-black uppercase ${
                            activeLegState.onCourse === undefined
                              ? ''
                              : activeLegState.onCourse
                                ? 'text-emerald-600'
                                : 'text-destructive'
                          }`}
                        >
                          {activeLegState.onCourse === undefined
                            ? 'Unavailable'
                            : activeLegState.onCourse
                              ? 'On Course'
                              : 'Off Course'}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="font-black uppercase"
                        disabled={manualLegIndex <= 0}
                        onClick={() => setManualLegIndex((current) => Math.max(0, current - 1))}
                      >
                        Previous Leg
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="font-black uppercase"
                        disabled={manualLegIndex >= Math.max(0, selectedLegs.length - 2)}
                        onClick={() =>
                          setManualLegIndex((current) => Math.min(Math.max(0, selectedLegs.length - 2), current + 1))
                        }
                      >
                        Next Leg
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground">
                    Select a booking with navlog legs and start tracking to compute the active leg.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border shadow-none">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest">Live Device Coordinates</CardTitle>
                <CardDescription>Current position being sent over the network from this signed-in device.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {position ? (
                  <>
                    <div className="rounded-lg border bg-muted/10 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Latitude / Longitude</p>
                      <p className="mt-1 font-mono font-bold">
                        {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border bg-muted/10 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Accuracy</p>
                        <p className="mt-1 font-black">{position.accuracy ? `${Math.round(position.accuracy)} m` : 'Unknown'}</p>
                      </div>
                      <div className="rounded-lg border bg-muted/10 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ground Speed</p>
                        <p className="mt-1 font-black">
                          {position.speedKt != null ? `${position.speedKt.toFixed(1)} kt` : 'Unavailable'}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-lg border bg-muted/10 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Last Network Payload</p>
                      <p className="mt-1 text-[11px] font-medium">
                        {position.timestamp}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground">
                    Start tracking to stream this device's coordinates into the active flight session.
                  </div>
                )}
                {geolocationError && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                    {geolocationError}
                  </div>
                )}
                <Button asChild variant="outline" className="w-full font-black uppercase">
                  <Link href="/operations/fleet-tracker">
                    <MapPinned className="mr-2 h-4 w-4" />
                    View In Fleet Tracker
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border shadow-none">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest">Pilot Workflow</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3 rounded-lg border bg-muted/10 p-3">
                  <Smartphone className="mt-0.5 h-4 w-4 text-primary" />
                  <p>Sign in on mobile and register the device against the aircraft you are flying.</p>
                </div>
                <div className="flex items-start gap-3 rounded-lg border bg-muted/10 p-3">
                  <Navigation className="mt-0.5 h-4 w-4 text-primary" />
                  <p>Launch the moving map and monitor progress against your navlog route.</p>
                </div>
                <div className="flex items-start gap-3 rounded-lg border bg-muted/10 p-3">
                  <TimerReset className="mt-0.5 h-4 w-4 text-primary" />
                  <p>The school fleet tracker will subscribe to the same live session and show your latest aircraft state.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
