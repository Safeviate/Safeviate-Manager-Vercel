'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Navigation, PlaneTakeoff, RadioTower, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/components/theme-provider';
import type { FlightSession } from '@/types/flight-session';
import { getFlightSessionFreshnessLabel, isFlightSessionStale } from '@/lib/flight-session-status';
import { cn } from '@/lib/utils';

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
  const { uiMode } = useTheme();
  const [sessions, setSessions] = useState<FlightSession[]>([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isModern = uiMode === 'modern';
  const activeSessionCount = useMemo(() => sessions.filter((session) => session.status === 'active' && !isFlightSessionStale(session)).length, [sessions]);
  const staleSessionCount = useMemo(() => sessions.filter((session) => session.status === 'active' && isFlightSessionStale(session)).length, [sessions]);
  const endedSessionCount = useMemo(() => sessions.filter((session) => session.status !== 'active').length, [sessions]);

  const loadSessions = async () => {
    setIsRefreshing(true);
    const res = await fetch('/api/flight-sessions', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
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

  const sortedSessions = useMemo(() => [...sessions].sort((a, b) => (a.aircraftRegistration || '').localeCompare(b.aircraftRegistration || '')), [sessions]);

  const clearStaleSession = async (session: FlightSession) => {
    const response = await fetch(`/api/flight-sessions?id=${session.id}`, { method: 'DELETE' });
    if (!response.ok) {
      toast({ variant: 'destructive', title: 'Could Not End Session', description: `${session.aircraftRegistration} could not be cleared right now.` });
      return;
    }

    setSessions((current) => current.filter((item) => item.id !== session.id));
    toast({ title: 'Stale Session Ended', description: `${session.aircraftRegistration} was cleared from the active fleet tracker.` });
  };

  return (
    <div className={cn('mx-auto flex w-full max-w-[1400px] flex-1 min-h-0 flex-col gap-6 overflow-y-auto p-4 pt-6 md:p-8', isModern && 'gap-7')}>
      {isModern && (
        <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.16),_transparent_34%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(15,23,42,0.95)_40%,_rgba(30,41,59,0.94))] px-6 py-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.22)] md:px-8 md:py-7">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,_rgba(96,165,250,0.2),_transparent_62%)] md:block" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-100/80">Fleet Tracker</p>
              <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight md:text-4xl">Live aircraft monitoring for operational control.</h1>
                <p className="max-w-xl text-sm text-slate-200/85 md:text-[15px]">
                  Watch active broadcasts, route progress, and field telemetry in one cleaner live-ops surface.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge className="border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white hover:bg-white/10">
                  {sortedSessions.length} tracked sessions
                </Badge>
                <Badge className="border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white hover:bg-white/10">
                  {activeSessionCount} live
                </Badge>
                <Badge className="border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white hover:bg-white/10">
                  {staleSessionCount} stale
                </Badge>
                <Badge className="border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white hover:bg-white/10">
                  {endedSessionCount} ended
                </Badge>
                <Badge className="border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white hover:bg-white/10">
                  server-backed tracking
                </Badge>
                {lastRefreshedAt && (
                  <Badge className="border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white hover:bg-white/10">
                    refreshed {lastRefreshedAt}
                  </Badge>
                )}
                <Badge className="border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white hover:bg-white/10">
                  <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(110,231,183,0.15)]" />
                  live refresh
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-white/20 bg-white/10 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white hover:bg-white/15"
                  onClick={() => void loadSessions()}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-200">Active Fleet</p>
                  <RadioTower className="h-4 w-4 text-cyan-200" />
                </div>
                <p className="mt-3 text-3xl font-black text-white">{sortedSessions.length}</p>
                <p className="mt-1 text-xs text-slate-200/80">Aircraft currently transmitting live positions.</p>
              </div>
              <Link href="/operations/active-flight" className="block">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md transition hover:bg-white/14">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-200">Pilot View</p>
                    <PlaneTakeoff className="h-4 w-4 text-emerald-200" />
                  </div>
                  <p className="mt-3 text-lg font-black text-white">Open Active Flight</p>
                  <p className="mt-1 text-xs text-slate-200/80">Launch the instructor tracking cockpit.</p>
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
                <Badge variant="outline" className={cn('text-[10px] font-black uppercase tracking-widest', isModern && 'border-slate-200 bg-slate-50 text-slate-700')}>School View</Badge>
                <Badge className={cn('text-[10px] font-black uppercase tracking-widest', isModern && 'border-slate-200 bg-sky-50 text-sky-800 hover:bg-sky-50')}>Fleet Tracker</Badge>
                <Badge variant="outline" className={cn('text-[10px] font-black uppercase tracking-widest', isModern && 'border-slate-200 bg-amber-50 text-amber-800')}>
                  {activeSessionCount} live / {staleSessionCount} stale / {endedSessionCount} ended
                </Badge>
              </div>
              <CardTitle className="text-2xl font-black uppercase tracking-tight">Live Aircraft Monitoring</CardTitle>
              <CardDescription className="max-w-3xl text-sm">This page is the ops-side surface for watching all active aircraft sessions.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className={cn('font-black uppercase', isModern && 'border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50')}><Link href="/operations/active-flight"><PlaneTakeoff className="mr-2 h-4 w-4" />Pilot Active Flight</Link></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className={cn('border shadow-none', isModern && 'overflow-hidden border-slate-200/80 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]')}>
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest">Fleet Map Surface</CardTitle>
              <CardDescription>Active aircraft sessions are plotted here from the server-backed session store.</CardDescription>
            </CardHeader>
            <CardContent><FleetTrackerMap sessions={sortedSessions} /></CardContent>
          </Card>
          <div className="space-y-6">
            <Card className={cn('border shadow-none', isModern && 'border-slate-200/80 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]')}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-black uppercase tracking-widest">Active Broadcasts</CardTitle>
                  <CardDescription>Live sessions stored on the server appear here automatically.</CardDescription>
                </div>
                {lastRefreshedAt && (
                  <Badge variant="outline" className={cn('shrink-0 text-[10px] font-black uppercase tracking-widest', isModern && 'border-slate-200 bg-slate-50 text-slate-700')}>
                    Refreshed {lastRefreshedAt}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {sortedSessions.length === 0 && <div className={cn('rounded-xl border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground', isModern && 'rounded-2xl border-slate-200 bg-slate-50/70 text-slate-500')}>No active aircraft sessions yet.</div>}
                {sortedSessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      'rounded-xl border bg-muted/10 p-4',
                      isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/70 shadow-sm',
                      session.status !== 'active' && 'border-emerald-200 bg-emerald-50/40',
                      isModern && session.status !== 'active' && 'border-emerald-200 bg-emerald-50/50',
                      session.status === 'active' && isFlightSessionStale(session) && 'border-amber-200 bg-amber-50/40',
                      isModern && session.status === 'active' && isFlightSessionStale(session) && 'border-amber-200 bg-amber-50/50'
                    )}
                  >
                    {session.status !== 'active' ? (
                      <div className="mb-2 inline-flex rounded-full border border-emerald-200 bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-900">
                        Ended session
                      </div>
                    ) : isFlightSessionStale(session) ? (
                      <div className="mb-2 inline-flex rounded-full border border-amber-200 bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-amber-900">
                        Stale session
                      </div>
                    ) : null}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black uppercase">{session.aircraftRegistration}</p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{session.pilotName}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-black uppercase tracking-widest',
                          isModern && 'border-slate-200 bg-white text-slate-700',
                          session.status !== 'active' && 'border-emerald-300 bg-emerald-100 text-emerald-900',
                          session.status === 'active' && isFlightSessionStale(session) && 'border-amber-300 bg-amber-100 text-amber-900'
                        )}
                      >
                        {session.status !== 'active' ? 'Ended' : isFlightSessionStale(session) ? 'Stale' : session.status}
                      </Badge>
                    </div>
                    {session.lastPosition && (
                      <div className={cn('mt-3 rounded-lg border bg-background/80 p-3', isModern && 'rounded-2xl border-slate-200 bg-white', session.status !== 'active' && 'border-emerald-200 bg-emerald-50/60', session.status === 'active' && isFlightSessionStale(session) && 'border-amber-200 bg-amber-50/60')}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Latest Coordinates</p>
                        <p className="mt-1 font-mono text-xs font-bold">{session.lastPosition.latitude.toFixed(6)}, {session.lastPosition.longitude.toFixed(6)}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          <div>Speed: {session.groundSpeedKt != null ? `${session.groundSpeedKt.toFixed(0)} kt` : session.lastPosition.speedKt != null ? `${session.lastPosition.speedKt.toFixed(0)} kt` : 'N/A'}</div>
                          <div>Altitude: {session.lastPosition.altitude != null ? `${Math.round(session.lastPosition.altitude)} m` : 'N/A'}</div>
                          <div>Bearing: {session.lastPosition.headingTrue != null ? `${session.lastPosition.headingTrue.toFixed(0)}°` : 'N/A'}</div>
                          <div>Trail: {(session.breadcrumb || []).length} pts</div>
                        </div>
                      </div>
                    )}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      <div>Device: {session.deviceLabel || 'Unnamed device'}</div>
                      <div>Updated: {session.status !== 'active' ? 'ended' : getFlightSessionFreshnessLabel(session)}</div>
                    </div>
                    {session.status === 'active' && isFlightSessionStale(session) && (
                      <Button
                        type="button"
                        variant="outline"
                        className={cn('mt-3 w-full font-black uppercase text-amber-700', isModern && 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100')}
                        onClick={() => clearStaleSession(session)}
                      >
                        End Stale Session
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className={cn('border shadow-none', isModern && 'border-slate-200/80 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]')}>
              <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest">Ops Monitoring Goals</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className={cn('flex items-start gap-3 rounded-lg border bg-muted/10 p-3', isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/70')}><Users className={cn('mt-0.5 h-4 w-4 text-primary', isModern && 'text-sky-700')} /><p className="text-foreground/90">See every active aircraft for the school in one place.</p></div>
                <div className={cn('flex items-start gap-3 rounded-lg border bg-muted/10 p-3', isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/70')}><RadioTower className={cn('mt-0.5 h-4 w-4 text-primary', isModern && 'text-cyan-700')} /><p className="text-foreground/90">Know which pilot and device are currently broadcasting each registration.</p></div>
                <div className={cn('flex items-start gap-3 rounded-lg border bg-muted/10 p-3', isModern && 'rounded-2xl border-slate-200/90 bg-slate-50/70')}><Navigation className={cn('mt-0.5 h-4 w-4 text-primary', isModern && 'text-emerald-700')} /><p className="text-foreground/90">Open individual aircraft detail views later for route progress and latest movement.</p></div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
