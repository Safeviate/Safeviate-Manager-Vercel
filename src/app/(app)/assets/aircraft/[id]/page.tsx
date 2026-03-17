'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy, arrayUnion } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Clock, FileText, Settings, PlusCircle, Trash2, Calendar, FileDown, ShieldCheck, Wrench, Eye } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DocumentUploader } from '@/components/document-uploader';
import { cn } from '@/lib/utils';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const componentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  tsn: z.coerce.number().min(0),
  maxHours: z.coerce.number().min(0),
});

const maintenanceLogSchema = z.object({
  maintenanceType: z.string().min(1, 'Type is required'),
  details: z.string().min(1, 'Details are required'),
  date: z.string(),
  reference: z.string().optional(),
});

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const aircraftId = resolvedParams.id;
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const { toast } = useToast();

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  if (isLoadingAircraft) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-6 px-1">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!aircraft) {
    return <div className="text-center py-20">Aircraft not found.</div>;
  }

  const timeTo50 = aircraft.tachoAtNext50Inspection ? (aircraft.tachoAtNext50Inspection - (aircraft.currentTacho || 0)).toFixed(1) : 'N/A';
  const timeTo100 = aircraft.tachoAtNext100Inspection ? (aircraft.tachoAtNext100Inspection - (aircraft.currentTacho || 0)).toFixed(1) : 'N/A';

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full px-1 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon" className="h-8 w-8">
            <Link href="/assets/aircraft"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              {aircraft.tailNumber}
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Airworthy</Badge>
            </h1>
            <p className="text-muted-foreground">{aircraft.make} {aircraft.model}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">Hobbs:</span>
            <span className="font-mono font-bold">{(aircraft.currentHobbs || 0).toFixed(1)}h</span>
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">Tacho:</span>
            <span className="font-mono font-bold">{(aircraft.currentTacho || 0).toFixed(1)}h</span>
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">To 50h:</span>
            <span className={cn("font-mono font-bold", Number(timeTo50) < 10 ? "text-destructive" : "text-green-600")}>
              {timeTo50}h
            </span>
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">To 100h:</span>
            <span className={cn("font-mono font-bold", Number(timeTo100) < 10 ? "text-destructive" : "text-green-600")}>
              {timeTo100}h
            </span>
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start shrink-0 overflow-x-auto no-scrollbar">
          <TabsTrigger value="overview" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Overview</TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Maintenance Logs</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Technical Documents</TabsTrigger>
          <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Component Tracker</TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0">
          <TabsContent value="overview" className="m-0 h-full"><OverviewTab aircraft={aircraft} /></TabsContent>
          <TabsContent value="maintenance" className="m-0 h-full"><MaintenanceTab logs={logs || []} tenantId={tenantId} aircraftId={aircraftId} /></TabsContent>
          <TabsContent value="documents" className="m-0 h-full"><DocumentsTab aircraft={aircraft} tenantId={tenantId} /></TabsContent>
          <TabsContent value="components" className="m-0 h-full"><ComponentsTab aircraft={aircraft} tenantId={tenantId} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function OverviewTab({ aircraft }: { aircraft: Aircraft }) {
  return (
    <Card className="shadow-none border bg-muted/5 h-full overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          Aircraft Specifications & Meters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary">Specifications</h3>
            <div className="grid grid-cols-1 gap-4">
              <DetailItem label="Manufacturer" value={aircraft.make} />
              <DetailItem label="Model" value={aircraft.model} />
              <DetailItem label="Type" value={aircraft.type} />
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary">Meter Readings</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Initial Hobbs</p>
                <p className="text-lg font-mono font-bold">{(aircraft.initialHobbs || 0).toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Current Hobbs</p>
                <p className="text-lg font-mono font-bold text-primary">{(aircraft.currentHobbs || 0).toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Initial Tacho</p>
                <p className="text-lg font-mono font-bold">{(aircraft.initialTacho || 0).toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Current Tacho</p>
                <p className="text-lg font-mono font-bold text-primary">{(aircraft.currentTacho || 0).toFixed(1)}h</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary">Inspection Schedule</h3>
            <div className="grid grid-cols-1 gap-4">
              <DetailItem label="Next 50h Tacho" value={`${(aircraft.tachoAtNext50Inspection || 0).toFixed(1)}h`} />
              <DetailItem label="Next 100h Tacho" value={`${(aircraft.tachoAtNext100Inspection || 0).toFixed(1)}h`} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MaintenanceTab({ logs, tenantId, aircraftId }: { logs: MaintenanceLog[], tenantId: string, aircraftId: string }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const form = useForm<z.infer<typeof maintenanceLogSchema>>({
    resolver: zodResolver(maintenanceLogSchema),
    defaultValues: { date: new Date().toISOString().split('T')[0], maintenanceType: '', details: '', reference: '' }
  });

  const onSubmit = (values: z.infer<typeof maintenanceLogSchema>) => {
    if (!firestore) return;
    const colRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(colRef, values);
    toast({ title: 'Log Added' });
    form.reset();
  };

  return (
    <Card className="shadow-none border h-full flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between shrink-0">
        <CardTitle>History</CardTitle>
        <Dialog>
          <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Log</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Maintenance Entry</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Type</Label><Input {...form.register('maintenanceType')} placeholder="e.g., 50h Check" /></div>
                <div className="space-y-2"><Label>Date</Label><Input type="date" {...form.register('date')} /></div>
              </div>
              <div className="space-y-2"><Label>Ref/Release No.</Label><Input {...form.register('reference')} /></div>
              <div className="space-y-2"><Label>Work Details</Label><Input {...form.register('details')} /></div>
              <DialogFooter><Button type="submit">Save Entry</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Work Details</TableHead>
              <TableHead>Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map(log => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap font-mono text-xs">{log.date}</TableCell>
                <TableCell className="font-bold text-xs">{log.maintenanceType}</TableCell>
                <TableCell className="text-xs">{log.details}</TableCell>
                <TableCell className="text-xs font-mono">{log.reference || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DocumentsTab({ aircraft, tenantId }: { aircraft: Aircraft, tenantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [viewDoc, setViewDoc] = useState<{ name: string, url: string } | null>(null);

  const onDocumentUploaded = (docDetails: any) => {
    if (!firestore) return;
    const docRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(docRef, { documents: arrayUnion(docDetails) });
    toast({ title: 'Document Added' });
  };

  return (
    <Card className="shadow-none border h-full flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between shrink-0">
        <CardTitle>Technical Files</CardTitle>
        <DocumentUploader
          onDocumentUploaded={onDocumentUploaded}
          trigger={(open) => <Button size="sm" onClick={() => open()} variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>}
        />
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(aircraft.documents || []).map((doc, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-bold text-xs">{doc.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(doc.uploadDate), 'dd MMM yy')}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setViewDoc({ name: doc.name, url: doc.url })}>
                    <Eye className="h-4 w-4 mr-2" /> View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>{viewDoc?.name}</DialogTitle></DialogHeader>
          <div className="relative h-[70vh] bg-muted rounded border overflow-hidden">
            {viewDoc && <Image src={viewDoc.url} alt={viewDoc.name} fill className="object-contain" />}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ComponentsTab({ aircraft, tenantId }: { aircraft: Aircraft, tenantId: string }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const form = useForm<z.infer<typeof componentSchema>>({
    resolver: zodResolver(componentSchema),
    defaultValues: { name: '', serialNumber: '', tsn: 0, maxHours: 0 }
  });

  const onSubmit = (values: z.infer<typeof componentSchema>) => {
    if (!firestore) return;
    const docRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    const newComponent = { ...values, id: uuidv4(), installDate: new Date().toISOString() };
    updateDocumentNonBlocking(docRef, { components: arrayUnion(newComponent) });
    toast({ title: 'Component Tracked' });
    form.reset();
  };

  return (
    <Card className="shadow-none border h-full flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between shrink-0">
        <CardTitle>Lifecycle Tracking</CardTitle>
        <Dialog>
          <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Register Serialized Component</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="space-y-2"><Label>Component Name</Label><Input {...form.register('name')} placeholder="e.g., Engine No. 1" /></div>
              <div className="space-y-2"><Label>Serial Number</Label><Input {...form.register('serialNumber')} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Current TSN</Label><Input type="number" step="0.1" {...form.register('tsn')} /></div>
                <div className="space-y-2"><Label>Life Limit (Hours)</Label><Input type="number" step="0.1" {...form.register('maxHours')} /></div>
              </div>
              <DialogFooter><Button type="submit">Add to Registry</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead>Component</TableHead>
              <TableHead>Serial No.</TableHead>
              <TableHead className="text-right">TSN</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(aircraft.components || []).map((comp) => {
              const remaining = comp.maxHours - (comp.tsn || 0);
              return (
                <TableRow key={comp.id}>
                  <TableCell className="font-bold text-xs">{comp.name}</TableCell>
                  <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{(comp.tsn || 0).toFixed(1)}h</TableCell>
                  <TableCell className="text-right font-mono text-xs">{remaining.toFixed(1)}h</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={remaining < 50 ? 'destructive' : 'secondary'} className="text-[10px]">
                      {remaining < 50 ? 'Replace Soon' : 'Serviceable'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DetailItem({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div>
      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold">{value || 'N/A'}</p>
    </div>
  );
}

import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
