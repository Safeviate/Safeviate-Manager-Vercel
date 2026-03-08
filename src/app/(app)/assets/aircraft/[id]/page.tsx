
'use client';

import { use, useMemo } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, Settings, History, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import { EditHoursDialog } from './edit-hours-dialog';
import { cn } from '@/lib/utils';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const StatCard = ({ title, value, subValue, icon: Icon, colorClass }: { title: string, value: string | number, subValue?: string, icon: any, colorClass?: string }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={cn("text-2xl font-bold", colorClass)}>{value}</p>
          {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
        </div>
        <div className="p-3 bg-muted rounded-full">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  // Primary Aircraft Data
  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: aircraft, isLoading: isLoadingAc } = useDoc<Aircraft>(aircraftRef);

  // Sub-collections: Components and Maintenance
  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`), orderBy('name')) : null),
    [firestore, tenantId, aircraftId]
  );
  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: components, isLoading: isLoadingComp } = useCollection<AircraftComponent>(componentsQuery);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  const isLoading = isLoadingAc || isLoadingComp || isLoadingLogs;

  const inspectionStats = useMemo(() => {
    if (!aircraft) return null;
    const tacho = aircraft.currentTacho || 0;
    const next50 = aircraft.tachoAtNext50Inspection || 0;
    const next100 = aircraft.tachoAtNext100Inspection || 0;

    const remaining50 = Math.max(0, next50 - tacho);
    const remaining100 = Math.max(0, next100 - tacho);

    return {
      remaining50: remaining50.toFixed(1),
      remaining100: remaining100.toFixed(1),
      is50Urgent: remaining50 < 5,
      is100Urgent: remaining100 < 10,
    };
  }, [aircraft]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!aircraft) {
    return <div className="p-8 text-center">Aircraft not found.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Button asChild variant="ghost" className="-ml-4 h-8 text-muted-foreground hover:text-foreground">
            <Link href="/assets/aircraft">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight font-mono">{aircraft.tailNumber}</h1>
          <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
        </div>
        <div className="flex items-center gap-2">
          <EditHoursDialog aircraft={aircraft} tenantId={tenantId} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Current Hobbs" value={(aircraft.currentHobbs || 0).toFixed(1)} subValue="Total airframe time" icon={Clock} />
        <StatCard title="Current Tacho" value={(aircraft.currentTacho || 0).toFixed(1)} subValue="Total engine time" icon={Settings} />
        <StatCard 
          title="Next 50hr" 
          value={`${inspectionStats?.remaining50}h`} 
          subValue="Remaining until insp." 
          icon={AlertTriangle} 
          colorClass={inspectionStats?.is50Urgent ? 'text-destructive' : 'text-green-600'}
        />
        <StatCard 
          title="Next 100hr" 
          value={`${inspectionStats?.remaining100}h`} 
          subValue="Remaining until insp." 
          icon={AlertTriangle} 
          colorClass={inspectionStats?.is100Urgent ? 'text-destructive' : 'text-green-600'}
        />
      </div>

      <Tabs defaultValue="components" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-muted/50 border rounded-lg">
          <TabsTrigger value="components" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Tracked Components
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Maintenance History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="mt-6">
          <Card>
            <CardHeader className="bg-[#ebf5fb] border-b text-center py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-[#1e293b]">Tracked Components</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Component Name</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead className="text-right">TSN (Hours)</TableHead>
                    <TableHead className="text-right">TSO (Hours)</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components && components.length > 0 ? (
                    components.map(comp => {
                      const remaining = Math.max(0, comp.maxHours - comp.tsn);
                      return (
                        <TableRow key={comp.id}>
                          <TableCell className="font-medium">{comp.name}</TableCell>
                          <TableCell className="font-mono">{comp.serialNumber}</TableCell>
                          <TableCell className="text-right font-mono">{comp.tsn.toFixed(1)}</TableCell>
                          <TableCell className="text-right font-mono">{comp.tso.toFixed(1)}</TableCell>
                          <TableCell className="text-right font-mono">{remaining.toFixed(1)}</TableCell>
                          <TableCell className="text-right">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                              remaining < 50 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                            )}>
                              {remaining < 50 ? 'Urgent' : 'Healthy'}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        No tracked components defined for this aircraft.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader className="bg-[#ebf5fb] border-b text-center py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-[#1e293b]">Maintenance History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Engineer/AMO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs && logs.length > 0 ? (
                    logs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="font-bold">{log.maintenanceType}</TableCell>
                        <TableCell className="max-w-md">{log.details}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold">{log.ameNo}</span>
                            <span className="text-xs text-muted-foreground">{log.amoNo}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                        No maintenance history recorded for this aircraft.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
