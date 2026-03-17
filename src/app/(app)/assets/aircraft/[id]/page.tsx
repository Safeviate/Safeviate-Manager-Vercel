'use client';

import { use, useState, useMemo } from 'react';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy, arrayUnion } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, PlusCircle, History, FileText, Settings2, ShieldCheck, Clock, Gauge, User, FileUp, Eye, Pencil } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { DocumentUploader } from '@/components/document-uploader';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const aircraftId = resolvedParams.id;
  const firestore = useFirestore();
  const tenantId = 'safeviate';

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

  if (isLoadingAc) {
    return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  }

  if (!aircraft) {
    return <div className="p-8 text-center">Aircraft not found.</div>;
  }

  // --- Calculations ---
  const timeTo50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const timeTo100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full px-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/assets/aircraft"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <p className="text-muted-foreground">{aircraft.make} {aircraft.model}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
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
            <span className={cn("font-mono font-bold", timeTo50 < 10 ? "text-destructive" : "text-green-600")}>
              {timeTo50.toFixed(1)}h
            </span>
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">To 100h:</span>
            <span className={cn("font-mono font-bold", timeTo100 < 10 ? "text-destructive" : "text-green-600")}>
              {timeTo100.toFixed(1)}h
            </span>
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start overflow-x-auto no-scrollbar">
          <TabsTrigger value="overview" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Overview</TabsTrigger>
          <TabsTrigger value="logs" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Maintenance Logs</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Documents</TabsTrigger>
          <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Components</TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0">
          <TabsContent value="overview" className="m-0 h-full"><OverviewTab aircraft={aircraft} tenantId={tenantId} /></TabsContent>
          <TabsContent value="logs" className="m-0 h-full"><MaintenanceTab logs={logs || []} tenantId={tenantId} aircraftId={aircraftId} /></TabsContent>
          <TabsContent value="documents" className="m-0 h-full"><DocumentsTab aircraft={aircraft} tenantId={tenantId} /></TabsContent>
          <TabsContent value="components" className="m-0 h-full"><ComponentsTab aircraft={aircraft} tenantId={tenantId} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// --- TAB: Overview ---
