'use client';

import { use, useMemo } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, History, FileText, Settings2, Gauge, AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';

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
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAc } = useDoc<Aircraft>(aircraftRef);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  const isLoading = isLoadingAc || isLoadingLogs;

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!aircraft) {
    return (
      <div className="max-w-[1200px] mx-auto w-full text-center py-20">
        <p className="text-muted-foreground mb-4">Aircraft record not found.</p>
        <Button asChild variant="outline"><Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <div className="shrink-0">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link>
        </Button>
      </div>

      <div className="shrink-0 px-1">
        <Card className="shadow-none border bg-muted/5">
          <CardHeader className="py-4">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl font-black">{aircraft.tailNumber}</CardTitle>
                <CardDescription>{aircraft.make} {aircraft.model} • {aircraft.type}</CardDescription>
              </div>
              <div className="flex gap-4 text-right">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Current Hobbs</p>
                  <p className="text-2xl font-mono font-black">{(aircraft.currentHobbs || 0).toFixed(1)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Current Tacho</p>
                  <p className="text-2xl font-mono font-black">{(aircraft.currentTacho || 0).toFixed(1)}</p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="maintenance" className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 px-1">
          <TabsList className="bg-transparent h-auto p-0 gap-2 mb-4 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex">
            <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground gap-2">
              <History className="h-4 w-4" /> Maintenance Logs
            </TabsTrigger>
            <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground gap-2">
              <FileText className="h-4 w-4" /> Technical Documents
            </TabsTrigger>
            <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground gap-2">
              <Settings2 className="h-4 w-4" /> Component Tracker
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 px-1 overflow-hidden">
          {/* --- Maintenance Logs Tab --- */}
          <TabsContent value="maintenance" className="m-0 h-full">
            <Card className="h-full flex flex-col shadow-none border overflow-hidden">
              <ScrollArea className="h-full custom-scrollbar">
                <div className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="text-xs uppercase font-bold">Date</TableHead>
                        <TableHead className="text-xs uppercase font-bold">Type</TableHead>
                        <TableHead className="text-xs uppercase font-bold">Reference</TableHead>
                        <TableHead className="text-xs uppercase font-bold">Details</TableHead>
                        <TableHead className="text-xs uppercase font-bold">Certified By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(logs || []).length > 0 ? (
                        logs!.map(log => (
                          <TableRow key={log.id}>
                            <TableCell className="whitespace-nowrap text-xs">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                            <TableCell><Badge variant="secondary" className="text-[10px]">{log.maintenanceType}</Badge></TableCell>
                            <TableCell className="font-mono text-[10px]">{log.reference || 'N/A'}</TableCell>
                            <TableCell className="text-xs max-w-md truncate">{log.details}</TableCell>
                            <TableCell className="text-xs">
                              <p className="font-semibold">{log.ameNo || 'N/A'}</p>
                              <p className="text-[10px] text-muted-foreground">AMO: {log.amoNo || 'N/A'}</p>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic border-2 border-dashed rounded-lg m-4">
                            No maintenance records found for this aircraft.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* --- Technical Documents Tab --- */}
          <TabsContent value="documents" className="m-0 h-full">
            <Card className="h-full flex flex-col shadow-none border overflow-hidden">
              <CardHeader className="py-4 border-b bg-muted/5">
                <CardTitle className="text-lg">Compliance Documentation</CardTitle>
                <CardDescription>View current Certificates of Airworthiness, Insurance, and other required registry documents.</CardDescription>
              </CardHeader>
              <ScrollArea className="h-full custom-scrollbar">
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(aircraft.documents || []).length > 0 ? (
                    aircraft.documents!.map((doc, idx) => (
                      <Card key={idx} className="bg-muted/10 border-dashed hover:bg-muted/20 transition-colors cursor-pointer">
                        <CardHeader className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                              <FileText className="h-5 w-5" />
                            </div>
                            <Badge variant="outline" className="text-[10px] uppercase">{doc.abbreviation || 'DOC'}</Badge>
                          </div>
                          <CardTitle className="text-sm mt-3">{doc.name}</CardTitle>
                          <CardDescription className="text-[10px]">Uploaded: {format(new Date(doc.uploadDate), 'dd MMM yyyy')}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          {doc.expirationDate && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 mb-3">
                              <AlertCircle className="h-3 w-3" /> Expires: {format(new Date(doc.expirationDate), 'dd MMM yyyy')}
                            </div>
                          )}
                          <Button asChild variant="secondary" size="sm" className="w-full h-7 text-[10px]">
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">Download / View</a>
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full h-48 flex items-center justify-center text-muted-foreground italic border-2 border-dashed rounded-lg">
                      No technical documents attached to this record.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* --- Component Tracker Tab --- */}
          <TabsContent value="components" className="m-0 h-full">
            <Card className="h-full flex flex-col shadow-none border overflow-hidden">
              <ScrollArea className="h-full custom-scrollbar">
                <div className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="text-xs uppercase font-bold">Component Name</TableHead>
                        <TableHead className="text-xs uppercase font-bold">Serial Number</TableHead>
                        <TableHead className="text-xs uppercase font-bold text-right">TSN (Total)</TableHead>
                        <TableHead className="text-xs uppercase font-bold text-right">TSO (Overhaul)</TableHead>
                        <TableHead className="text-xs uppercase font-bold text-right">Life Limit</TableHead>
                        <TableHead className="text-xs uppercase font-bold text-right">Remaining</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(aircraft.components || []).length > 0 ? (
                        aircraft.components!.map(comp => {
                          const remaining = comp.maxHours - comp.totalTime;
                          return (
                            <TableRow key={comp.id}>
                              <TableCell className="font-semibold text-xs">{comp.name}</TableCell>
                              <TableCell className="font-mono text-[10px]">{comp.serialNumber}</TableCell>
                              <TableCell className="text-right font-mono text-xs">{comp.tsn.toFixed(1)}</TableCell>
                              <TableCell className="text-right font-mono text-xs">{comp.tso.toFixed(1)}</TableCell>
                              <TableCell className="text-right font-mono text-xs">{comp.maxHours.toFixed(1)}</TableCell>
                              <TableCell className="text-right">
                                <Badge className={cn(
                                  "font-mono text-[10px]",
                                  remaining < 50 ? "bg-red-500" : remaining < 100 ? "bg-yellow-500 text-black" : "bg-green-500"
                                )}>
                                  {remaining.toFixed(1)}h
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-48 text-center text-muted-foreground italic border-2 border-dashed rounded-lg m-4">
                            No component tracking data initialized.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
