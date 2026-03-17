'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy, arrayUnion } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plane, 
  History, 
  FileText, 
  Settings2, 
  ArrowLeft, 
  PlusCircle, 
  Trash2, 
  Clock, 
  Gauge, 
  AlertCircle,
  Eye,
  Pencil,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter, 
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DocumentUploader } from '@/components/document-uploader';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import { Separator } from '@/components/ui/separator';
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
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
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
      <div className="max-w-[1200px] mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!aircraft) {
    return (
      <div className="max-w-[1200px] mx-auto w-full text-center py-20">
        <p className="text-muted-foreground">Aircraft not found.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/assets/aircraft">Return to fleet</Link>
        </Button>
      </div>
    );
  }

  const timeTo50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const timeTo100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="max-w-[1200px] mx-auto w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/assets/aircraft"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <p className="text-muted-foreground">{aircraft.make} {aircraft.model}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            <span className={cn("font-mono font-bold", timeTo50 < 5 ? "text-destructive" : "text-green-600")}>
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
        <div className="px-1">
          <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start">
            <TabsTrigger value="overview" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Overview</TabsTrigger>
            <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Maintenance Logs</TabsTrigger>
            <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Component Tracker</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Technical Documents</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0 px-1">
          <OverviewTab aircraft={aircraft} tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="maintenance" className="mt-0 px-1">
          <MaintenanceTab aircraftId={aircraftId} tenantId={tenantId} logs={logs || []} isLoading={isLoadingLogs} />
        </TabsContent>

        <TabsContent value="components" className="mt-0 px-1">
          <ComponentsTab aircraft={aircraft} tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="documents" className="mt-0 px-1">
          <DocumentsTab aircraft={aircraft} tenantId={tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  return (
    <Card className="shadow-none border">
      <CardHeader className="bg-muted/5 border-b flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Aircraft Overview
          </CardTitle>
          <CardDescription>Specifications and current meter status.</CardDescription>
        </div>
        <EditAircraftDialog aircraft={aircraft} tenantId={tenantId} />
      </CardHeader>
      <CardContent className="p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary">Specifications</h3>
            <div className="grid grid-cols-1 gap-4">
              <DetailItem label="Manufacturer" value={aircraft.make} />
              <DetailItem label="Model" value={aircraft.model} />
              <DetailItem label="Engine Type" value={aircraft.type} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary">Hobbs Meter</h3>
            <div className="grid grid-cols-1 gap-4">
              <DetailItem label="Initial Hobbs" value={(aircraft.initialHobbs || 0).toFixed(1)} />
              <DetailItem label="Current Hobbs" value={(aircraft.currentHobbs || 0).toFixed(1)} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary">Tacho Meter</h3>
            <div className="grid grid-cols-1 gap-4">
              <DetailItem label="Initial Tacho" value={(aircraft.initialTacho || 0).toFixed(1)} />
              <DetailItem label="Current Tacho" value={(aircraft.currentTacho || 0).toFixed(1)} />
            </div>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary">Inspection Targets</h3>
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="Next 50h Tacho" value={(aircraft.tachoAtNext50Inspection || 0).toFixed(1)} />
              <DetailItem label="Next 100h Tacho" value={(aircraft.tachoAtNext100Inspection || 0).toFixed(1)} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MaintenanceTab({ aircraftId, tenantId, logs, isLoading }: { aircraftId: string; tenantId: string; logs: MaintenanceLog[]; isLoading: boolean }) {
  return (
    <Card className="shadow-none border">
      <CardHeader className="bg-muted/5 border-b flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Maintenance History</CardTitle>
          <CardDescription>All recorded maintenance events and inspections.</CardDescription>
        </div>
        <AddMaintenanceLogDialog aircraftId={aircraftId} tenantId={tenantId} />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>AME/AMO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length > 0 ? (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap font-medium">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                  <TableCell><Badge variant="secondary">{log.maintenanceType}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{log.reference || 'N/A'}</TableCell>
                  <TableCell className="max-w-md truncate">{log.details}</TableCell>
                  <TableCell className="text-xs">
                    {log.ameNo && <div>AME: {log.ameNo}</div>}
                    {log.amoNo && <div>AMO: {log.amoNo}</div>}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                  {isLoading ? 'Loading logs...' : 'No maintenance logs recorded.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ComponentsTab({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  return (
    <Card className="shadow-none border">
      <CardHeader className="bg-muted/5 border-b flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Component Tracker</CardTitle>
          <CardDescription>Track lifecycle and remaining hours for critical serialized parts.</CardDescription>
        </div>
        <AddComponentDialog aircraftId={aircraft.id} tenantId={tenantId} />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Component</TableHead>
              <TableHead>Serial No.</TableHead>
              <TableHead className="text-right">TSN</TableHead>
              <TableHead className="text-right">TSO</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead className="text-right">Limit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aircraft.components && aircraft.components.length > 0 ? (
              aircraft.components.map((comp) => {
                const remaining = comp.maxHours - comp.totalTime;
                return (
                  <TableRow key={comp.id}>
                    <TableCell className="font-medium">{comp.name}</TableCell>
                    <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                    <TableCell className="text-right">{(comp.tsn || 0).toFixed(1)}</TableCell>
                    <TableCell className="text-right">{(comp.tso || 0).toFixed(1)}</TableCell>
                    <TableCell className={cn("text-right font-bold", remaining < 50 ? "text-destructive" : "text-primary")}>
                      {remaining.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">{comp.maxHours.toFixed(1)}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                  No serialized components tracked for this aircraft.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DocumentsTab({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [viewingDoc, setViewingDoc] = useState<{ name: string; url: string } | null>(null);

  const handleDocUpload = (newDoc: any) => {
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, {
      documents: arrayUnion(newDoc)
    });
    toast({ title: 'Document Added', description: `"${newDoc.name}" has been uploaded.` });
  };

  const handleDeleteDoc = (docName: string) => {
    const updatedDocs = (aircraft.documents || []).filter(d => d.name !== docName);
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocs });
    toast({ title: 'Document Removed' });
  };

  return (
    <Card className="shadow-none border">
      <CardHeader className="bg-muted/5 border-b flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Technical Documents</CardTitle>
          <CardDescription>Aircraft certifications, insurance, and manuals.</CardDescription>
        </div>
        <DocumentUploader
          onDocumentUploaded={handleDocUpload}
          trigger={(open) => (
            <Button size="sm" onClick={() => open()} variant="outline" className="gap-2">
              <PlusCircle className="h-4 w-4" /> Add Document
            </Button>
          )}
        />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document Name</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aircraft.documents && aircraft.documents.length > 0 ? (
              aircraft.documents.map((doc) => (
                <TableRow key={doc.name}>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell className="text-xs">{format(new Date(doc.uploadDate), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="text-xs">
                    {doc.expirationDate ? (
                      <Badge variant="outline" className={cn(new Date(doc.expirationDate) < new Date() ? "text-destructive border-destructive" : "")}>
                        {format(new Date(doc.expirationDate), 'dd MMM yyyy')}
                      </Badge>
                    ) : 'No Expiry'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingDoc({ name: doc.name, url: doc.url })}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteDoc(doc.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">
                  No technical documents uploaded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{viewingDoc?.name}</DialogTitle>
          </DialogHeader>
          <div className="relative aspect-[4/3] w-full bg-muted rounded-md overflow-hidden border">
            {viewingDoc && <img src={viewingDoc.url} alt={viewingDoc.name} className="object-contain w-full h-full" />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingDoc(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// --- Modals ---

function EditAircraftDialog({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(z.object({
      make: z.string().min(1),
      model: z.string().min(1),
      type: z.string().min(1),
      initialHobbs: z.coerce.number(),
      currentHobbs: z.coerce.number(),
      initialTacho: z.coerce.number(),
      currentTacho: z.coerce.number(),
      tachoAtNext50Inspection: z.coerce.number(),
      tachoAtNext100Inspection: z.coerce.number(),
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
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, values);
    toast({ title: 'Aircraft Updated' });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-8 px-3 text-xs">
          <Pencil className="h-3.5 w-3.5" /> Edit Specifications
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Aircraft Details</DialogTitle>
          <DialogDescription>Update physical specs and meter offsets for {aircraft.tailNumber}.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
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
              )}/>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <FormField control={form.control} name="initialHobbs" render={({ field }) => ( <FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="initialTacho" render={({ field }) => ( <FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )}/>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 50h Tacho Target</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 100h Tacho Target</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )}/>
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

function AddMaintenanceLogDialog({ aircraftId, tenantId }: { aircraftId: string; tenantId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(z.object({
      date: z.string(),
      maintenanceType: z.string().min(1),
      details: z.string().min(1),
      reference: z.string().optional(),
      ameNo: z.string().optional(),
      amoNo: z.string().optional(),
    })),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      maintenanceType: 'Scheduled Inspection',
      details: '',
      reference: '',
      ameNo: '',
      amoNo: '',
    }
  });

  const onSubmit = (values: any) => {
    const colRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(colRef, values);
    toast({ title: 'Log Added' });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 h-8 px-3 text-xs">
          <PlusCircle className="h-3.5 w-3.5" /> Add Log Entry
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Maintenance Entry</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField control={form.control} name="date" render={({ field }) => ( <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem> )}/>
            <FormField control={form.control} name="maintenanceType" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Scheduled Inspection">Scheduled Inspection</SelectItem><SelectItem value="Defect Rectification">Defect Rectification</SelectItem><SelectItem value="Component Change">Component Change</SelectItem><SelectItem value="Service Bulletin">Service Bulletin</SelectItem></SelectContent></Select></FormItem> )}/>
            <FormField control={form.control} name="reference" render={({ field }) => ( <FormItem><FormLabel>Reference #</FormLabel><FormControl><Input placeholder="Internal or Release #..." {...field} /></FormControl></FormItem> )}/>
            <FormField control={form.control} name="details" render={({ field }) => ( <FormItem><FormLabel>Work Details</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem> )}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="ameNo" render={({ field }) => ( <FormItem><FormLabel>AME License</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="amoNo" render={({ field }) => ( <FormItem><FormLabel>AMO #</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Log</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function AddComponentDialog({ aircraftId, tenantId }: { aircraftId: string; tenantId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(z.object({
      name: z.string().min(1),
      serialNumber: z.string().min(1),
      tsn: z.coerce.number(),
      tso: z.coerce.number(),
      totalTime: z.coerce.number(),
      maxHours: z.coerce.number(),
    })),
    defaultValues: {
      name: '',
      serialNumber: '',
      tsn: 0,
      tso: 0,
      totalTime: 0,
      maxHours: 2000,
    }
  });

  const onSubmit = (values: any) => {
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId);
    const newComponent = { ...values, id: uuidv4(), installDate: new Date().toISOString() };
    
    updateDocumentNonBlocking(aircraftRef, {
      components: arrayUnion(newComponent)
    });
    
    toast({ title: 'Component Added' });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 h-8 px-3 text-xs">
          <PlusCircle className="h-3.5 w-3.5" /> Track Component
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Serialized Component</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Engine, Propeller, Magneto" {...field} /></FormControl></FormItem> )}/>
            <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>TSN (Time Since New)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>TSO (Time Since OH)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="totalTime" render={({ field }) => ( <FormItem><FormLabel>Current Total Time</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Service Life (Limit)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )}/>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Add Component</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[10px] uppercase font-bold text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
