'use client';

import { use, useState, useMemo } from 'react';
import { collection, query, orderBy, doc, arrayUnion } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, PlusCircle, History, FileText, Settings2, Trash2, Clock, Gauge, AlertTriangle, View } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';

  const canManage = hasPermission('assets-manage');

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

  const timeTo50 = useMemo(() => {
    if (!aircraft) return '0.0';
    return ((aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0)).toFixed(1);
  }, [aircraft]);

  const timeTo100 = useMemo(() => {
    if (!aircraft) return '0.0';
    return ((aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0)).toFixed(1);
  }, [aircraft]);

  if (isLoadingAc) {
    return <div className="max-w-[1200px] mx-auto w-full p-8"><Skeleton className="h-96 w-full" /></div>;
  }

  if (!aircraft) {
    return <div className="max-w-[1200px] mx-auto w-full p-8 text-center">Aircraft not found.</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/assets/aircraft"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">Hobbs:</span>
            <span className="font-mono font-bold">{aircraft.currentHobbs?.toFixed(1) || '0.0'}h</span>
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">Tacho:</span>
            <span className="font-mono font-bold">{aircraft.currentTacho?.toFixed(1) || '0.0'}h</span>
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

      <Tabs defaultValue="maintenance" className="w-full flex-1 flex flex-col min-h-0">
        <div className="px-1 shrink-0">
          <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start">
            <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground gap-2">
              <History className="h-4 w-4" /> Maintenance Logs
            </TabsTrigger>
            <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground gap-2">
              <Settings2 className="h-4 w-4" /> Component Tracker
            </TabsTrigger>
            <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground gap-2">
              <FileText className="h-4 w-4" /> Technical Documents
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden px-1">
          <TabsContent value="maintenance" className="m-0 h-full">
            <MaintenanceTab logs={logs || []} isLoading={isLoadingLogs} aircraftId={aircraftId} tenantId={tenantId} canManage={canManage} />
          </TabsContent>
          <TabsContent value="components" className="m-0 h-full">
            <ComponentsTab aircraft={aircraft} tenantId={tenantId} canManage={canManage} />
          </TabsContent>
          <TabsContent value="documents" className="m-0 h-full">
            <DocumentsTab aircraft={aircraft} tenantId={tenantId} canManage={canManage} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function MaintenanceTab({ logs, isLoading, aircraftId, tenantId, canManage }: { logs: MaintenanceLog[], isLoading: boolean, aircraftId: string, tenantId: string, canManage: boolean }) {
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleAddLog = (values: any) => {
    if (!firestore) return;
    const colRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(colRef, { ...values, date: new Date().toISOString() });
    toast({ title: 'Maintenance Log Added' });
    setIsAddLogOpen(false);
  };

  return (
    <Card className="h-full flex flex-col shadow-none border">
      <CardHeader className="flex flex-row items-center justify-between shrink-0">
        <div>
          <CardTitle>Maintenance History</CardTitle>
          <CardDescription>Record of all mechanical work and inspections performed.</CardDescription>
        </div>
        {canManage && (
          <Dialog open={isAddLogOpen} onOpenChange={setIsAddLogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Log</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Maintenance Log</DialogTitle></DialogHeader>
              <AddLogForm onSubmit={handleAddLog} onCancel={() => setIsAddLogOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-0 border-t">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>AME No.</TableHead>
              <TableHead>Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length > 0 ? logs.map(log => (
              <TableRow key={log.id}>
                <TableCell className="font-medium whitespace-nowrap">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                <TableCell><Badge variant="outline">{log.maintenanceType}</Badge></TableCell>
                <TableCell className="max-w-md truncate">{log.details}</TableCell>
                <TableCell>{log.ameNo || 'N/A'}</TableCell>
                <TableCell>{log.reference || 'N/A'}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">No maintenance logs found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ComponentsTab({ aircraft, tenantId, canManage }: { aircraft: Aircraft, tenantId: string, canManage: boolean }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleAddComponent = (values: any) => {
    if (!firestore) return;
    const docRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(docRef, { components: arrayUnion({ ...values, id: uuidv4(), installDate: new Date().toISOString() }) });
    toast({ title: 'Component Added', description: `Tracking initiated for ${values.name}.` });
    setIsAddOpen(false);
  };

  return (
    <Card className="h-full flex flex-col shadow-none border">
      <CardHeader className="flex flex-row items-center justify-between shrink-0">
        <div>
          <CardTitle>Component Tracking</CardTitle>
          <CardDescription>Monitor life-limited parts and serialized components.</CardDescription>
        </div>
        {canManage && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Serialized Component</DialogTitle></DialogHeader>
              <AddComponentForm onSubmit={handleAddComponent} onCancel={() => setIsAddOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-0 border-t">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Component</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead className="text-right">TSN (h)</TableHead>
              <TableHead className="text-right">Life Limit (h)</TableHead>
              <TableHead className="text-right">Remaining (h)</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aircraft.components && aircraft.components.length > 0 ? aircraft.components.map(comp => {
              const remaining = comp.maxHours - comp.tsn;
              const isWarning = remaining < 50;
              return (
                <TableRow key={comp.id}>
                  <TableCell className="font-bold">{comp.name}</TableCell>
                  <TableCell className="font-mono">{comp.serialNumber}</TableCell>
                  <TableCell className="text-right font-mono">{comp.tsn.toFixed(1)}</TableCell>
                  <TableCell className="text-right font-mono">{comp.maxHours.toFixed(1)}</TableCell>
                  <TableCell className={cn("text-right font-mono font-bold", isWarning && "text-destructive")}>{remaining.toFixed(1)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={isWarning ? "destructive" : "secondary"} className="text-[10px]">{isWarning ? "Due Soon" : "Serviceable"}</Badge>
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">No tracked components defined.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DocumentsTab({ aircraft, tenantId, canManage }: { aircraft: Aircraft, tenantId: string, canManage: boolean }) {
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDocUploaded = (docDetails: any) => {
    if (!firestore) return;
    const docRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(docRef, { documents: arrayUnion(docDetails) });
    toast({ title: 'Document Uploaded' });
  };

  return (
    <Card className="h-full flex flex-col shadow-none border">
      <CardHeader className="flex flex-row items-center justify-between shrink-0">
        <div>
          <CardTitle>Technical Documents</CardTitle>
          <CardDescription>C of A, Insurance, and other compliance documentation.</CardDescription>
        </div>
        {canManage && (
          <DocumentUploader onDocumentUploaded={handleDocUploaded} trigger={(open) => <Button size="sm" onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>} />
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-0 border-t">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Document Name</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aircraft.documents && aircraft.documents.length > 0 ? aircraft.documents.map((d, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell>{format(new Date(d.uploadDate), 'dd MMM yyyy')}</TableCell>
                <TableCell>{d.expirationDate ? format(new Date(d.expirationDate), 'dd MMM yyyy') : 'No Expiry'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => setViewingUrl(d.url)}>
                    <View className="h-4 w-4 mr-2" /> View
                  </Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">No technical documents uploaded.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={!!viewingUrl} onOpenChange={(open) => !open && setViewingUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          <div className="relative h-[70vh] bg-muted rounded-md overflow-hidden">
            {viewingUrl && <iframe src={viewingUrl} className="w-full h-full border-none" title="Document" />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingUrl(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

const addLogSchema = z.object({
  maintenanceType: z.string().min(1),
  details: z.string().min(1),
  ameNo: z.string().optional(),
  reference: z.string().optional(),
});

function AddLogForm({ onSubmit, onCancel }: { onSubmit: (v: any) => void, onCancel: () => void }) {
  const form = useForm({ resolver: zodResolver(addLogSchema), defaultValues: { maintenanceType: 'Scheduled', details: '', ameNo: '', reference: '' } });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="maintenanceType" render={({ field }) => (
          <FormItem><FormLabel>Maintenance Type</FormLabel><FormControl><Input placeholder="e.g. 50h Inspection" {...field} /></FormControl></FormItem>
        )} />
        <FormField control={form.control} name="details" render={({ field }) => (
          <FormItem><FormLabel>Work Details</FormLabel><FormControl><Textarea placeholder="Describe the work performed..." {...field} /></FormControl></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="ameNo" render={({ field }) => (
            <FormItem><FormLabel>AME License No.</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="reference" render={({ field }) => (
            <FormItem><FormLabel>Job Reference</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
          )} />
        </div>
        <DialogFooter><Button variant="outline" type="button" onClick={onCancel}>Cancel</Button><Button type="submit">Save Log</Button></DialogFooter>
      </form>
    </Form>
  );
}

const addComponentSchema = z.object({
  name: z.string().min(1),
  serialNumber: z.string().min(1),
  tsn: z.coerce.number().min(0),
  maxHours: z.coerce.number().min(1),
});

function AddComponentForm({ onSubmit, onCancel }: { onSubmit: (v: any) => void, onCancel: () => void }) {
  const form = useForm({ resolver: zodResolver(addComponentSchema), defaultValues: { name: '', serialNumber: '', tsn: 0, maxHours: 2000 } });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g. Propeller" {...field} /></FormControl></FormItem>
        )} />
        <FormField control={form.control} name="serialNumber" render={({ field }) => (
          <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="tsn" render={({ field }) => (
            <FormItem><FormLabel>TSN (Hours)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="maxHours" render={({ field }) => (
            <FormItem><FormLabel>Life Limit (Hours)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>
          )} />
        </div>
        <DialogFooter><Button variant="outline" type="button" onClick={onCancel}>Cancel</Button><Button type="submit">Start Tracking</Button></DialogFooter>
      </form>
    </Form>
  );
}
