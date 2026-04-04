'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Navigation, PlaneTakeoff, RadioTower, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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

const STORAGE_KEY = 'safeviate.flight-sessions';

export default function FleetTrackerPage() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    try {
      setSessions(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    } catch {
      setSessions([]);
    }
  }, []);

  const sortedSessions = useMemo(() => [...sessions].sort((a, b) => (a.aircraftRegistration || '').localeCompare(b.aircraftRegistration || '')), [sessions]);

  const clearStaleSession = (session: any) => {
    const next = sessions.map((item) => item.id === session.id ? { ...item, status: 'completed', endedAt: new Date().toISOString() } : item);
    setSessions(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    toast({ title: 'Stale Session Ended', description: `${session.aircraftRegistration} was cleared from the active fleet tracker.` });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 p-4 pt-6 md:p-8">
      <Card className="border shadow-none">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest">School View</Badge>
                <Badge className="text-[10px] font-black uppercase tracking-widest">Fleet Tracker</Badge>
              </div>
              <CardTitle className="text-2xl font-black uppercase tracking-tight">Live Aircraft Monitoring</CardTitle>
              <CardDescription className="max-w-3xl text-sm">This page is the ops-side surface for watching all active aircraft sessions.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="font-black uppercase"><Link href="/operations/active-flight"><PlaneTakeoff className="mr-2 h-4 w-4" />Pilot Active Flight</Link></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="border shadow-none">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest">Fleet Map Surface</CardTitle>
              <CardDescription>Active aircraft sessions are plotted here from the local session store.</CardDescription>
            </CardHeader>
            <CardContent><FleetTrackerMap sessions={sortedSessions} /></CardContent>
          </Card>
          <div className="space-y-6">
            <Card className="border shadow-none">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest">Active Broadcasts</CardTitle>
                <CardDescription>Live sessions stored in local browser state will appear here automatically.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {sortedSessions.length === 0 && <div className="rounded-xl border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground">No active aircraft sessions yet.</div>}
                {sortedSessions.map((session) => (
                  <div key={session.id} className="rounded-xl border bg-muted/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black uppercase">{session.aircraftRegistration}</p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{session.pilotName}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest">{session.status}</Badge>
                    </div>
                    {session.lastPosition && (
                      <div className="mt-3 rounded-lg border bg-background/80 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Latest Coordinates</p>
                        <p className="mt-1 font-mono text-xs font-bold">{session.lastPosition.latitude.toFixed(6)}, {session.lastPosition.longitude.toFixed(6)}</p>
                      </div>
                    )}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      <div>Device: {session.deviceLabel || 'Unnamed device'}</div>
                      <div>Updated: live</div>
                    </div>
                    <Button type="button" variant="outline" className="mt-3 w-full font-black uppercase text-amber-700" onClick={() => clearStaleSession(session)}>End Stale Session</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border shadow-none">
              <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest">Ops Monitoring Goals</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3 rounded-lg border bg-muted/10 p-3"><Users className="mt-0.5 h-4 w-4 text-primary" /><p>See every active aircraft for the school in one place.</p></div>
                <div className="flex items-start gap-3 rounded-lg border bg-muted/10 p-3"><RadioTower className="mt-0.5 h-4 w-4 text-primary" /><p>Know which pilot and device are currently broadcasting each registration.</p></div>
                <div className="flex items-start gap-3 rounded-lg border bg-muted/10 p-3"><Navigation className="mt-0.5 h-4 w-4 text-primary" /><p>Open individual aircraft detail views later for route progress and latest movement.</p></div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
