'use client';

import { use, useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, collection, query, orderBy, arrayUnion, updateDoc } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ArrowLeft, PlusCircle, Trash2, FileText, Wrench, ShieldAlert, History, Eye, ZoomIn } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DocumentUploader } from '@/components/document-uploader';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import Image from 'next/image';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const componentFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  manufacturer: z.string().optional(),
  serialNumber: z.string().min(1, 'Serial number is required'),
  partNumber: z.string().optional(),
  installHours: z.number({ coerce: true }).min(0),
  maxHours: z.number({ coerce: true }).min(0),
  notes: z.string().optional(),
});

const logFormSchema = z.object({
  maintenanceType: z.string().min(1, 'Type is required'),
  date: z.string().min(1, 'Date is required'),
  details: z.string().min(1, 'Details are required'),
  reference: z.string().optional(),
  ameNo: z.string().optional(),
  amoNo: z.string().optional(),
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

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const handleViewDocument = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };

  const handleAddLog = async (values: z.infer<typeof logFormSchema>) => {
    if (!firestore) return;
    try {
      const logsCol = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
      const newLogRef = doc(logsCol);
      await updateDoc(newLogRef, { ...values, id: newLogRef.id, aircraftId });
      toast({ title: 'Maintenance Log Added' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const handleAddComponent = async (values: z.infer<typeof componentFormSchema>) => {
    if (!firestore || !aircraftRef) return;
    try {
      const newComponent: AircraftComponent = {
        ...values,
        id: uuidv4(),
        installDate: new Date().toISOString(),
        tsn: 0,
        tso: 0,
        totalTime: 0,
        name: values.name || '',
        manufacturer: values.manufacturer || '',
        partNumber: values.partNumber || '',
        notes: values.notes || '',
      };
      await updateDoc(aircraftRef, {
        components: arrayUnion(newComponent)
      });
      toast({ title: 'Component Added' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const onDocumentUploaded = async (docDetails: any) => {
    if (!firestore || !aircraftRef) return;
    try {
      const updatedDocs = [...(aircraft?.documents || []), docDetails];
      await updateDoc(aircraftRef, { documents: updatedDocs });
      toast({ title: 'Document Uploaded' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  if (isLoadingAircraft) {
    return (
      <div className="max-w-[1200px] mx-auto w-full p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  const currentTacho = aircraft.currentTacho || 0;
  const timeTo50 = Math.max(0, (aircraft.tachoAtNext50Inspection || 0) - currentTacho).toFixed(1);
  const timeTo100 = Math.max(0, (aircraft.tachoAtNext100Inspection || 0) - currentTacho).toFixed(1);

  return (
    <div className="max-w-[1200px] mx-auto w-full p-1 space-y-6">
      <div className="flex justify-between items-start shrink-0">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 text-muted-foreground">
            <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link>
          </Button>
          <h1 className="text-4xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
          <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">Hobbs:</span>
            <span className="font-mono font-bold text-primary">{(aircraft.currentHobbs || 0).toFixed(1)}h</span>
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">Tacho:</span>
            <span className="font-mono font-bold text-primary">{currentTacho.toFixed(1)}h</span>
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
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start">
          <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Maintenance Logs</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Technical Documents</TabsTrigger>
          <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Component Tracker</TabsTrigger>
        </TabsList>

        <TabsContent value="maintenance" className="mt-0">
          <MaintenanceTab logs={logs || []} onAddLog={handleAddLog} />
        </TabsContent>
        <TabsContent value="documents" className="mt-0">
          <DocumentsTab documents={aircraft.documents || []} onUpload={onDocumentUploaded} onView={handleViewDocument} />
        </TabsContent>
        <TabsContent value="components" className="mt-0">
          <ComponentsTab components={aircraft.components || []} onAdd={handleAddComponent} />
        </TabsContent>
      </Tabs>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          {viewingImageUrl && (
            <div className="relative h-[70vh] w-full bg-muted flex items-center justify-center rounded-md overflow-hidden">
              <img src={viewingImageUrl} alt="Aircraft Document" className="max-h-full max-w-full object-contain" />
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsImageViewerOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MaintenanceTab({ logs, onAddLog }: { logs: MaintenanceLog[], onAddLog: (v: any) => Promise<void> }) {
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm({ resolver: zodResolver(logFormSchema), defaultValues: { maintenanceType: '', date: format(new Date(), 'yyyy-MM-dd'), details: '', reference: '', ameNo: '', amoNo: '' } });

  return (
    <Card className="shadow-none border">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5 py-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Maintenance History</CardTitle>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Log</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Maintenance Log</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => onAddLog(v).then(() => setIsOpen(false)))} className="space-y-4">
                <FormField control={form.control} name="maintenanceType" render={({ field }) => (<FormItem><FormLabel>Type</FormLabel><FormControl><Input placeholder="e.g., 100 Hour Inspection" {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="details" render={({ field }) => (<FormItem><FormLabel>Details</FormLabel><FormControl><Textarea placeholder="Details of work performed..." {...field} /></FormControl></FormItem>)} />
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="reference" render={({ field }) => (<FormItem><FormLabel>Ref #</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="ameNo" render={({ field }) => (<FormItem><FormLabel>AME #</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="amoNo" render={({ field }) => (<FormItem><FormLabel>AMO #</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                </div>
                <DialogFooter><Button type="submit">Save Log Entry</Button></DialogFooter>
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
              <TableHead>Details</TableHead>
              <TableHead>Ref</TableHead>
              <TableHead>AME/AMO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length > 0 ? logs.map(log => (
              <TableRow key={log.id}>
                <TableCell className="font-medium whitespace-nowrap">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                <TableCell className="font-bold">{log.maintenanceType}</TableCell>
                <TableCell className="text-xs max-w-md truncate">{log.details}</TableCell>
                <TableCell>{log.reference || '-'}</TableCell>
                <TableCell className="text-[10px]">{log.ameNo} / {log.amoNo}</TableCell>
              </TableRow>
            )) : <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No maintenance logs found.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DocumentsTab({ documents, onUpload, onView }: { documents: any[], onUpload: (v: any) => void, onView: (url: string) => void }) {
  return (
    <Card className="shadow-none border">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5 py-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Technical Documents</CardTitle>
        </div>
        <DocumentUploader
          onDocumentUploaded={onUpload}
          trigger={(open) => <Button size="sm" onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>}
        />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Document Name</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length > 0 ? documents.map(doc => (
              <TableRow key={doc.name}>
                <TableCell className="font-bold">{doc.name}</TableCell>
                <TableCell>{format(new Date(doc.uploadDate), 'dd MMM yyyy')}</TableCell>
                <TableCell>{doc.expirationDate ? format(new Date(doc.expirationDate), 'dd MMM yyyy') : '-'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(doc.url)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )) : <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No documents uploaded.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ComponentsTab({ components, onAdd }: { components: AircraftComponent[], onAdd: (v: any) => Promise<void> }) {
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm({ resolver: zodResolver(componentFormSchema), defaultValues: { name: '', manufacturer: '', serialNumber: '', partNumber: '', installHours: 0, maxHours: 0, notes: '' } });

  return (
    <Card className="shadow-none border">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5 py-4">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Life-Limited Components</CardTitle>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Track New Component</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => onAdd(v).then(() => setIsOpen(false)))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Engine" {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="manufacturer" render={({ field }) => (<FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="serialNumber" render={({ field }) => (<FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="partNumber" render={({ field }) => (<FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="installHours" render={({ field }) => (<FormItem><FormLabel>Hours at Install</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="maxHours" render={({ field }) => (<FormItem><FormLabel>Life Limit (Hours)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
                </div>
                <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
                <DialogFooter><Button type="submit">Start Tracking</Button></DialogFooter>
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
              <TableHead>S/N</TableHead>
              <TableHead className="text-right">TSN</TableHead>
              <TableHead className="text-right">Limit</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {components.length > 0 ? components.map(comp => {
              const remaining = Math.max(0, comp.maxHours - comp.tsn);
              return (
                <TableRow key={comp.id}>
                  <TableCell>
                    <p className="font-bold">{comp.name}</p>
                    <p className="text-[10px] text-muted-foreground">{comp.manufacturer}</p>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                  <TableCell className="text-right font-mono">{comp.tsn.toFixed(1)}h</TableCell>
                  <TableCell className="text-right font-mono">{comp.maxHours.toFixed(1)}h</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={remaining < 50 ? 'destructive' : 'outline'} className="font-mono font-bold">
                      {remaining.toFixed(1)}h
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {remaining < 50 && <ShieldAlert className="h-4 w-4 text-destructive" />}
                  </TableCell>
                </TableRow>
              )
            }) : <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No life-limited components tracked.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
