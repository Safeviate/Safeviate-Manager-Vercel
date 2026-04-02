'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { collection, doc } from 'firebase/firestore';
import { MapPinned, Navigation, PlaneTakeoff, Radio, Smartphone, TimerReset } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { setDocumentNonBlocking } from '@/firebase';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { Aircraft } from '@/types/aircraft';
import { getOrCreateDeviceBinding, setDeviceLabel } from '@/lib/flight-session';
import { useGeolocationTrack } from '@/hooks/use-geolocation-track';

export default function ActiveFlightPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { tenantId, userProfile, isLoading: isUserLoading } = useUserProfile();
  const [selectedAircraftId, setSelectedAircraftId] = useState<string>('');
  const [deviceLabelInput, setDeviceLabelInput] = useState('');
  const [savedDeviceLabel, setSavedDeviceLabel] = useState<string>('');
  const [isTrackingActive, setIsTrackingActive] = useState(false);
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

  const deviceBinding = useMemo(() => getOrCreateDeviceBinding(), [savedDeviceLabel]);
  const pilotName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Pilot';
  const sessionRef = useMemoFirebase(() => {
    if (!firestore || !tenantId || !user) return null;
    return doc(firestore, `tenants/${tenantId}/flightSessions`, user.uid);
  }, [firestore, tenantId, user]);

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
        status: 'active',
        deviceId: deviceBinding.deviceId,
        deviceLabel: savedDeviceLabel || deviceBinding.deviceLabel || '',
        updatedAt: new Date().toISOString(),
        lastPosition: position,
        groundSpeedKt: position.speedKt ?? null,
      },
      { merge: true }
    );
  }, [deviceBinding, pilotName, position, savedDeviceLabel, selectedAircraft, sessionRef, user?.uid, isTrackingActive]);

  const startTracking = () => {
    if (!selectedAircraft || !sessionRef || !deviceBinding || !user) return;

    setIsTrackingActive(true);
    lastWriteRef.current = 0;
    setDocumentNonBlocking(
      sessionRef,
      {
        pilotId: user.uid,
        pilotName,
        aircraftId: selectedAircraft.id,
        aircraftRegistration: selectedAircraft.tailNumber,
        status: 'active',
        deviceId: deviceBinding.deviceId,
        deviceLabel: savedDeviceLabel || deviceBinding.deviceLabel || '',
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
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 p-4 pt-6 md:p-8">
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
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
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

              <div className="rounded-xl border border-dashed bg-background p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Next Wiring Step</p>
                <p className="mt-2 text-sm font-medium">
                  This slice now writes the signed-in device coordinates to a live session document over Firestore while
                  tracking is running. The next step is feeding that stream into the full moving map.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Button className="w-full font-black uppercase" disabled={!selectedAircraft || !user} onClick={startTracking}>
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
                    <div className="grid grid-cols-2 gap-3">
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
