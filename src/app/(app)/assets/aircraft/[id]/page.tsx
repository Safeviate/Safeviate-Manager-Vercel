'use client';

import { use, useMemo } from 'react';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, History, FileText, Gauge, Settings } from 'lucide-react';
import Link from 'next/link';
import type { Aircraft, MaintenanceLog } from '@/types/aircraft';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

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
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/maintenance-logs`), where('aircraftId', '==', aircraftId), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: loadingAc } = useDoc<Aircraft>(aircraftRef);
  const { data: logs, isLoading: loadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  if (loadingAc) {
    return <div className="max-w-[1200px] mx-auto w-full space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!aircraft) return <div className="text-center py-12">Aircraft not found.</div>;

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <div className="px-1 shrink-0">
        <Button asChild variant="outline" className="mb-4">
          <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link>
        </Button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
          </div>
          <Badge className="bg-green-500 text-white h-6">Airworthy</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-1 shrink-0">
        <Card className="shadow-none border">
          <CardHeader className="py-3 bg-muted/5 border-b"><CardTitle className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Hobbs Hours</CardTitle></CardHeader>
          <CardContent className="pt-4"><p className="text-2xl font-mono font-bold">{aircraft.currentHobbs?.toFixed(1) || '0.0'}</p></CardContent>
        </Card>
        <Card className="shadow-none border">
          <CardHeader className="py-3 bg-muted/5 border-b"><CardTitle className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Tacho Hours</CardTitle></CardHeader>
          <CardContent className="pt-4"><p className="text-2xl font-mono font-bold">{aircraft.currentTacho?.toFixed(1) || '0.0'}</p></CardContent>
        </Card>
        <Card className="shadow-none border">
          <CardHeader className="py-3 bg-muted/5 border-b"><CardTitle className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Next 50h Inspection</CardTitle></CardHeader>
          <CardContent className="pt-4"><p className="text-2xl font-mono font-bold">{aircraft.tachoAtNext50Inspection?.toFixed(1) || '---'}</p></CardContent>
        </Card>
      </div>

      <Card className="flex-grow flex flex-col shadow-none border overflow-hidden">
        <Tabs defaultValue="maintenance" className="flex-1 flex flex-col">
          <div className="px-6 pt-4 border-b bg-muted/10 shrink-0">
            <TabsList className="bg-transparent h-auto p-0 gap-2 mb-2 border-b-0">
              <TabsTrigger value="maintenance" className="rounded-full px-6 py-1.5 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-xs"><History className="mr-2 h-3.5 w-3.5" /> Maintenance Logs</TabsTrigger>
              <TabsTrigger value="documents" className="rounded-full px-6 py-1.5 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-xs"><FileText className="mr-2 h-3.5 w-3.5" /> Documents</TabsTrigger>
              <TabsTrigger value="config" className="rounded-full px-6 py-1.5 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-xs"><Settings className="mr-2 h-3.5 w-3.5" /> Configuration</TabsTrigger>
            </TabsList>
          </div>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <TabsContent value="maintenance" className="m-0 h-full overflow-auto">
              {loadingLogs ? <div className="p-8 space-y-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div> : (
                <Table>
                  <TableHeader><TableRow><TableHead className="text-xs uppercase font-bold">Date</TableHead><TableHead className="text-xs uppercase font-bold">Type</TableHead><TableHead className="text-xs uppercase font-bold">Details</TableHead><TableHead className="text-xs uppercase font-bold">Ref #</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(logs || []).map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-xs font-semibold">{log.maintenanceType}</TableCell>
                        <TableCell className="text-xs max-w-md truncate">{log.details}</TableCell>
                        <TableCell className="text-xs font-mono">{log.reference || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                    {(!logs || logs.length === 0) && <TableRow><TableCell colSpan={4} className="text-center p-8 text-muted-foreground italic">No maintenance logs found.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            <TabsContent value="documents" className="m-0 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(aircraft.documents || []).map(doc => (
                  <Card key={doc.name} className="shadow-none border bg-muted/5">
                    <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                      <div><CardTitle className="text-sm">{doc.name}</CardTitle><CardDescription className="text-xs">Expires: {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'No Expiry'}</CardDescription></div>
                      <Button variant="outline" size="sm" asChild><Link href={doc.url} target="_blank">View</Link></Button>
                    </CardHeader>
                  </Card>
                ))}
                {(!aircraft.documents || aircraft.documents.length === 0) && <p className="text-sm text-muted-foreground text-center col-span-2 py-12 border-2 border-dashed rounded-lg">No technical documents uploaded.</p>}
              </div>
            </TabsContent>
            <TabsContent value="config" className="m-0 p-6 space-y-6">
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Airframe Total Time</label>
                        <p className="text-lg font-bold">{aircraft.frameHours || 0} hours</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Engine Total Time</label>
                        <p className="text-lg font-bold">{aircraft.engineHours || 0} hours</p>
                    </div>
                </div>
                <div className="pt-6 border-t flex justify-end">
                    <Button variant="outline" asChild><Link href="/admin/mb-config">Configure Mass & Balance</Link></Button>
                </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}