'use client';

import { use, useMemo, useState, useEffect } from 'react';
import { doc, collection, query, orderBy, arrayUnion, updateDoc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogClose, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { 
  History, 
  FileText, 
  Settings2, 
  PlusCircle, 
  Clock, 
  Tool, 
  ArrowLeft, 
  ZoomIn, 
  AlertTriangle,
  Pencil,
  LayoutGrid,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { DocumentUploader } from '@/components/document-uploader';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const componentFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  partNumber: z.string().min(1, 'Part number is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  installDate: z.string().min(1, 'Date is required'),
  installHours: z.coerce.number().min(0),
  maxHours: z.coerce.number().min(0),
  notes: z.string().optional(),
});

const aircraftEditFormSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  type: z.enum(['Single-Engine', 'Multi-Engine']),
  initialHobbs: z.coerce.number().min(0),
  currentHobbs: z.coerce.number().min(0),
  initialTacho: z.coerce.number().min(0),
  currentTacho: z.coerce.number().min(0),
  tachoAtNext50Inspection: z.coerce.number().min(0),
  tachoAtNext100Inspection: z.coerce.number().min(0),
});

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

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isAcLoading } = useDoc<Aircraft>(aircraftRef);
  const { data: logs, isLoading: isLogsLoading } = useCollection<MaintenanceLog>(logsQuery);

  if (isAcLoading) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!aircraft) {
    return <div className="p-8 text-center">Aircraft not found.</div>;
  }

  const timeTo50 = ((aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0)).toFixed(1);
  const timeTo100 = ((aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0)).toFixed(1);

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col h-full overflow-hidden gap-4 px-1 pb-10">
      <div className="shrink-0 flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 -ml-2">
              <Link href="/assets/aircraft"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-3xl font-black tracking-tight">{aircraft.tailNumber}</h1>
            <Badge variant="outline" className="h-6 uppercase font-bold text-[10px] tracking-widest bg-muted/50">
              {aircraft.make} {aircraft.model}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider pl-8">Asset ID: {aircraft.id}</p>
        </div>

        <div className="flex gap-2">
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

      <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-4 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex">
          <TabsTrigger value="overview" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 gap-2">
            <LayoutGrid className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 gap-2">
            <History className="h-4 w-4" /> Maintenance Logs
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 gap-2">
            <FileText className="h-4 w-4" /> Technical Documents
          </TabsTrigger>
          <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 gap-2">
            <Settings2 className="h-4 w-4" /> Component Tracker
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="overview" className="m-0 h-full">
            <OverviewTab aircraft={aircraft} aircraftRef={aircraftRef!} />
          </TabsContent>
          <TabsContent value="maintenance" className="m-0 h-full">
            <MaintenanceTab logs={logs || []} tenantId={tenantId} aircraftId={aircraftId} />
          </TabsContent>
          <TabsContent value="documents" className="m-0 h-full">
            <DocumentsTab aircraft={aircraft} tenantId={tenantId} aircraftRef={aircraftRef!} />
          </TabsContent>
          <TabsContent value="components" className="m-0 h-full">
            <ComponentsTab aircraft={aircraft} tenantId={tenantId} aircraftRef={aircraftRef!} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function OverviewTab({ aircraft, aircraftRef }: { aircraft: Aircraft, aircraftRef: any }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof aircraftEditFormSchema>>({
    resolver: zodResolver(aircraftEditFormSchema),
    defaultValues: {
      make: aircraft.make,
      model: aircraft.model,
      type: (aircraft.type as any) || 'Single-Engine',
      initialHobbs: aircraft.initialHobbs || 0,
      currentHobbs: aircraft.currentHobbs || 0,
      initialTacho: aircraft.initialTacho || 0,
      currentTacho: aircraft.currentTacho || 0,
      tachoAtNext50Inspection: aircraft.tachoAtNext50Inspection || 0,
      tachoAtNext100Inspection: aircraft.tachoAtNext100Inspection || 0,
    }
  });

  const onSubmit = async (values: z.infer<typeof aircraftEditFormSchema>) => {
    try {
      await updateDoc(aircraftRef, values);
      toast({ title: 'Aircraft Updated' });
      setIsEditDialogOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    }
  };

  return (
    <Card className="h-full shadow-none border">
      <CardHeader className="border-b bg-muted/5 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <CardTitle>Aircraft Specifications & Meters</CardTitle>
        </div>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-2">
              <Pencil className="h-3.5 w-3.5" />
              Edit Overview
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Aircraft Overview</DialogTitle>
              <DialogDescription>Update the primary identification and meter readings for this aircraft.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="initialHobbs" render={({ field }) => ( <FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="initialTacho" render={({ field }) => ( <FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 50h Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 100h Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button type="submit">Save Changes</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-green-700">Specifications</h3>
            <div className="space-y-4">
              <div><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Manufacturer</p><p className="text-sm font-semibold">{aircraft.make}</p></div>
              <div><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Model</p><p className="text-sm font-semibold">{aircraft.model}</p></div>
              <div><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Type</p><p className="text-sm font-semibold">{aircraft.type || 'Single-Engine'}</p></div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-green-700">Meter Readings</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              <div><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Initial Hobbs</p><p className="text-lg font-black">{(aircraft.initialHobbs || 0).toFixed(1)}h</p></div>
              <div><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 text-primary">Current Hobbs</p><p className="text-lg font-black text-green-600">{(aircraft.currentHobbs || 0).toFixed(1)}h</p></div>
              <div><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Initial Tacho</p><p className="text-lg font-black">{(aircraft.initialTacho || 0).toFixed(1)}h</p></div>
              <div><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 text-primary">Current Tacho</p><p className="text-lg font-black text-green-600">{(aircraft.currentTacho || 0).toFixed(1)}h</p></div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-green-700">Inspection Schedule</h3>
            <div className="space-y-4">
              <div><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Next 50h Tacho</p><p className="text-sm font-semibold">{(aircraft.tachoAtNext50Inspection || 0).toFixed(1)}h</p></div>
              <div><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Next 100h Tacho</p><p className="text-sm font-semibold">{(aircraft.tachoAtNext100Inspection || 0).toFixed(1)}h</p></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MaintenanceTab({ logs, tenantId, aircraftId }: { logs: MaintenanceLog[], tenantId: string, aircraftId: string }) {
  const [isLogOpen, setIsLogOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleAddLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const logData = {
      date: new Date().toISOString(),
      maintenanceType: fd.get('type') as string,
      details: fd.get('details') as string,
      reference: fd.get('ref') as string,
      aircraftId: aircraftId
    };

    try {
      const logsRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
      await updateDoc(doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId), {
        maintenanceLogs: arrayUnion(logData)
      });
      toast({ title: 'Log Added' });
      setIsLogOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  return (
    <Card className="h-full shadow-none border">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5">
        <div>
          <CardTitle>Maintenance History</CardTitle>
          <CardDescription>Official technical log entry history for this airframe.</CardDescription>
        </div>
        <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
          <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Maintenance Log</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Maintenance Entry</DialogTitle></DialogHeader>
            <form onSubmit={handleAddLog} className="space-y-4 pt-4">
              <div className="space-y-2"><Label>Type</Label><Input name="type" placeholder="e.g., 50-Hour Inspection" required /></div>
              <div className="space-y-2"><Label>Reference</Label><Input name="ref" placeholder="Job card or AMO number" /></div>
              <div className="space-y-2"><Label>Details</Label><Input name="details" placeholder="Scope of work performed..." required /></div>
              <DialogFooter><Button type="submit">Save Entry</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <div className="p-6">
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-32">Date</TableHead>
                <TableHead className="w-48">Type</TableHead>
                <TableHead>Work Performed</TableHead>
                <TableHead className="text-right">Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="font-bold text-xs uppercase">{log.maintenanceType}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.details}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{log.reference || '-'}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">No logs recorded.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
}

function DocumentsTab({ aircraft, tenantId, aircraftRef }: { aircraft: Aircraft, tenantId: string, aircraftRef: any }) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleUpload = async (docDetails: any) => {
    try {
      await updateDoc(aircraftRef, {
        documents: arrayUnion(docDetails)
      });
      toast({ title: 'Document Uploaded' });
    } catch (e: any) {
      toast({ variant: 'destructive', description: e.message });
    }
  };

  return (
    <Card className="h-full shadow-none border">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5">
        <div>
          <CardTitle>Technical Documents</CardTitle>
          <CardDescription>Certificates, insurance, and airworthiness directives.</CardDescription>
        </div>
        <DocumentUploader onDocumentUploaded={handleUpload} trigger={(open) => <Button size="sm" variant="outline" onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>} />
      </CardHeader>
      <CardContent className="p-6">
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Document Name</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(aircraft.documents || []).map((doc, i) => (
                <TableRow key={i}>
                  <TableCell className="font-bold">{doc.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(doc.uploadDate), 'PPP')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => { setActiveUrl(doc.url); setIsViewerOpen(true); }}><ZoomIn className="mr-2 h-4 w-4" /> View</Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!aircraft.documents || aircraft.documents.length === 0) && <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic">No documents found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Document Preview</DialogTitle></DialogHeader>
          <div className="relative h-[70vh] w-full bg-muted rounded-md overflow-hidden">
            {activeUrl && <Image src={activeUrl} alt="Document Preview" fill className="object-contain" />}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ComponentsTab({ aircraft, tenantId, aircraftRef }: { aircraft: Aircraft, tenantId: string, aircraftRef: any }) {
  const [isAddOpen, setIsLogOpen] = useState(false);
  const { toast } = useToast();
  const form = useForm<z.infer<typeof componentFormSchema>>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: { name: '', manufacturer: '', partNumber: '', serialNumber: '', installDate: new Date().toISOString().split('T')[0], installHours: 0, maxHours: 0 }
  });

  const onSubmit = async (values: z.infer<typeof componentFormSchema>) => {
    try {
      const newComp = { ...values, id: uuidv4(), tsn: 0, tso: 0, totalTime: 0 };
      await updateDoc(aircraftRef, { components: arrayUnion(newComp) });
      toast({ title: 'Component Added' });
      setIsLogOpen(false);
      form.reset();
    } catch (e: any) {
      toast({ variant: 'destructive', description: e.message });
    }
  };

  return (
    <Card className="h-full shadow-none border">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5">
        <div>
          <CardTitle>Serialized Components</CardTitle>
          <CardDescription>Track life-limited parts and serialized assemblies.</CardDescription>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsLogOpen}>
          <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Serialized Part</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Part Name</FormLabel><FormControl><Input placeholder="e.g., Magneto" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="partNumber" render={({ field }) => ( <FormItem><FormLabel>Part #</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial #</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="installHours" render={({ field }) => ( <FormItem><FormLabel>Airframe at Install</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Life Limit (Hours)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <DialogFooter><Button type="submit">Install Component</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-6">
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Serial #</TableHead>
                <TableHead className="text-right">TSN</TableHead>
                <TableHead className="text-right">Limit</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(aircraft.components || []).map((comp) => {
                const currentTsn = (aircraft.currentHobbs || 0) - (comp.installHours || 0);
                const remaining = (comp.maxHours || 0) - currentTsn;
                return (
                  <TableRow key={comp.id}>
                    <TableCell>
                      <div><p className="font-bold text-xs">{comp.name}</p><p className="text-[10px] text-muted-foreground">{comp.manufacturer} P/N: {comp.partNumber}</p></div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{currentTsn.toFixed(1)}h</TableCell>
                    <TableCell className="text-right font-mono text-xs">{(comp.maxHours || 0).toFixed(1)}h</TableCell>
                    <TableCell className={cn("text-right font-black text-xs", remaining < 50 ? "text-destructive" : "text-green-600")}>{remaining.toFixed(1)}h</TableCell>
                  </TableRow>
                );
              })}
              {(!aircraft.components || aircraft.components.length === 0) && <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic">No serialized parts tracked.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
