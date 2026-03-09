
'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, Calendar, ShieldCheck, FileText, Settings2, Eye } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const StatusCard = ({ label, value, subValue, colorClass }: { label: string, value: string | number, subValue?: string, colorClass?: string }) => (
    <div className="bg-card border rounded-lg p-3 flex flex-col justify-center min-w-[140px]">
        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">{label}</p>
        <div className="flex items-baseline gap-1">
            <span className={cn("text-lg font-bold tabular-nums", colorClass)}>{value}</span>
            {subValue && <span className="text-[10px] text-muted-foreground font-medium">{subValue}</span>}
        </div>
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

  const maintenanceQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: maintenance, isLoading: isLoadingMaintenance } = useCollection<MaintenanceLog>(maintenanceQuery);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);

  if (isLoadingAircraft) {
    return <div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!aircraft) {
    return <div className="text-center py-12">Aircraft not found.</div>;
  }

  const tacho = aircraft.currentTacho || 0;
  const next50 = aircraft.tachoAtNext50Inspection || 0;
  const next100 = aircraft.tachoAtNext100Inspection || 0;

  const remaining50 = Math.max(0, next50 - tacho);
  const remaining100 = Math.max(0, next100 - tacho);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button asChild variant="outline" size="sm">
          <Link href="/assets/aircraft">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet
          </Link>
        </Button>
        <div className="flex gap-2">
            <Button variant="outline" size="sm"><Settings2 className="mr-2 h-4 w-4" /> Edit Service</Button>
            <Button variant="outline" size="sm"><Clock className="mr-2 h-4 w-4" /> Edit Flight Hours</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-3xl font-bold">{aircraft.tailNumber}</CardTitle>
          <CardDescription>{aircraft.make} {aircraft.model}</CardDescription>
        </CardHeader>
      </Card>

      {/* Reordered Status Row: Initial -> Current -> Inspections */}
      <div className="flex flex-wrap gap-4">
        <StatusCard label="Initial Hobbs" value={aircraft.initialHobbs?.toFixed(1) || '0.0'} subValue="h" />
        <StatusCard label="Initial Tacho" value={aircraft.initialTacho?.toFixed(1) || '0.0'} subValue="h" />
        <StatusCard label="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1) || '0.0'} subValue="h" />
        <StatusCard label="Current Tacho" value={aircraft.currentTacho?.toFixed(1) || '0.0'} subValue="h" />
        <StatusCard 
            label="Next 50hr" 
            value={next50.toFixed(1)} 
            subValue={`(${remaining50.toFixed(1)} left)`} 
            colorClass="text-blue-600"
        />
        <StatusCard 
            label="Next 100hr" 
            value={next100.toFixed(1)} 
            subValue={`(${remaining100.toFixed(1)} left)`} 
            colorClass="text-orange-600"
        />
      </div>

      <Tabs defaultValue="components" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0">
          <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Tracked Components</TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Maintenance History</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Tracked Components</CardTitle>
              <CardDescription>Life-limited parts and time-since-overhaul (TSO) tracking.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Serial No.</TableHead>
                    <TableHead className="text-right">TSN</TableHead>
                    <TableHead className="text-right">TSO</TableHead>
                    <TableHead className="text-right">Max Hours</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingComponents ? (
                    <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
                  ) : components && components.length > 0 ? (
                    components.map(c => {
                        const remaining = (c.maxHours || 0) - (c.tsn || 0);
                        return (
                            <TableRow key={c.id}>
                                <TableCell className="font-medium">{c.name}</TableCell>
                                <TableCell className="font-mono text-xs">{c.serialNumber}</TableCell>
                                <TableCell className="text-right font-mono">{c.tsn?.toFixed(1) || '0.0'}</TableCell>
                                <TableCell className="text-right font-mono">{c.tso?.toFixed(1) || '0.0'}</TableCell>
                                <TableCell className="text-right font-mono">{c.maxHours?.toFixed(1) || 'N/A'}</TableCell>
                                <TableCell className={cn("text-right font-bold font-mono", remaining < 50 ? "text-red-600" : "")}>
                                    {remaining.toFixed(1)}
                                </TableCell>
                            </TableRow>
                        )
                    })
                  ) : (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No tracked components found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance History</CardTitle>
              <CardDescription>Chronological log of inspections and repairs.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>AME No.</TableHead>
                    <TableHead>AMO No.</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingMaintenance ? (
                    <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
                  ) : maintenance && maintenance.length > 0 ? (
                    maintenance.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">{log.date ? format(new Date(log.date), 'dd MMM yyyy') : 'N/A'}</TableCell>
                        <TableCell>{log.maintenanceType}</TableCell>
                        <TableCell className="max-w-md truncate">{log.details}</TableCell>
                        <TableCell className="font-mono text-xs">{log.ameNo}</TableCell>
                        <TableCell className="font-mono text-xs">{log.amoNo}</TableCell>
                        <TableCell>{log.reference}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No maintenance records found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Aircraft Documents</CardTitle>
              <CardDescription>Technical certificates and registrations.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(aircraft.documents || []).map((doc, idx) => (
                  <Card key={idx} className="flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <FileText className="h-8 w-8 text-primary" />
                        <Badge variant="outline" className="font-mono">{doc.abbreviation || 'DOC'}</Badge>
                      </div>
                      <CardTitle className="text-sm mt-2">{doc.name}</CardTitle>
                    </CardHeader>
                    <CardFooter className="mt-auto pt-2">
                      <Button variant="default" size="sm" className="w-full">
                        <Eye className="mr-2 h-4 w-4" /> View
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
                {(!aircraft.documents || aircraft.documents.length === 0) && (
                  <p className="col-span-full text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">No documents uploaded.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
