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
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { Aircraft } from '@/types/aircraft';
import type { Booking } from '@/types/booking';
import type { FlightSession } from '@/types/flight-session';
import { getOrCreateDeviceBinding, setDeviceLabel } from '@/lib/flight-session';
import { useGeolocationTrack } from '@/hooks/use-geolocation-track';
import { getActiveLegState } from '@/lib/active-flight';

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
  const [selectedAircraftId, setSelectedAircraftId] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [deviceLabelInput, setDeviceLabelInput] = useState('');
  const [savedDeviceLabel, setSavedDeviceLabel] = useState('');
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [manualLegIndex, setManualLegIndex] = useState(0);
  const [aircrafts, setAircrafts] = useState<Aircraft[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [flightSessions, setFlightSessions] = useState<FlightSession[]>([]);
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
    <div className="mx-auto flex min-h-full w-full max-w-[1200px] flex-1 flex-col gap-6 overflow-y-auto p-4 pt-6 md:p-8">
      <Card className="border shadow-none">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest">Pilot Surface</Badge>
                <Badge className="text-[10px] font-black uppercase tracking-widest">Active Flight</Badge>
              </div>
              <CardTitle className="text-2xl font-black uppercase tracking-tight">Register This Device To An Aircraft</CardTitle>
              <CardDescription className="max-w-3xl text-sm">The signed-in pilot starts here before live tracking begins. This page binds the current phone or tablet to an aircraft registration for the active session.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="font-black uppercase"><Link href="/operations/fleet-tracker"><Radio className="mr-2 h-4 w-4" />Open Fleet Tracker</Link></Button>
              <Button asChild className="font-black uppercase"><Link href="/operations/flight-planner"><Navigation className="mr-2 h-4 w-4" />Route Planner</Link></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border shadow-none">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest">Session Setup</CardTitle>
              <CardDescription>Choose which aircraft this device is broadcasting as.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border bg-muted/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Signed-In Pilot</p>
                  <p className="mt-2 text-sm font-black uppercase">{isUserLoading ? 'Loading profile...' : pilotName}</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{tenantId ? `Tenant: ${tenantId}` : 'Tenant not resolved yet'}</p>
                </div>
                <div className="rounded-xl border bg-muted/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Device Binding</p>
                  <p className="mt-2 break-all text-xs font-mono font-bold">{deviceBinding?.deviceId || 'Generating local device id...'}</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Browser-backed session identity for this phone or tablet</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="device-label-input" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Device Label</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input id="device-label-input" value={deviceLabelInput} onChange={(event) => setDeviceLabelInput(event.target.value)} placeholder="e.g. Barry Samsung A54" className="font-semibold" />
                  <Button type="button" variant="outline" className="font-black uppercase" onClick={() => { setDeviceLabel(deviceLabelInput); setSavedDeviceLabel(deviceLabelInput.trim()); }}>Save Label</Button>
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
                <Button className="w-full font-black uppercase" disabled={!selectedAircraft || !!conflictingAircraftSession} onClick={startTracking}><PlaneTakeoff className="mr-2 h-4 w-4" />Start Tracking</Button>
                <Button variant="outline" className="w-full font-black uppercase" disabled={!isTrackingActive} onClick={stopTrackingSession}>Stop Tracking</Button>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card className="border shadow-none">
              <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest">Pilot Live Map</CardTitle></CardHeader>
              <CardContent><ActiveFlightLiveMap booking={selectedBooking} legs={selectedLegs} position={position} aircraftRegistration={selectedAircraft?.tailNumber} activeLegIndex={activeLegState?.activeLegIndex} /></CardContent>
            </Card>
            <Card className="border shadow-none">
              <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest">Active Leg Status</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">{activeLegState ? <div className="rounded-lg border bg-muted/10 p-3 text-xs font-medium">Next waypoint {activeLegState.toWaypoint || 'N/A'} | {activeLegState.distanceToNextNm != null ? `${activeLegState.distanceToNextNm.toFixed(1)} NM` : 'Unavailable'}</div> : <div className="rounded-lg border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground">Select a booking and start tracking to compute the active leg.</div>}</CardContent>
            </Card>
            <Card className="border shadow-none">
              <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest">Live Device Coordinates</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">{position ? <div className="rounded-lg border bg-muted/10 p-3 text-xs font-mono font-bold">{position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}</div> : <div className="rounded-lg border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground">Start tracking to stream coordinates.</div>}{geolocationError && <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{geolocationError}</div>}<p className="text-[10px] text-muted-foreground">Permission: {permissionState} · {isWatching ? 'watching' : 'idle'}</p></CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
