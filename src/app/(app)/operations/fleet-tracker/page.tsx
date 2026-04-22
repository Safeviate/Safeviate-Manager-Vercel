'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { Layers3, Loader2, RadioTower, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenuCheckboxItem, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useTenantConfig } from '@/hooks/use-tenant-config';
import type { Booking, NavlogLeg } from '@/types/booking';
import type { FlightSession } from '@/types/flight-session';
import { getFlightSessionFreshnessLabel, isFlightSessionStale } from '@/lib/flight-session-status';
import { isHrefEnabledForIndustry, shouldBypassIndustryRestrictions } from '@/lib/industry-access';
import { HEADER_SECONDARY_BUTTON_CLASS } from '@/components/page-header';
import { OPERATIONS_MAP_CARD_CLASS } from '@/components/operations/operations-map-layout';
import { MOBILE_ACTION_MENU_ITEM_CLASS, MOBILE_ACTION_MENU_STATE_ITEM_CLASS, MobileActionDropdown } from '@/components/mobile-action-dropdown';

const FleetTrackerMap = dynamic(() => import('@/components/fleet-tracker/fleet-tracker-map').then((module) => module.FleetTrackerMap), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed bg-slate-950 px-6 py-12 text-center text-slate-100">
      <div className="space-y-4">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-400" />
        <p className="text-sm font-black uppercase tracking-widest">Loading Fleet Map</p>
      </div>
    </div>
  ),
});

