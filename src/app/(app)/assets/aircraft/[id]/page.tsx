'use client';

import { use, useState, useMemo } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, PenTool as Tool, FileText, Settings2, Trash2, Gauge, Clock, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DocumentUploader } from '@/components/document-uploader';
import { updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`, aircraftId, 'maintenanceLogs'), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAc } = useDoc<Aircraft>(aircraftRef);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  if (isLoadingAc) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-6 px-1">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!aircraft) return <div className="text-center py-20">Aircraft not found.</div>;

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <div className="shrink-0 px-1">
        <Button asChild variant="outline" size="sm" className="mb-4">
          <Link href="/assets/aircraft">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet
          </Link>
        </Button>

        <Card className="shadow-none border bg-muted/5">
          <CardHeader className="py-4">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl font-black text-primary">{aircraft.tailNumber}</CardTitle>
                <CardDescription className="text-base">{aircraft.make} {aircraft.model}</CardDescription>
              </div>
              <div className="flex gap-4">
                <StatCard label="Total Frame" value={aircraft.frameHours?.toFixed(1) || '0.0'} icon={Clock} />
                <StatCard label="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1) || '0.0'} icon={Gauge} />
                <StatCard label="Current Tacho" value={aircraft.currentTacho?.toFixed(1) || '0.0'} icon={Gauge} />
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden px-1">
        <Tabs defaultValue="maintenance" className="h-full flex flex-col">
          <TabsList className="bg-transparent h-auto p-0 gap-2 mb-4 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex">
            <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-xs shrink-0">Maintenance Logs</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-xs shrink-0">Technical Documents</TabsTrigger>
            <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-xs shrink-0">Component Tracker</TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0">
            <TabsContent value="maintenance" className="m-0 h-full">
              <MaintenanceLogsTab aircraftId={aircraftId} tenantId={tenantId} logs={logs || []} isLoading={isLoadingLogs} />
            </TabsContent>
            <TabsContent value="documents" className="m-0 h-full">
              <TechnicalDocumentsTab aircraft={aircraft} tenantId={tenantId} />
            </TabsContent>
            <TabsContent value="components" className="m-0 h-full">
              <ComponentTrackerTab aircraft={aircraft} tenantId={tenantId} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string, value: string, icon: any }) {
  return (
    <div className="bg-background border p-3 rounded-lg flex items-center gap-3 shadow-sm min-w-[140px]">
      <div className="p-2 rounded bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
      <div>
        <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">{label}</p>
        <p className="text-lg font-mono font-black leading-none">{value}</p>
      </div>
    </div>
  );
}

function MaintenanceLogsTab({ aircraftId, tenantId, logs, isLoading }: { aircraftId: string, tenantId: string, logs: MaintenanceLog[], isLoading: boolean }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleAddLog = () => {
    if (!firestore) return;
    const details = window.prompt("Enter maintenance details:");
    if (!details) return;
    const type = window.prompt("Enter maintenance type (e.g., 50hr Inspection, Defect Rectification):") || 'General';
    
    const logsCol = collection(firestore, `tenants/${tenantId}/aircrafts`, aircraftId, 'maintenanceLogs');
    addDocumentNonBlocking(logsCol, {
      aircraftId,
      maintenanceType: type,
      details,
      date: new Date().toISOString(),
      ameNo: 'Pending',
    });
    toast({ title: 'Log Added', description: 'Maintenance record created.' });
  };

  return (
    <Card className="h-full flex flex-col shadow-none border overflow-hidden">
      <CardHeader className="py-3 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm uppercase font-bold">Recent Maintenance Activity</CardTitle>
          <CardDescription className="text-xs">Certified engineering records for this asset.</CardDescription>
        </div>
        <Button size="sm" onClick={handleAddLog} className="h-8 gap-2">
          <PlusCircle className="h-3.5 w-3.5" /> Add Maintenance Log
        </Button>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar">
        <Table>
          <TableHeader className="bg-muted/30 sticky top-0 z-10">
            <TableRow>
              <TableHead className="text-[10px] uppercase font-bold">Date</TableHead>
              <TableHead className="text-[10px] uppercase font-bold">Type</TableHead>
              <TableHead className="text-[10px] uppercase font-bold">Details</TableHead>
              <TableHead className="text-[10px] uppercase font-bold">AME/AMO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs whitespace-nowrap">{format(new Date(log.date), 'dd MMM yy')}</TableCell>
                <TableCell><Badge variant="secondary" className="text-[10px]">{log.maintenanceType}</Badge></TableCell>
                <TableCell className="text-xs max-w-md truncate">{log.details}</TableCell>
                <TableCell className="text-xs font-mono">{log.ameNo || 'N/A'}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && !isLoading && (
              <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic text-xs">No maintenance records found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TechnicalDocumentsTab({ aircraft, tenantId }: { aircraft: Aircraft, tenantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDocumentUploaded = (docDetails: any) => {
    if (!firestore) return;
    const currentDocs = aircraft.documents || [];
    const updatedDocs = [...currentDocs, docDetails];
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocs });
    toast({ title: 'Document Added', description: `"${docDetails.name}" attached to asset.` });
  };

  const handleDelete = (name: string) => {
    if (!firestore || !window.confirm(`Delete ${name}?`)) return;
    const updatedDocs = (aircraft.documents || []).filter(d => d.name !== name);
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocs });
  };

  return (
    <Card className="h-full flex flex-col shadow-none border overflow-hidden">
      <CardHeader className="py-3 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm uppercase font-bold">Asset Documentation</CardTitle>
          <CardDescription className="text-xs">Airworthiness certificates, insurance, and manual revisions.</CardDescription>
        </div>
        <DocumentUploader
          onDocumentUploaded={handleDocumentUploaded}
          trigger={(open) => (
            <Button size="sm" variant="outline" onClick={() => open()} className="h-8 gap-2">
              <PlusCircle className="h-3.5 w-3.5" /> Add Document
            </Button>
          )}
        />
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar">
        <Table>
          <TableHeader className="bg-muted/30 sticky top-0 z-10">
            <TableRow>
              <TableHead className="text-[10px] uppercase font-bold">Document Name</TableHead>
              <TableHead className="text-[10px] uppercase font-bold">Upload Date</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(aircraft.documents || []).map((doc) => (
              <TableRow key={doc.name}>
                <TableCell className="text-xs font-bold">{doc.name}</TableCell>
                <TableCell className="text-xs">{format(new Date(doc.uploadDate), 'dd MMM yyyy')}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button asChild size="sm" variant="ghost" className="h-7 text-[10px]"><Link href={doc.url} target="_blank">View</Link></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(doc.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(aircraft.documents || []).length === 0 && (
              <TableRow><TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic text-xs">No technical documents attached.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ComponentTrackerTab({ aircraft, tenantId }: { aircraft: Aircraft, tenantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleAddComponent = () => {
    if (!firestore) return;
    const name = window.prompt("Enter component name (e.g., Engine #1, Propeller):");
    if (!name) return;
    const max = parseFloat(window.prompt("Enter life limit (hours):") || '2000');
    
    const newComponent: AircraftComponent = {
      id: uuidv4(),
      name,
      manufacturer: 'Generic',
      partNumber: 'N/A',
      serialNumber: 'N/A',
      installDate: new Date().toISOString(),
      installHours: aircraft.frameHours || 0,
      maxHours: max,
      notes: '',
      tsn: 0,
      tso: 0,
      totalTime: 0,
    };

    const currentComponents = aircraft.components || [];
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: [...currentComponents, newComponent] });
    toast({ title: 'Component Added' });
  };

  const handleDelete = (id: string) => {
    if (!firestore || !window.confirm('Remove component?')) return;
    const updated = (aircraft.components || []).filter(c => c.id !== id);
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: updated });
  };

  return (
    <Card className="h-full flex flex-col shadow-none border overflow-hidden">
      <CardHeader className="py-3 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm uppercase font-bold">Component Life Limits</CardTitle>
          <CardDescription className="text-xs">Tracking Time Since Overhaul (TSO) for serialized parts.</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={handleAddComponent} className="h-8 gap-2">
          <PlusCircle className="h-3.5 w-3.5" /> Add Component
        </Button>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar">
        <Table>
          <TableHeader className="bg-muted/30 sticky top-0 z-10">
            <TableRow>
              <TableHead className="text-[10px] uppercase font-bold">Component</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-right">Current Hours</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-right">Limit</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-right">Remaining</TableHead>
              <TableHead className="text-right text-[10px] uppercase font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(aircraft.components || []).map((comp) => {
              const current = (aircraft.frameHours || 0) - comp.installHours + comp.tsn;
              const remaining = comp.maxHours - current;
              return (
                <TableRow key={comp.id}>
                  <TableCell className="text-xs font-bold">{comp.name}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{current.toFixed(1)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{comp.maxHours.toFixed(1)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    <Badge variant={remaining < 100 ? 'destructive' : 'outline'} className="text-[10px] font-bold">
                      {remaining.toFixed(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(comp.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {(aircraft.components || []).length === 0 && (
              <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic text-xs">No components being tracked.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
