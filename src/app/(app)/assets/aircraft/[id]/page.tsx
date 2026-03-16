'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy, arrayUnion, addDoc, deleteDoc } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, PlusCircle, Trash2, FileText, History, Settings2, Clock, Calendar, Gauge } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DocumentUploader } from '@/components/document-uploader';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const aircraftId = resolvedParams.id;
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  const isLoading = isLoadingAircraft || isLoadingLogs;

  const timeTo50 = useMemo(() => {
    if (!aircraft?.currentTacho || !aircraft?.tachoAtNext50Inspection) return 'N/A';
    return (aircraft.tachoAtNext50Inspection - aircraft.currentTacho).toFixed(1);
  }, [aircraft]);

  const timeTo100 = useMemo(() => {
    if (!aircraft?.currentTacho || !aircraft?.tachoAtNext100Inspection) return 'N/A';
    return (aircraft.tachoAtNext100Inspection - aircraft.currentTacho).toFixed(1);
  }, [aircraft]);

  if (isLoading) {
    return <div className="max-w-[1200px] mx-auto w-full p-6"><Skeleton className="h-[600px] w-full" /></div>;
  }

  if (!aircraft) {
    return (
      <div className="max-w-[1200px] mx-auto w-full text-center py-20">
        <p className="text-muted-foreground mb-4">Aircraft not found.</p>
        <Button asChild variant="outline"><Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden pb-10 px-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/assets/aircraft"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <p className="text-muted-foreground">{aircraft.make} {aircraft.model}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">Hobbs:</span>
            <span className="font-mono font-bold text-primary">{aircraft.currentHobbs?.toFixed(1) || '0.0'}h</span>
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">Tacho:</span>
            <span className="font-mono font-bold text-primary">{aircraft.currentTacho?.toFixed(1) || '0.0'}h</span>
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">To 50h:</span>
            <span className={cn("font-mono font-bold", Number(timeTo50) < 10 ? "text-destructive" : "text-green-600")}>
              {timeTo50}h
            </span>
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">To 100h:</span>
            <span className={cn("font-mono font-bold", Number(timeTo100) < 20 ? "text-destructive" : "text-green-600")}>
              {timeTo100}h
            </span>
          </Badge>
        </div>
      </div>

      <Card className="flex-grow flex flex-col overflow-hidden shadow-none border">
        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4 border-b bg-muted/5">
            <TabsList className="bg-transparent h-auto p-0 gap-6 border-b-0 justify-start">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-0 font-bold text-xs uppercase tracking-wider">Overview</TabsTrigger>
              <TabsTrigger value="maintenance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-0 font-bold text-xs uppercase tracking-wider">Maintenance Logs</TabsTrigger>
              <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-0 font-bold text-xs uppercase tracking-wider">Technical Documents</TabsTrigger>
              <TabsTrigger value="components" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-0 font-bold text-xs uppercase tracking-wider">Component Tracker</TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                <TabsContent value="overview" className="mt-0 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <DetailGroup title="Specifications" icon={Settings2}>
                      <DetailItem label="Type" value={aircraft.type} />
                      <DetailItem label="Total Airframe" value={`${aircraft.frameHours?.toFixed(1) || '0.0'}h`} />
                      <DetailItem label="Total Engine" value={`${aircraft.engineHours?.toFixed(1) || '0.0'}h`} />
                    </DetailGroup>
                    <DetailGroup title="Inspection Status" icon={Calendar}>
                      <DetailItem label="Next 50h Tacho" value={`${aircraft.tachoAtNext50Inspection?.toFixed(1) || 'N/A'}h`} />
                      <DetailItem label="Next 100h Tacho" value={`${aircraft.tachoAtNext100Inspection?.toFixed(1) || 'N/A'}h`} />
                    </DetailGroup>
                  </div>
                </TabsContent>

                <TabsContent value="maintenance" className="mt-0">
                  <MaintenanceTab aircraft={aircraft} tenantId={tenantId} logs={logs || []} />
                </TabsContent>

                <TabsContent value="documents" className="mt-0">
                  <DocumentsTab aircraft={aircraft} tenantId={tenantId} />
                </TabsContent>

                <TabsContent value="components" className="mt-0">
                  <ComponentsTab aircraft={aircraft} tenantId={tenantId} />
                </TabsContent>
              </div>
            </ScrollArea>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}

function DetailGroup({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary">
        <Icon className="h-4 w-4" />
        <h3 className="text-sm font-bold uppercase tracking-widest">{title}</h3>
      </div>
      <div className="space-y-3 pl-6 border-l-2 border-primary/10">
        {children}
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value || 'N/A'}</p>
    </div>
  );
}