export default function FleetTrackerPage() {
  const { toast } = useToast();
  const { tenant, isLoading: isTenantLoading } = useTenantConfig();
  const [sessions, setSessions] = useState<FlightSession[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEndingStaleSessions, setIsEndingStaleSessions] = useState(false);
  const [activeBroadcastsOpen, setActiveBroadcastsOpen] = useState(false);
  const [showLayerSelectorOpen, setShowLayerSelectorOpen] = useState(false);
  const [showLayerLevelsOpen, setShowLayerLevelsOpen] = useState(false);
  const operationalSessions = useMemo(() => sessions.filter((session) => session.status === 'active'), [sessions]);
  const activeSessionCount = useMemo(() => operationalSessions.filter((session) => !isFlightSessionStale(session)).length, [operationalSessions]);
  const staleSessionCount = useMemo(() => operationalSessions.filter((session) => isFlightSessionStale(session)).length, [operationalSessions]);
  const loadSessions = async () => {
    setIsRefreshing(true);
    const [sessionsResponse, bookingsResponse] = await Promise.all([
      fetch('/api/flight-sessions', { cache: 'no-store' }),
      fetch('/api/bookings', { cache: 'no-store' }),
    ]);

    if (sessionsResponse.ok) {
      const data = await sessionsResponse.json();
      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
    }

    if (bookingsResponse.ok) {
      const data = await bookingsResponse.json();
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
    }

    if (sessionsResponse.ok || bookingsResponse.ok) {
      setLastRefreshedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadSessions();
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadSessions();
      }
    };

    window.addEventListener('focus', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const sortedSessions = useMemo(
    () => [...operationalSessions].sort((a, b) => (a.aircraftRegistration || '').localeCompare(b.aircraftRegistration || '')),
    [operationalSessions]
  );

  const navlogRoutesByBookingId = useMemo(() => {
    return bookings.reduce<Record<string, NavlogLeg[]>>(
      (acc, booking) => {
        if (!booking?.id || !booking.navlog?.legs?.length) return acc;
        const validLegs = booking.navlog.legs.filter((leg) => leg.latitude !== undefined && leg.longitude !== undefined);
        if (validLegs.length > 1) {
          acc[booking.id] = validLegs;
        }
        return acc;
      },
      {}
    );
  }, [bookings]);

  const clearStaleSession = async (session: FlightSession) => {
    const response = await fetch(`/api/flight-sessions?id=${session.id}`, { method: 'DELETE' });
    if (!response.ok) {
      toast({ variant: 'destructive', title: 'Could Not End Session', description: `${session.aircraftRegistration} could not be cleared right now.` });
      return;
    }

    setSessions((current) => current.filter((item) => item.id !== session.id));
    toast({ title: 'Stale Session Ended', description: `${session.aircraftRegistration} was cleared from the active fleet tracker.` });
  };

  const clearAllStaleSessions = async () => {
    const staleSessions = operationalSessions.filter((session) => isFlightSessionStale(session));
    if (!staleSessions.length) return;

    setIsEndingStaleSessions(true);
    let clearedCount = 0;

    try {
      for (const session of staleSessions) {
        const response = await fetch(`/api/flight-sessions?id=${session.id}`, { method: 'DELETE' });
        if (response.ok) {
          clearedCount += 1;
        }
      }

      if (clearedCount > 0) {
        setSessions((current) => current.filter((session) => !staleSessions.some((stale) => stale.id === session.id)));
        toast({
          title: 'Stale Sessions Ended',
          description: `${clearedCount} stale session${clearedCount === 1 ? '' : 's'} cleared from fleet tracker.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Could Not End Stale Sessions',
          description: 'No stale sessions could be cleared right now.',
        });
      }
    } finally {
      setIsEndingStaleSessions(false);
    }
  };

  if (isTenantLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed bg-background px-6 py-12 text-center">
        <div className="space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm font-black uppercase tracking-widest">Loading Fleet Tracker</p>
        </div>
      </div>
    );
  }

  if (
    !shouldBypassIndustryRestrictions(tenant?.id) &&
    !isHrefEnabledForIndustry('/operations/fleet-tracker', tenant?.industry) &&
    !(tenant?.enabledMenus?.includes('/operations/fleet-tracker') ?? false)
  ) {
    return (
      <Card className="mx-auto w-full max-w-3xl border shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl font-black uppercase tracking-tight">Fleet Tracker Unavailable</CardTitle>
          <CardDescription>This live aircraft monitoring surface is only available for aviation tenants.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="font-black uppercase">Back to Operations</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1100px] flex-col gap-4 overflow-hidden px-1">
        <Card className={OPERATIONS_MAP_CARD_CLASS}>
          <CardHeader className="border-b bg-background px-2 py-1.5 md:px-3 md:py-2">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-sm font-black uppercase tracking-widest">Fleet Tracker</CardTitle>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest">
                  {activeSessionCount} active
                </Badge>
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest">
                  {staleSessionCount} stale
                </Badge>
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest">
                  {lastRefreshedAt ? `Updated ${lastRefreshedAt}` : 'Waiting'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <div className="border-b bg-background px-2 py-1.5 md:px-3 md:py-2">
            <div className="flex items-center justify-center gap-1.5 md:gap-2" aria-label="Fleet tracker action bar">
              <div className="hidden items-center justify-center gap-1.5 md:flex md:gap-2">
                <Button type="button" variant="outline" className="h-8 gap-1.5 border bg-background/90 px-3 text-[9px] font-black uppercase tracking-[0.08em] shadow-sm backdrop-blur" onClick={() => void loadSessions()} disabled={isRefreshing}>
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing' : 'Refresh'}
                </Button>
                <Button type="button" variant="outline" className="h-8 gap-1.5 border bg-background/90 px-3 text-[9px] font-black uppercase tracking-[0.08em] shadow-sm backdrop-blur" onClick={() => setShowLayerSelectorOpen((current) => !current)}>
                  <Layers3 className="h-4 w-4" />
                  Layers
                </Button>
                <Button type="button" variant="outline" className="h-8 gap-1.5 border bg-background/90 px-3 text-[9px] font-black uppercase tracking-[0.08em] shadow-sm backdrop-blur" onClick={() => setShowLayerLevelsOpen((current) => !current)}>
                  <SlidersHorizontal className="h-4 w-4" />
                  Map Zoom
                </Button>
                <Button type="button" variant="outline" className="h-8 gap-1.5 border bg-background/90 px-3 text-[9px] font-black uppercase tracking-[0.08em] shadow-sm backdrop-blur" onClick={() => setActiveBroadcastsOpen(true)}>
                  <RadioTower className="h-4 w-4" />
                  Active Broadcasts
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 gap-1.5 border bg-background/90 px-3 text-[9px] font-black uppercase tracking-[0.08em] shadow-sm backdrop-blur"
                  onClick={() => void clearAllStaleSessions()}
                  disabled={staleSessionCount === 0 || isEndingStaleSessions}
                >
                  {isEndingStaleSessions ? 'Ending Stale...' : 'End Stale Sessions'}
                </Button>
              </div>
              <div className="w-full md:hidden">
                <MobileActionDropdown icon={RadioTower} label="Actions">
                  <DropdownMenuItem
                    onClick={() => void loadSessions()}
                    disabled={isRefreshing}
                    className={MOBILE_ACTION_MENU_ITEM_CLASS}
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing' : 'Refresh'}
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
                  <DropdownMenuItem onClick={() => setActiveBroadcastsOpen(true)} className={MOBILE_ACTION_MENU_ITEM_CLASS}>
                    <RadioTower className="h-4 w-4" />
                    Active Broadcasts
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => void clearAllStaleSessions()}
                    disabled={staleSessionCount === 0 || isEndingStaleSessions}
                    className={MOBILE_ACTION_MENU_ITEM_CLASS}
                  >
                    {isEndingStaleSessions ? 'Ending Stale...' : 'End Stale Sessions'}
                  </DropdownMenuItem>
                </MobileActionDropdown>
              </div>
            </div>
          </div>
          <div className="border-b bg-white">
            <div className="grid grid-cols-2 gap-px bg-slate-200/80 md:grid-cols-4">
              {[
                { label: 'Active', value: `${activeSessionCount}` },
                { label: 'Stale', value: `${staleSessionCount}` },
                { label: 'Visible', value: `${sortedSessions.length}` },
                { label: 'Refresh', value: lastRefreshedAt || 'Waiting' },
              ].map((item) => (
                <div key={item.label} className="flex min-w-0 items-center gap-1 bg-white px-2 py-1.5 md:px-3">
                  <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">{item.label}</span>
                  <span className="min-w-0 truncate text-[10px] font-black leading-none text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
          <CardContent className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/5 p-0">
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <div className="absolute inset-0">
                <FleetTrackerMap
                  sessions={sortedSessions}
                  navlogRoutesByBookingId={navlogRoutesByBookingId}
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
      <Dialog open={activeBroadcastsOpen} onOpenChange={setActiveBroadcastsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest">Active Broadcasts</DialogTitle>
            <DialogDescription>Live sessions currently visible on the fleet map.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {lastRefreshedAt ? <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Last refreshed {lastRefreshedAt}</p> : null}
            {sortedSessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">No active aircraft sessions yet.</div>
            ) : (
              sortedSessions.map((session) => (
                <div key={session.id} className={`rounded-2xl border p-4 ${isFlightSessionStale(session) ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200/90 bg-slate-50/70'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black uppercase">{session.aircraftRegistration}</p>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{session.pilotName}</p>
                    </div>
                    <Badge variant="outline" className={isFlightSessionStale(session) ? 'border-amber-300 bg-amber-100 text-amber-900' : ''}>
                      {isFlightSessionStale(session) ? 'Stale' : session.status}
                    </Badge>
                  </div>
                  {session.lastPosition ? (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      <div>{session.lastPosition.latitude.toFixed(6)}, {session.lastPosition.longitude.toFixed(6)}</div>
                      <div>Updated: {getFlightSessionFreshnessLabel(session)}</div>
                      <div>Speed: {session.groundSpeedKt != null ? `${session.groundSpeedKt.toFixed(0)} kt` : session.lastPosition.speedKt != null ? `${session.lastPosition.speedKt.toFixed(0)} kt` : 'N/A'}</div>
                      <div>Trail: {(session.breadcrumb || []).length} pts</div>
                    </div>
                  ) : null}
                  {isFlightSessionStale(session) ? (
                    <Button type="button" variant="outline" className={HEADER_SECONDARY_BUTTON_CLASS + ' mt-3'} onClick={() => clearStaleSession(session)}>
                      End Stale Session
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
