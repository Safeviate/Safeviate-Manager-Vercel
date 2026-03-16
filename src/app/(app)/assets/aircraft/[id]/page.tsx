'use client';

import { use, useMemo } from 'react';
import { doc, collection, query, where } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Gauge, History, FileText, Settings, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Aircraft } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const DetailItem = ({ label, value }: { label: string; value: string | number | undefined | null }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
    <p className="text-sm font-semibold">{value || 'N/A'}</p>
  </div>
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

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/maintenance-logs`), where('aircraftId', '==', aircraftId)) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAc } = useDoc<Aircraft>(aircraftRef);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  if (isLoadingAc) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!aircraft) return <div className="p-10 text-center">Aircraft not found.</div>;

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <div className="shrink-0 px-1">
        <Button asChild variant="ghost">
          <Link href="/assets/aircraft">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet
          </Link>
        </Button>
      </div>

      <Card className="shrink-0 shadow-none border bg-muted/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-3xl font-black tracking-tighter text-primary">{aircraft.tailNumber}</CardTitle>
            <CardDescription>{aircraft.make} {aircraft.model} • {aircraft.type}</CardDescription>
          </div>
          <Badge className="h-6 px-3 bg-green-100 text-green-700 border-green-200">Airworthy</Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-t bg-background/50">
          <DetailItem label="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1)} />
          <DetailItem label="Current Tacho" value={aircraft.currentTacho?.toFixed(1)} />
          <DetailItem label="Next 50h Due" value={aircraft.tachoAtNext50Inspection?.toFixed(1)} />
          <DetailItem label="Next 100h Due" value={aircraft.tachoAtNext100Inspection?.toFixed(1)} />
        </CardContent>
      </Card>

      <Tabs defaultValue="maintenance" className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 px-1">
          <TabsList className="bg-transparent h-auto p-0 gap-2 mb-4 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex">
            <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0">Maintenance Logs</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0">Technical Documents</TabsTrigger>
            <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0">Component Tracker</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 px-1">
          <TabsContent value="maintenance" className="m-0 h-full">
            <Card className="h-full flex flex-col overflow-hidden shadow-none border">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-4">
                  {logs && logs.length > 0 ? (
                    logs.map(log => (
                      <div key={log.id} className="p-4 border rounded-lg bg-muted/10 space-y-2">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-sm">{log.maintenanceType}</p>
                          <p className="text-xs text-muted-foreground">{new Date(log.date).toLocaleDateString()}</p>
                        </div>
                        <p className="text-xs leading-relaxed">{log.details}</p>
                        <div className="flex gap-4 pt-2 border-t mt-2">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">AME: {log.ameNo || 'N/A'}</p>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Ref: {log.reference || 'N/A'}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center text-muted-foreground italic border-2 border-dashed rounded-lg">
                      No maintenance records found for this aircraft.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>
          <TabsContent value="documents" className="m-0 h-full">
            <Card className="h-full flex flex-col justify-center items-center opacity-40 shadow-none border">
              <FileText className="h-12 w-12 mb-4" />
              <p className="text-sm font-medium">Digital document vault is processing...</p>
            </Card>
          </TabsContent>
          <TabsContent value="components" className="m-0 h-full">
            <Card className="h-full flex flex-col justify-center items-center opacity-40 shadow-none border">
              <Settings className="h-12 w-12 mb-4" />
              <p className="text-sm font-medium">Component life-cycle tracking module inactive.</p>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