// --- Maintenance Tab ---
function MaintenanceTab({ aircraft, tenantId, logs }: { aircraft: Aircraft; tenantId: string; logs: MaintenanceLog[] }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const formSchema = z.object({
    maintenanceType: z.string().min(1, "Required"),
    date: z.string().min(1, "Required"),
    details: z.string().min(1, "Required"),
    reference: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { maintenanceType: '', date: new Date().toISOString().substring(0, 10), details: '', reference: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    try {
      const colRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraft.id}/maintenanceLogs`);
      await addDoc(colRef, { ...values, aircraftId: aircraft.id });
      toast({ title: 'Maintenance log added' });
      setIsOpen(false);
      form.reset();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const handleDelete = async (logId: string) => {
    if (!firestore || !window.confirm('Delete this log entry?')) return;
    try {
      await deleteDoc(doc(firestore, `tenants/${tenantId}/aircrafts/${aircraft.id}/maintenanceLogs`, logId));
      toast({ title: 'Log deleted' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Historical Records</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Maintenance Log</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Maintenance Entry</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="maintenanceType" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><FormControl><Input placeholder="e.g., 50h Inspection" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="date" render={({ field }) => ( <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="details" render={({ field }) => ( <FormItem><FormLabel>Work Details</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="reference" render={({ field }) => ( <FormItem><FormLabel>Reference #</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <DialogFooter><Button type="submit">Save Record</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length > 0 ? logs.map(log => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                <TableCell>{log.maintenanceType}</TableCell>
                <TableCell>{log.reference || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(log.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            )) : <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No maintenance records found.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// --- Documents Tab ---
function DocumentsTab({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDocumentUploaded = (docDetails: any) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { documents: arrayUnion(docDetails) });
    toast({ title: 'Document uploaded' });
  };

  const handleDelete = (docName: string) => {
    if (!firestore || !window.confirm('Remove this document?')) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    const updatedDocs = (aircraft.documents || []).filter(d => d.name !== docName);
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocs });
    toast({ title: 'Document removed' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Aircraft Documents</h3>
        <DocumentUploader
          onDocumentUploaded={handleDocumentUploaded}
          trigger={(open) => <Button size="sm" onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>}
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aircraft.documents?.length ? aircraft.documents.map(d => (
              <TableRow key={d.name}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell>{format(new Date(d.uploadDate), 'dd MMM yyyy')}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="outline" size="sm"><Link href={d.url} target="_blank">View</Link></Button>
                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDelete(d.name)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No technical documents stored.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// --- Components Tab ---
function ComponentsTab({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const formSchema = z.object({
    name: z.string().min(1, "Required"),
    serialNumber: z.string().min(1, "Required"),
    tsn: z.number({ coerce: true }).min(0),
    maxHours: z.number({ coerce: true }).min(1),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', serialNumber: '', tsn: 0, maxHours: 2000 },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    const newComponent: AircraftComponent = {
      id: uuidv4(),
      manufacturer: 'Unknown',
      installDate: new Date().toISOString(),
      installHours: aircraft.currentHobbs || 0,
      notes: '',
      tso: 0,
      totalTime: values.tsn,
      partNumber: 'N/A',
      ...values,
    };
    updateDocumentNonBlocking(aircraftRef, { components: arrayUnion(newComponent) });
    toast({ title: 'Component added to tracker' });
    setIsOpen(false);
    form.reset();
  };

  const handleDelete = (compId: string) => {
    if (!firestore || !window.confirm('Remove this component?')) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    const updated = (aircraft.components || []).filter(c => c.id !== compId);
    updateDocumentNonBlocking(aircraftRef, { components: updated });
    toast({ title: 'Component removed' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Lifecycle Tracking</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Track New Component</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Engine #1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>Current TSN</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Life Limit (Hours)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <DialogFooter><Button type="submit">Register Component</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {aircraft.components?.length ? aircraft.components.map(comp => {
          const remaining = comp.maxHours - comp.totalTime;
          const percentage = Math.max(0, Math.min(100, (remaining / comp.maxHours) * 100));
          return (
            <Card key={comp.id} className="bg-muted/10 shadow-none border-slate-200">
              <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-sm font-bold">{comp.name}</CardTitle>
                  <CardDescription className="text-[10px]">S/N: {comp.serialNumber}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(comp.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-muted-foreground">Hours Remaining</span>
                  <span className={cn(remaining < 50 ? "text-destructive" : "text-green-600")}>{remaining.toFixed(1)}h</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className={cn("h-full transition-all", percentage < 10 ? "bg-destructive" : percentage < 25 ? "bg-orange-500" : "bg-green-500")} style={{ width: `${percentage}%` }} />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>TSN: {comp.totalTime.toFixed(1)}h</span>
                  <span>LIMIT: {comp.maxHours.toFixed(1)}h</span>
                </div>
              </CardContent>
            </Card>
          )
        }) : <div className="col-span-full py-12 border-2 border-dashed rounded-lg text-center text-muted-foreground text-sm">No serialized components registered.</div>}
      </div>
    </div>
  );
}
