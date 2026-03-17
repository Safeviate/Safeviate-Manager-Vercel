'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy, arrayUnion, updateDoc } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, History, FileText, Settings2, ShieldCheck, ArrowLeft, Clock, AlertTriangle, View, Trash2, LayoutGrid } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
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
    return <div className="max-w-[1200px] mx-auto w-full p-8"><Skeleton className="h-[600px] w-full" /></div>;
  }

  if (!aircraft) {
    return <div className="max-w-[1200px] mx-auto w-full p-8 text-center">Aircraft not found.</div>;
  }

  const timeTo50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const timeTo100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="max-w-[1200px] mx-auto w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link href="/assets/aircraft"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-mono">{aircraft.tailNumber}</h1>
            <p className="text-muted-foreground">{aircraft.make} {aircraft.model}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">Hobbs:</span>
            <span className="font-mono font-bold">{(aircraft.currentHobbs || 0).toFixed(1)}</span>
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">Tacho:</span>
            <span className="font-mono font-bold">{(aircraft.currentTacho || 0).toFixed(1)}</span>
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

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 overflow-x-auto no-scrollbar justify-start">
          <TabsTrigger value="overview" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="logs" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground flex items-center gap-2">
            <History className="h-4 w-4" /> Maintenance Logs
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" /> Technical Documents
          </TabsTrigger>
          <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground flex items-center gap-2">
            <Settings2 className="h-4 w-4" /> Component Tracker
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab aircraft={aircraft} />
        </TabsContent>

        <TabsContent value="logs">
          <MaintenanceTab aircraftId={aircraftId} tenantId={tenantId} logs={logs || []} isLoading={isLoadingLogs} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab aircraft={aircraft} tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="components">
          <ComponentsTab aircraft={aircraft} tenantId={tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({ aircraft }: { aircraft: Aircraft }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="shadow-none border">
        <CardHeader><CardTitle className="text-lg">Aircraft Specifications</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Manufacturer</p><p className="font-semibold">{aircraft.make}</p></div>
            <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Model</p><p className="font-semibold">{aircraft.model}</p></div>
            <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Engine Type</p><p className="font-semibold">{aircraft.type || 'Single-Engine'}</p></div>
            <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Organization</p><p className="font-semibold">{aircraft.organizationId || 'Internal'}</p></div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none border">
        <CardHeader><CardTitle className="text-lg">Meter Readings</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="p-3 bg-muted/30 rounded-lg border">
              <p className="text-[10px] uppercase font-black text-primary tracking-widest mb-2">Hobbs Hours</p>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-muted-foreground">Initial:</span>
                <span className="font-mono font-bold">{(aircraft.initialHobbs || 0).toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-baseline mt-1">
                <span className="text-xs text-muted-foreground">Current:</span>
                <span className="font-mono font-bold text-lg">{(aircraft.currentHobbs || 0).toFixed(1)}</span>
              </div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg border">
              <p className="text-[10px] uppercase font-black text-primary tracking-widest mb-2">Tacho Hours</p>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-muted-foreground">Initial:</span>
                <span className="font-mono font-bold">{(aircraft.initialTacho || 0).toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-baseline mt-1">
                <span className="text-xs text-muted-foreground">Current:</span>
                <span className="font-mono font-bold text-lg">{(aircraft.currentTacho || 0).toFixed(1)}</span>
              </div>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Next 50h Inspection</p>
              <p className="font-mono font-bold text-amber-600">{(aircraft.tachoAtNext50Inspection || 0).toFixed(1)} <span className="text-[10px]">TACHO</span></p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Next 100h Inspection</p>
              <p className="font-mono font-bold text-amber-600">{(aircraft.tachoAtNext100Inspection || 0).toFixed(1)} <span className="text-[10px]">TACHO</span></p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MaintenanceTab({ aircraftId, tenantId, logs, isLoading }: { aircraftId: string, tenantId: string, logs: MaintenanceLog[], isLoading: boolean }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(z.object({
      maintenanceType: z.string().min(1, "Type is required"),
      date: z.string().min(1, "Date is required"),
      details: z.string().min(1, "Details are required"),
      reference: z.string().optional(),
    })),
    defaultValues: { maintenanceType: '', date: format(new Date(), 'yyyy-MM-dd'), details: '', reference: '' }
  });

  const onSubmit = async (values: any) => {
    if (!firestore) return;
    const logsCol = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(logsCol, { ...values, id: uuidv4(), aircraftId });
    toast({ title: "Log Entry Added" });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Card className="shadow-none border">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5">
        <div>
          <CardTitle className="text-lg">Maintenance History</CardTitle>
          <CardDescription>Comprehensive record of all technical interventions.</CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Log</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Maintenance Entry</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="maintenanceType" render={({ field }) => (<FormItem><FormLabel>Intervention Type</FormLabel><Input placeholder="e.g., 50-Hour Inspection" {...field} /></FormItem>)} />
                <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><Input type="date" {...field} /></FormItem>)} />
                <FormField control={form.control} name="reference" render={({ field }) => (<FormItem><FormLabel>Reference / CRS</FormLabel><Input placeholder="Work Order #" {...field} /></FormItem>)} />
                <FormField control={form.control} name="details" render={({ field }) => (<FormItem><FormLabel>Work Details</FormLabel><Textarea placeholder="Full description of work performed..." {...field} /></FormItem>)} />
                <DialogFooter><Button type="submit">Save Record</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length > 0 ? logs.map(log => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">{format(new Date(log.date), 'dd MMM yy')}</TableCell>
                <TableCell className="font-bold">{log.maintenanceType}</TableCell>
                <TableCell className="font-mono text-xs">{log.reference || '-'}</TableCell>
                <TableCell className="max-w-md truncate">{log.details}</TableCell>
              </TableRow>
            )) : <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground">No maintenance records found.</TableCell></TableRow>}
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

  const handleDocUpload = (docDetails: any) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { documents: arrayUnion(docDetails) });
    toast({ title: "Document Uploaded" });
  };

  const handleDocDelete = (docName: string) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    const updatedDocs = (aircraft.documents || []).filter(d => d.name !== docName);
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocs });
    toast({ title: "Document Removed" });
  };

  return (
    <Card className="shadow-none border">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5">
        <div>
          <CardTitle className="text-lg">Technical Documents</CardTitle>
          <CardDescription>C of A, Insurance, and other aircraft documentation.</CardDescription>
        </div>
        <DocumentUploader
          onDocumentUploaded={handleDocUpload}
          trigger={(open) => <Button size="sm" variant="outline" onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>}
        />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Document Name</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aircraft.documents && aircraft.documents.length > 0 ? aircraft.documents.map(doc => (
              <TableRow key={doc.name}>
                <TableCell className="font-semibold">{doc.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(doc.uploadDate), 'PPP')}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setViewDoc({ name: doc.name, url: doc.url })}><View className="mr-2 h-4 w-4" /> View</Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDocDelete(doc.name)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            )) : <TableRow><TableCell colSpan={3} className="h-32 text-center text-muted-foreground">No documents uploaded.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={!!viewDoc} onOpenChange={(open) => !open && setViewDoc(null)}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader><DialogTitle>{viewDoc?.name}</DialogTitle></DialogHeader>
          <div className="flex-1 relative bg-muted rounded-md overflow-hidden">
            {viewDoc?.url && <img src={viewDoc.url} alt={viewDoc.name} className="w-full h-full object-contain" />}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ComponentsTab({ aircraft, tenantId }: { aircraft: Aircraft, tenantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(z.object({
      name: z.string().min(1, "Name is required"),
      serialNumber: z.string().min(1, "S/N required"),
      tsn: z.coerce.number().min(0),
      maxHours: z.coerce.number().min(1),
    })),
    defaultValues: { name: '', serialNumber: '', tsn: 0, maxHours: 2000 }
  });

  const onSubmit = async (values: any) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    const component: AircraftComponent = {
      ...values,
      id: uuidv4(),
      installDate: new Date().toISOString(),
      installHours: aircraft.currentHobbs || 0,
      tso: 0,
      totalTime: values.tsn,
      manufacturer: 'N/A',
      partNumber: 'N/A',
      notes: ''
    };
    await updateDoc(aircraftRef, { components: arrayUnion(component) });
    toast({ title: "Component Added" });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Card className="shadow-none border">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5">
        <div>
          <CardTitle className="text-lg">Component Life Tracker</CardTitle>
          <CardDescription>Track lifecycle and mandatory replacement times for serialized parts.</CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Register Serialized Component</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Component Name</FormLabel><Input placeholder="e.g., Lycoming O-360" {...field} /></FormItem>)} />
                <FormField control={form.control} name="serialNumber" render={({ field }) => (<FormItem><FormLabel>Serial Number</FormLabel><Input {...field} /></FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="tsn" render={({ field }) => (<FormItem><FormLabel>Current TSN (Hours)</FormLabel><Input type="number" step="0.1" {...field} /></FormItem>)} />
                  <FormField control={form.control} name="maxHours" render={({ field }) => (<FormItem><FormLabel>Life Limit (Hours)</FormLabel><Input type="number" step="0.1" {...field} /></FormItem>)} />
                </div>
                <DialogFooter><Button type="submit">Track Component</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Component</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead className="text-right">TSN</TableHead>
              <TableHead className="text-right">Limit</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aircraft.components && aircraft.components.length > 0 ? aircraft.components.map(comp => {
              const remaining = (comp.maxHours || 0) - (comp.tsn || 0);
              return (
                <TableRow key={comp.id}>
                  <TableCell className="font-bold">{comp.name}</TableCell>
                  <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                  <TableCell className="text-right font-mono">{(comp.tsn || 0).toFixed(1)}h</TableCell>
                  <TableCell className="text-right font-mono">{(comp.maxHours || 0).toFixed(1)}h</TableCell>
                  <TableCell className="text-right font-mono font-bold text-amber-600">{remaining.toFixed(1)}h</TableCell>
                </TableRow>
              );
            }) : <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No components tracked.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
