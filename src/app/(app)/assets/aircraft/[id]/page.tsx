'use client';

import { use, useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, Settings, Wrench, FileText } from 'lucide-react';
import Link from 'next/link';
import type { Aircraft } from '@/types/aircraft';
import { EditHoursDialog } from './edit-hours-dialog';
import { TrackedComponents } from './tracked-components';
import { MaintenanceLogs } from './maintenance-logs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const StatCard = ({ title, value, subValue, icon: Icon, colorClass }: { title: string, value: string | number, subValue?: string, icon: any, colorClass?: string }) => (
    <Card className="shadow-none border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <Icon className={cn("h-4 w-4", colorClass || "text-primary")} />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
        </CardContent>
    </Card>
);

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  
  const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftRef);

  const inspection50Remaining = useMemo(() => {
    if (!aircraft?.currentTacho || !aircraft?.tachoAtNext50Inspection) return 0;
    return Math.max(0, aircraft.tachoAtNext50Inspection - aircraft.currentTacho);
  }, [aircraft]);

  const inspection100Remaining = useMemo(() => {
    if (!aircraft?.currentTacho || !aircraft?.tachoAtNext100Inspection) return 0;
    return Math.max(0, aircraft.tachoAtNext100Inspection - aircraft.currentTacho);
  }, [aircraft]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !aircraft) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error ? error.message : 'Aircraft not found.'}</p>
        <Button asChild variant="outline"><Link href="/assets/aircraft">Back to Fleet</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/assets/aircraft"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
                <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <EditHoursDialog aircraft={aircraft} tenantId={tenantId} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1) || '0.0'} subValue="Total airframe time" icon={Clock} />
        <StatCard title="Current Tacho" value={aircraft.currentTacho?.toFixed(1) || '0.0'} subValue="Total engine time" icon={Clock} />
        
        <Card className="shadow-none border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">50 Hour Inspection</CardTitle>
                <Settings className={cn("h-4 w-4", inspection50Remaining < 5 ? "text-destructive" : "text-yellow-500")} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{inspection50Remaining.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">hrs left</span></div>
                <Progress 
                    value={Math.max(0, (inspection50Remaining / 50) * 100)} 
                    className="mt-2 h-1.5" 
                    indicatorClassName={inspection50Remaining < 5 ? "bg-destructive" : "bg-yellow-500"} 
                />
            </CardContent>
        </Card>

        <Card className="shadow-none border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">100 Hour Inspection</CardTitle>
                <Wrench className={cn("h-4 w-4", inspection100Remaining < 10 ? "text-destructive" : "text-primary")} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{inspection100Remaining.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">hrs left</span></div>
                <Progress 
                    value={Math.max(0, (inspection100Remaining / 100) * 100)} 
                    className="mt-2 h-1.5" 
                    indicatorClassName={inspection100Remaining < 10 ? "bg-destructive" : "bg-primary"} 
                />
            </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <section className="space-y-4">
            <div className="flex items-center justify-center h-12 bg-swimlane-header text-swimlane-header-foreground rounded-md border border-white/10 shadow-sm font-bold uppercase tracking-wider">
                Tracked Components
            </div>
            <TrackedComponents aircraftId={aircraftId} tenantId={tenantId} />
        </section>

        <section className="space-y-4">
            <div className="flex items-center justify-center h-12 bg-swimlane-header text-swimlane-header-foreground rounded-md border border-white/10 shadow-sm font-bold uppercase tracking-wider">
                Maintenance History
            </div>
            <MaintenanceLogs aircraftId={aircraftId} tenantId={tenantId} />
        </section>
      </div>
    </div>
  );
}