function OverviewTab({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  return (
    <Card className="shadow-none border">
      <CardHeader className="bg-muted/10 border-b flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Technical Overview</CardTitle>
          <CardDescription>Specifications and current meter readings.</CardDescription>
        </div>
        <EditAircraftDialog aircraft={aircraft} tenantId={tenantId} />
      </CardHeader>
      <CardContent className="p-6 space-y-10">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-primary tracking-widest flex items-center gap-2">
              <Settings2 className="h-3 w-3" /> Specifications
            </h3>
            <div className="space-y-3">
              <DetailItem label="Make" value={aircraft.make} />
              <DetailItem label="Model" value={aircraft.model} />
              <DetailItem label="Type" value={aircraft.type || 'Single-Engine'} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-primary tracking-widest flex items-center gap-2">
              <Clock className="h-3 w-3" /> Meter History
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="Initial Hobbs" value={(aircraft.initialHobbs || 0).toFixed(1)} />
              <DetailItem label="Current Hobbs" value={(aircraft.currentHobbs || 0).toFixed(1)} />
              <DetailItem label="Initial Tacho" value={(aircraft.initialTacho || 0).toFixed(1)} />
              <DetailItem label="Current Tacho" value={(aircraft.currentTacho || 0).toFixed(1)} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-primary tracking-widest flex items-center gap-2">
              <ShieldCheck className="h-3 w-3" /> Maintenance Targets
            </h3>
            <div className="space-y-3">
              <DetailItem label="Next 50h Inspection" value={`${(aircraft.tachoAtNext50Inspection || 0).toFixed(1)} Tacho`} />
              <DetailItem label="Next 100h Inspection" value={`${(aircraft.tachoAtNext100Inspection || 0).toFixed(1)} Tacho`} />
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

// --- TAB: Maintenance ---
function MaintenanceTab({ logs, tenantId, aircraftId }: { logs: MaintenanceLog[]; tenantId: string; aircraftId: string }) {
  return (
    <Card className="shadow-none border">
      <CardHeader className="bg-muted/10 border-b flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Maintenance Logs</CardTitle>
          <CardDescription>Chronological history of all inspections and repairs.</CardDescription>
        </div>
        <AddMaintenanceLogDialog tenantId={tenantId} aircraftId={aircraftId} />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>AME/AMO</TableHead>
              <TableHead className="text-right">Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length > 0 ? logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                <TableCell><Badge variant="outline">{log.maintenanceType}</Badge></TableCell>
                <TableCell className="max-w-xs truncate">{log.details}</TableCell>
                <TableCell className="text-xs">
                  <p>{log.ameNo || 'N/A'}</p>
                  <p className="text-muted-foreground">{log.amoNo}</p>
                </TableCell>
                <TableCell className="text-right font-mono text-[10px]">{log.reference}</TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">No maintenance logs recorded.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// --- TAB: Documents ---
function DocumentsTab({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  const [viewingDoc, setViewingDoc] = useState<Aircraft['documents'][0] | null>(null);
  const firestore = useFirestore();

  const handleDocDelete = (docName: string) => {
    if (!firestore || !window.confirm(`Delete ${docName}?`)) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    const updated = (aircraft.documents || []).filter(d => d.name !== docName);
    updateDocumentNonBlocking(aircraftRef, { documents: updated });
  };

  return (
    <Card className="shadow-none border">
      <CardHeader className="bg-muted/10 border-b flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Technical Documents</CardTitle>
          <CardDescription>Certificates, insurance, and maintenance records.</CardDescription>
        </div>
        <DocumentUploader
          trigger={(open) => <Button onClick={() => open()} variant="outline" size="sm" className="gap-2"><FileUp className="h-4 w-4" /> Add Document</Button>}
          onDocumentUploaded={(newDoc) => {
            const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
            updateDocumentNonBlocking(aircraftRef, { documents: arrayUnion(newDoc) });
          }}
        />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Document Name</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(aircraft.documents || []).length > 0 ? (aircraft.documents || []).map((doc) => (
              <TableRow key={doc.name}>
                <TableCell className="font-semibold">{doc.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(doc.uploadDate), 'dd MMM yyyy')}</TableCell>
                <TableCell className="text-xs">{doc.expirationDate ? format(new Date(doc.expirationDate), 'dd MMM yyyy') : 'No Expiry'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setViewingDoc(doc)}><Eye className="h-4 w-4 mr-2" /> View</Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDocDelete(doc.name)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">No documents uploaded.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>{viewingDoc?.name}</DialogTitle></DialogHeader>
          <div className="relative h-[70vh] bg-muted rounded-md overflow-hidden">
            {viewingDoc && <Image src={viewingDoc.url} alt={viewingDoc.name} fill className="object-contain" />}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// --- TAB: Components ---
function ComponentsTab({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  const firestore = useFirestore();

  const handleDelete = (compId: string) => {
    if (!firestore || !window.confirm('Remove component from aircraft?')) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    const updated = (aircraft.components || []).filter(c => c.id !== compId);
    updateDocumentNonBlocking(aircraftRef, { components: updated });
  };

  return (
    <Card className="shadow-none border">
      <CardHeader className="bg-muted/10 border-b flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Component Tracker</CardTitle>
          <CardDescription>Track TSN/TSO for serialized components and engines.</CardDescription>
        </div>
        <AddComponentDialog tenantId={tenantId} aircraftId={aircraft.id} />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Component</TableHead>
              <TableHead>Serial No.</TableHead>
              <TableHead className="text-right">Total Time</TableHead>
              <TableHead className="text-right">Max Life</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(aircraft.components || []).length > 0 ? (aircraft.components || []).map((comp) => {
              const remaining = (comp.maxHours || 0) - (comp.totalTime || 0);
              return (
                <TableRow key={comp.id}>
                  <TableCell>
                    <p className="font-bold">{comp.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{comp.manufacturer}</p>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{(comp.totalTime || 0).toFixed(1)}h</TableCell>
                  <TableCell className="text-right font-mono text-xs">{(comp.maxHours || 0).toFixed(1)}h</TableCell>
                  <TableCell className="text-right font-bold text-xs">
                    <span className={cn(remaining < 50 ? "text-destructive" : "text-green-600")}>
                      {remaining.toFixed(1)}h
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(comp.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">No components tracked.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// --- Dialogs ---

function DetailItem({ label, value }: { label: string; value?: string | number }) {
  return (
    <div>
      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-semibold">{value || 'N/A'}</p>
    </div>
  );
}

function AddMaintenanceLogDialog({ tenantId, aircraftId }: { tenantId: string; aircraftId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      maintenanceType: 'Routine',
      date: new Date().toISOString().substring(0, 10),
      details: '',
      reference: '',
      ameNo: '',
      amoNo: '',
    }
  });

  const onSubmit = (data: any) => {
    if (!firestore) return;
    const colRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(colRef, { ...data, aircraftId });
    toast({ title: 'Maintenance Log Recorded' });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild><Button size="sm" className="gap-2"><PlusCircle className="h-4 w-4" /> Add Log</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New Maintenance Entry</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="maintenanceType" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
              <FormField control={form.control} name="date" render={({ field }) => ( <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem> )} />
            </div>
            <FormField control={form.control} name="details" render={({ field }) => ( <FormItem><FormLabel>Work Details</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem> )} />
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="reference" render={({ field }) => ( <FormItem><FormLabel>Reference</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
              <FormField control={form.control} name="ameNo" render={({ field }) => ( <FormItem><FormLabel>AME No.</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
              <FormField control={form.control} name="amoNo" render={({ field }) => ( <FormItem><FormLabel>AMO No.</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
            </div>
            <DialogFooter><Button type="submit">Record Log</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function AddComponentDialog({ tenantId, aircraftId }: { tenantId: string; aircraftId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      name: '',
      manufacturer: '',
      partNumber: '',
      serialNumber: '',
      totalTime: 0,
      maxHours: 2000,
    }
  });

  const onSubmit = (data: any) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId);
    updateDocumentNonBlocking(aircraftRef, { components: arrayUnion({ ...data, id: uuidv4(), installDate: new Date().toISOString() }) });
    toast({ title: 'Component Added' });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-2"><PlusCircle className="h-4 w-4" /> Add Component</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Track New Component</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
              <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="totalTime" render={({ field }) => ( <FormItem><FormLabel>Total Time (TSN/TSO)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem> )} />
              <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Max Life (h)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem> )} />
            </div>
            <DialogFooter><Button type="submit">Add Component</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditAircraftDialog({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(z.object({
      make: z.string().min(1),
      model: z.string().min(1),
      type: z.string(),
      initialHobbs: z.number({ coerce: true }),
      currentHobbs: z.number({ coerce: true }),
      initialTacho: z.number({ coerce: true }),
      currentTacho: z.number({ coerce: true }),
      tachoAtNext50Inspection: z.number({ coerce: true }),
      tachoAtNext100Inspection: z.number({ coerce: true }),
    })),
    defaultValues: {
      make: aircraft.make || '',
      model: aircraft.model || '',
      type: aircraft.type || 'Single-Engine',
      initialHobbs: aircraft.initialHobbs || 0,
      currentHobbs: aircraft.currentHobbs || 0,
      initialTacho: aircraft.initialTacho || 0,
      currentTacho: aircraft.currentTacho || 0,
      tachoAtNext50Inspection: aircraft.tachoAtNext50Inspection || 0,
      tachoAtNext100Inspection: aircraft.tachoAtNext100Inspection || 0,
    }
  });

  const onSubmit = (values: any) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, values);
    toast({ title: 'Aircraft Updated' });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Aircraft Configuration</DialogTitle>
          <DialogDescription>Update technical specifications and current meter readings.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
              <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Single-Engine">Single-Engine</SelectItem>
                      <SelectItem value="Multi-Engine">Multi-Engine</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div className="space-y-4 border-r pr-4">
                <h4 className="text-xs font-bold uppercase text-primary">Hobbs Meter</h4>
                <FormField control={form.control} name="initialHobbs" render={({ field }) => ( <FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
                <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase text-primary">Tacho Meter</h4>
                <FormField control={form.control} name="initialTacho" render={({ field }) => ( <FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
                <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => ( <FormItem><FormLabel>Tacho at Next 50h</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
              <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => ( <FormItem><FormLabel>Tacho at Next 100h</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
            </div>

            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
