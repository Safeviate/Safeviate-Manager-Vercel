'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Navigation, PlaneTakeoff, Radio } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTheme } from '@/components/theme-provider';
import type { Aircraft } from '@/types/aircraft';
import type { Booking } from '@/types/booking';
import type { FlightPosition, FlightSession } from '@/types/flight-session';
import { getOrCreateDeviceBinding, setDeviceLabel } from '@/lib/flight-session';
import { useGeolocationTrack } from '@/hooks/use-geolocation-track';
import { getActiveLegState } from '@/lib/active-flight';
import { cn } from '@/lib/utils';

const BREADCRUMB_SAMPLE_MS = 15000;
const MAX_BREADCRUMB_POINTS = 60;

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

export default function ActiveFlightPage() {
  const { toast } = useToast();
  const { tenantId, userProfile, isLoading: isUserLoading } = useUserProfile();
  const { uiMode } = useTheme();
  const [selectedAircraftId, setSelectedAircraftId] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [deviceLabelInput, setDeviceLabelInput] = useState('');
  const [savedDeviceLabel, setSavedDeviceLabel] = useState('');
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [manualLegIndex, setManualLegIndex] = useState(0);
  const [aircrafts, setAircrafts] = useState<Aircraft[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [flightSessions, setFlightSessions] = useState<FlightSession[]>([]);
  const [isFullscreenMapOpen, setIsFullscreenMapOpen] = useState(false);
  const lastWriteRef = useRef(0);
  const { position, error: geolocationError, permissionState, isWatching, startWatching, stopWatching } = useGeolocationTrack();
  const isModern = uiMode === 'modern';

  useEffect(() => {
    const binding = getOrCreateDeviceBinding();
    if (!binding) return;
    setSavedDeviceLabel(binding.deviceLabel || '');
    setDeviceLabelInput(binding.deviceLabel || '');
  }, []);

  useEffect(() => {
    const load = async () => {
      const [scheduleRes, sessionsRes] = await Promise.all([fetch('/api/schedule-data'), fetch('/api/flight-sessions', { cache: 'no-store' })]);
      if (scheduleRes.ok) {
        const data = await scheduleRes.json();
        setAircrafts(data.aircraft || []);
        setBookings(data.bookings || []);
      }
      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setFlightSessions(Array.isArray(data.sessions) ? data.sessions : []);
      }
    };
    void load();
  }, []);

  const persistSessions = async (next: FlightSession[]) => {
    setFlightSessions(next);
    const current = next[next.length - 1];
    if (!current) return;
    await fetch('/api/flight-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: current }),
    });
  };

  const sortedAircraft = useMemo(() => [...aircrafts].sort((a, b) => a.tailNumber.localeCompare(b.tailNumber)), [aircrafts]);
  const selectedAircraft = useMemo(() => sortedAircraft.find((aircraft) => aircraft.id === selectedAircraftId) || null, [selectedAircraftId, sortedAircraft]);
  const candidateBookings = useMemo(() => bookings.filter((booking) => !selectedAircraftId || booking.aircraftId === selectedAircraftId).filter((booking) => (booking.navlog?.legs?.length || 0) > 0).sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()), [bookings, selectedAircraftId]);
  const selectedBooking = useMemo(() => candidateBookings.find((booking) => booking.id === selectedBookingId) || null, [candidateBookings, selectedBookingId]);
  const selectedLegs = selectedBooking?.navlog?.legs || [];
  const activeLegState = useMemo(() => getActiveLegState(selectedLegs, position, manualLegIndex), [selectedLegs, position, manualLegIndex]);
  const deviceBinding = useMemo(() => getOrCreateDeviceBinding(), [savedDeviceLabel]);
  const pilotName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Pilot';
  const liveTelemetry = {
    speed: activeLegState?.groundSpeedKt ?? position?.speedKt ?? null,
    altitude: position?.altitude ?? null,
    heading: position?.headingTrue ?? null,
    trailPoints: flightSessions.find((session) => session.deviceId === deviceBinding?.deviceId)?.breadcrumb?.length ?? (position ? 1 : 0),
  };

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

  useEffect(() => setManualLegIndex(0), [selectedBookingId]);
  useEffect(() => { if (activeLegState && activeLegState.activeLegIndex !== manualLegIndex) setManualLegIndex(activeLegState.activeLegIndex); }, [activeLegState, manualLegIndex]);

  const conflictingAircraftSession = useMemo(() => {
    if (!selectedAircraft || !deviceBinding?.deviceId) return null;
    return flightSessions.find((session) => session.status === 'active' && session.aircraftId === selectedAircraft.id && session.deviceId !== deviceBinding.deviceId) || null;
  }, [deviceBinding?.deviceId, flightSessions, selectedAircraft]);

  useEffect(() => {
    if (!isTrackingActive || !position || !selectedAircraft || !deviceBinding) return;
    const now = Date.now();
    if (now - lastWriteRef.current < 5000) return;
    lastWriteRef.current = now;
    const existingSession = flightSessions.find((session) => session.deviceId === deviceBinding.deviceId);
    const next = flightSessions.filter((session) => session.deviceId !== deviceBinding.deviceId).concat({
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
      startedAt: flightSessions.find((session) => session.deviceId === deviceBinding.deviceId)?.startedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastPosition: position,
      breadcrumb: buildBreadcrumb(existingSession?.breadcrumb, position),
      distanceToNextNm: activeLegState?.distanceToNextNm,
      bearingToNext: activeLegState?.bearingToNext,
      etaToNextMinutes: activeLegState?.etaToNextMinutes,
      crossTrackErrorNm: activeLegState?.crossTrackErrorNm,
      onCourse: activeLegState?.onCourse,
      groundSpeedKt: activeLegState?.groundSpeedKt ?? position.speedKt ?? null,
    });
    void persistSessions(next);
  }, [activeLegState, deviceBinding, flightSessions, isTrackingActive, pilotName, position, savedDeviceLabel, selectedAircraft, selectedBooking?.id, userProfile?.id]);

  const startTracking = () => {
    if (!selectedAircraft || !deviceBinding) return;
    if (conflictingAircraftSession) {
      toast({ variant: 'destructive', title: 'Aircraft Already In Use', description: `${selectedAircraft.tailNumber} is already active on another device.` });
      return;
    }
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
    void persistSessions(flightSessions.map((session) => session.deviceId === deviceBinding.deviceId ? { ...session, status: 'completed', endedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : session));
  };

  return (
    <div className={cn('mx-auto flex min-h-full w-full max-w-[1200px] flex-1 flex-col gap-6 overflow-y-auto p-4 pt-6 md:p-8', isModern && 'gap-7')}>
      {isModern && (
        <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.15),_transparent_34%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(15,23,42,0.95)_40%,_rgba(30,41,59,0.94))] px-6 py-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.22)] md:px-8 md:py-7">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,_rgba(45,212,191,0.16),_transparent_62%)] md:block" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-sky-100/80">Pilot Surface</p>
              <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight md:text-4xl">Track your own live flight from one focused cockpit.</h1>
                <p className="max-w-xl text-sm text-slate-200/85 md:text-[15px]">
                  Bind this device to an aircraft, stream live telemetry, and follow the loaded navlog route in a cleaner in-flight surface.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge className="border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white hover:bg-white/10">
                  {selectedAircraft?.tailNumber || 'aircraft not selected'}
                </Badge>
                <Badge className="border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white hover:bg-white/10">
                  {isTrackingActive ? 'tracking active' : 'tracking idle'}
                </Badge>
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

      <Card className={cn('border shadow-none', isModern && 'overflow-hidden border-slate-200/80 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.08)]')}>
        <CardHeader className={cn('border-b bg-muted/20', isModern && 'bg-transparent')}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn('text-[10px] font-black uppercase tracking-widest', isModern && 'border-slate-200 bg-slate-50 text-slate-700')}>Pilot Surface</Badge>
                <Badge className={cn('text-[10px] font-black uppercase tracking-widest', isModern && 'border-slate-200 bg-sky-50 text-sky-800 hover:bg-sky-50')}>Active Flight</Badge>
              </div>
              <CardTitle className="text-2xl font-black uppercase tracking-tight">Register This Device To An Aircraft</CardTitle>
              <CardDescription className="max-w-3xl text-sm">Instructors and pilots use this page to track their own live position. It binds the current phone or tablet to an aircraft registration and streams route progress, heading, speed, and altitude.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className={cn('font-black uppercase', isModern && 'border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50')}><Link href="/operations/fleet-tracker"><Radio className="mr-2 h-4 w-4" />Open Fleet Tracker</Link></Button>
              <Button asChild className={cn('font-black uppercase', isModern && 'bg-slate-900 text-white shadow-sm hover:bg-slate-800')}><Link href="/operations/flight-planner"><Navigation className="mr-2 h-4 w-4" />Route Planner</Link></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className={cn('border shadow-none', isModern && 'border-slate-200/80 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]')}>
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest">Session Setup</CardTitle>
              <CardDescription>Choose which aircraft this device is broadcasting as.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className={cn('rounded-xl border bg-muted/10 p-4', isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/70')}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Signed-In Pilot</p>
                  <p className="mt-2 text-sm font-black uppercase">{isUserLoading ? 'Loading profile...' : pilotName}</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{tenantId ? `Tenant: ${tenantId}` : 'Tenant not resolved yet'}</p>
                </div>
                <div className={cn('rounded-xl border bg-muted/10 p-4', isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/70')}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Device Binding</p>
                  <p className="mt-2 break-all text-xs font-mono font-bold">{deviceBinding?.deviceId || 'Generating local device id...'}</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Browser-backed session identity for this phone or tablet</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="device-label-input" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Device Label</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input id="device-label-input" value={deviceLabelInput} onChange={(event) => setDeviceLabelInput(event.target.value)} placeholder="e.g. Barry Samsung A54" className="font-semibold" />
                  <Button type="button" variant="outline" className={cn('font-black uppercase', isModern && 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50')} onClick={() => { setDeviceLabel(deviceLabelInput); setSavedDeviceLabel(deviceLabelInput.trim()); }}>Save Label</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="active-flight-aircraft-select" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aircraft Registration</Label>
                <Select value={selectedAircraftId} onValueChange={setSelectedAircraftId}>
                  <SelectTrigger id="active-flight-aircraft-select" aria-label="Aircraft registration" className="font-semibold"><SelectValue placeholder="Select an aircraft" /></SelectTrigger>
                  <SelectContent>{sortedAircraft.map((aircraft) => <SelectItem key={aircraft.id} value={aircraft.id}>{aircraft.tailNumber}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="active-flight-booking-select" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Booking / Navlog Route</Label>
                <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
                  <SelectTrigger id="active-flight-booking-select" aria-label="Booking or navlog route" className="font-semibold"><SelectValue placeholder="Select a booking with a navlog" /></SelectTrigger>
                  <SelectContent>{candidateBookings.map((booking) => <SelectItem key={booking.id} value={booking.id}>#{booking.bookingNumber} • {booking.date} • {(booking.navlog?.legs?.length || 0)} legs</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Button className={cn('w-full font-black uppercase', isModern && 'bg-slate-900 text-white shadow-sm hover:bg-slate-800')} disabled={!selectedAircraft || !!conflictingAircraftSession} onClick={startTracking}><PlaneTakeoff className="mr-2 h-4 w-4" />Start Tracking</Button>
                <Button variant="outline" className={cn('w-full font-black uppercase', isModern && 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50')} disabled={!isTrackingActive} onClick={stopTrackingSession}>Stop Tracking</Button>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card className={cn('border shadow-none', isModern && 'border-slate-200/80 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]')}>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest">Pilot Live Map</CardTitle>
                  <CardDescription>Ownship track, loaded flight path, and live route progress.</CardDescription>
                </div>
                <Dialog open={isFullscreenMapOpen} onOpenChange={setIsFullscreenMapOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className={cn('font-black uppercase', isModern && 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50')}>Full Screen</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[96vw] h-[92vh] p-4">
                    <DialogHeader>
                      <DialogTitle className="font-black uppercase">Full Flight Tracking View</DialogTitle>
                      <DialogDescription>Ownship position, loaded navlog route, and live telemetry.</DialogDescription>
                    </DialogHeader>
                    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[1.35fr_0.65fr]">
                      <div className="min-h-[60vh] overflow-hidden rounded-2xl border">
                        <ActiveFlightLiveMap booking={selectedBooking} legs={selectedLegs} position={position} aircraftRegistration={selectedAircraft?.tailNumber} activeLegIndex={activeLegState?.activeLegIndex} />
                      </div>
                      <div className="space-y-4 overflow-y-auto pr-1">
                        <Card className={cn('border shadow-none', isModern && 'border-slate-200/80 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]')}>
                          <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest">Live Telemetry</CardTitle></CardHeader>
                          <CardContent className="grid grid-cols-2 gap-3 text-sm">
                            <div className={cn('rounded-lg border bg-muted/10 p-3', isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/70')}><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Heading</p><p className="mt-1 text-base font-black">{liveTelemetry.heading != null ? `${liveTelemetry.heading.toFixed(0)}°` : 'N/A'}</p></div>
                            <div className={cn('rounded-lg border bg-muted/10 p-3', isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/70')}><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Speed</p><p className="mt-1 text-base font-black">{liveTelemetry.speed != null ? `${liveTelemetry.speed.toFixed(0)} kt` : 'N/A'}</p></div>
                            <div className={cn('rounded-lg border bg-muted/10 p-3', isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/70')}><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Altitude</p><p className="mt-1 text-base font-black">{liveTelemetry.altitude != null ? `${Math.round(liveTelemetry.altitude)} m` : 'N/A'}</p></div>
                            <div className={cn('rounded-lg border bg-muted/10 p-3', isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/70')}><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Breadcrumb</p><p className="mt-1 text-base font-black">{liveTelemetry.trailPoints} pts</p></div>
                          </CardContent>
                        </Card>
                        <Card className={cn('border shadow-none', isModern && 'border-slate-200/80 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]')}>
                          <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest">Route Progress</CardTitle></CardHeader>
                          <CardContent className="space-y-3 text-sm">
                            {activeLegState ? (
                              <>
                                <div className={cn('rounded-lg border bg-muted/10 p-3', isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/70')}><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">From</p><p className="mt-1 font-black">{activeLegState.fromWaypoint || 'N/A'}</p></div>
                                <div className={cn('rounded-lg border bg-muted/10 p-3', isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/70')}><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">To</p><p className="mt-1 font-black">{activeLegState.toWaypoint || 'N/A'}</p></div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className={cn('rounded-lg border bg-muted/10 p-3', isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/70')}><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Distance</p><p className="mt-1 font-black">{activeLegState.distanceToNextNm != null ? `${activeLegState.distanceToNextNm.toFixed(1)} NM` : 'N/A'}</p></div>
                                  <div className={cn('rounded-lg border bg-muted/10 p-3', isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/70')}><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bearing</p><p className="mt-1 font-black">{activeLegState.bearingToNext != null ? `${activeLegState.bearingToNext.toFixed(0)}°` : 'N/A'}</p></div>
                                </div>
                              </>
                            ) : (
                              <div className={cn('rounded-lg border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground', isModern && 'rounded-2xl border-slate-200 bg-slate-50/70 text-slate-500')}>Select a booking with a navlog and start tracking to populate route progress.</div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className={cn('rounded-lg border bg-muted/10 p-3', isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/70')}><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Heading</p><p className="mt-1 text-sm font-black">{liveTelemetry.heading != null ? `${liveTelemetry.heading.toFixed(0)}°` : 'N/A'}</p></div>
                  <div className={cn('rounded-lg border bg-muted/10 p-3', isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/70')}><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Speed</p><p className="mt-1 text-sm font-black">{liveTelemetry.speed != null ? `${liveTelemetry.speed.toFixed(0)} kt` : 'N/A'}</p></div>
                  <div className={cn('rounded-lg border bg-muted/10 p-3', isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/70')}><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Altitude</p><p className="mt-1 text-sm font-black">{liveTelemetry.altitude != null ? `${Math.round(liveTelemetry.altitude)} m` : 'N/A'}</p></div>
                  <div className={cn('rounded-lg border bg-muted/10 p-3', isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/70')}><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Trail</p><p className="mt-1 text-sm font-black">{liveTelemetry.trailPoints} pts</p></div>
                </div>
                <ActiveFlightLiveMap booking={selectedBooking} legs={selectedLegs} position={position} aircraftRegistration={selectedAircraft?.tailNumber} activeLegIndex={activeLegState?.activeLegIndex} />
              </CardContent>
            </Card>
            <Card className={cn('border shadow-none', isModern && 'border-slate-200/80 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]')}>
              <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest">Active Leg Status</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">{activeLegState ? <div className={cn('rounded-lg border bg-muted/10 p-3 text-xs font-medium', isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/70')}>Next waypoint {activeLegState.toWaypoint || 'N/A'} | {activeLegState.distanceToNextNm != null ? `${activeLegState.distanceToNextNm.toFixed(1)} NM` : 'Unavailable'}</div> : <div className={cn('rounded-lg border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground', isModern && 'rounded-2xl border-slate-200 bg-slate-50/70 text-slate-500')}>Select a booking and start tracking to compute the active leg.</div>}</CardContent>
            </Card>
            <Card className={cn('border shadow-none', isModern && 'border-slate-200/80 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]')}>
              <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest">Live Device Coordinates</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">{position ? <div className={cn('rounded-lg border bg-muted/10 p-3 text-xs font-mono font-bold', isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/70')}>{position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}</div> : <div className={cn('rounded-lg border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground', isModern && 'rounded-2xl border-slate-200 bg-slate-50/70 text-slate-500')}>Start tracking to stream coordinates.</div>}{geolocationError && <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{geolocationError}</div>}<p className="text-[10px] text-muted-foreground">Permission: {permissionState} · {isWatching ? 'watching' : 'idle'}</p></CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
