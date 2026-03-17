'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy, arrayUnion } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  PlusCircle, 
  History, 
  FileText, 
  Settings2, 
  Gauge, 
  Timer, 
  AlertTriangle, 
  Plane, 
  Clock, 
  Calendar,
  View,
  Trash2,
  Activity
} from 'lucide-react';
import Link from 'next/link';
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

  const { data: aircraft, isLoading: loadingAc } = useDoc<Aircraft>(aircraftRef);
  const { data: logs, isLoading: loadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  const timeTo50 = useMemo(() => {
    if (!aircraft?.currentTacho || !aircraft?.tachoAtNext50Inspection) return 'N/A';
    return (aircraft.tachoAtNext50Inspection - aircraft.currentTacho).toFixed(1);
  }, [aircraft]);

  const timeTo100 = useMemo(() => {
    if (!aircraft?.currentTacho || !aircraft?.tachoAtNext100Inspection) return 'N/A';
    return (aircraft.tachoAtNext100Inspection - aircraft.currentTacho).toFixed(1);
  }, [aircraft]);

  if (loadingAc) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1 shrink-0">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/assets/aircraft"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <p className="text-muted-foreground">{aircraft.make} {aircraft.model}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
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
            <span className={cn("font-mono font-bold", Number(timeTo100) < 15 ? "text-destructive" : "text-green-600")}>
              {timeTo100}h
            </span>
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full flex-1 flex flex-col min-h-0">
        <div className="px-1 shrink-0">
          <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start">
            <TabsTrigger value="overview" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Overview</TabsTrigger>
            <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Maintenance Logs</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Technical Documents</TabsTrigger>
            <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Component Tracker</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-1 no-scrollbar">
          <TabsContent value="overview" className="m-0 space-y-6">
            <OverviewTab aircraft={aircraft} />
          </TabsContent>
          <TabsContent value="maintenance" className="m-0">
            <MaintenanceTab logs={logs || []} tenantId={tenantId} aircraftId={aircraftId} />
          </TabsContent>
          <TabsContent value="documents" className="m-0">
            <DocumentsTab aircraft={aircraft} tenantId={tenantId} />
          </TabsContent>
          <TabsContent value="components" className="m-0">
            <ComponentsTab aircraft={aircraft} tenantId={tenantId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function OverviewTab({ aircraft }: { aircraft: Aircraft }) {
  const InfoBlock = ({ label, value }: { label: string, value?: string | number | null }) => (
    <div className="space-y-1">
      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{label}</p>
      <p className="text-lg font-bold">{value !== undefined && value !== null ? value : 'N/A'}{typeof value === 'number' ? 'h' : ''}</p>
    </div>
  );

  return (
    <Card className="shadow-none border">
      <CardHeader>
        <CardTitle>Aircraft Overview</CardTitle>
        <CardDescription>General specifications and current meter status.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-green-700">
            <Plane className="h-4 w-4" />
            <h3 className="text-xs font-black uppercase tracking-tighter">Specifications</h3>
          </div>
          <InfoBlock label="Make" value={aircraft.make} />
          <InfoBlock label="Model" value={aircraft.model} />
          <InfoBlock label="Type" value={aircraft.type} />
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2 text-green-700">
            <Activity className="h-4 w-4" />
            <h3 className="text-xs font-black uppercase tracking-tighter">Current Meters</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InfoBlock label="Initial Hobbs" value={aircraft.initialHobbs} />
            <InfoBlock label="Current Hobbs" value={aircraft.currentHobbs} />
            <InfoBlock label="Initial Tacho" value={aircraft.initialTacho} />
            <InfoBlock label="Current Tacho" value={aircraft.currentTacho} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2 text-green-700">
            <Calendar className="h-4 w-4" />
            <h3 className="text-xs font-black uppercase tracking-tighter">Inspection Targets</h3>
          </div>
          <InfoBlock label="Next 50h Tacho" value={aircraft.tachoAtNext50Inspection} />
          <InfoBlock label="Next 100h Tacho" value={aircraft.tachoAtNext100Inspection} />
        </div>
      </CardContent>
    </Card>
  );
}

function MaintenanceTab({ logs, tenantId, aircraftId }: { logs: MaintenanceLog[], tenantId: string, aircraftId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);

  const logForm = useForm({
    defaultValues: { maintenanceType: '', details: '', reference: '', date: format(new Date(), 'yyyy-MM-dd') }
  });

  const handleAddLog = (values: any) => {
    if (!firestore) return;
    const logsCol = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    updateDocumentNonBlocking(doc(logsCol), { ...values, date: new Date(values.date).toISOString() });
    toast({ title: 'Log Added' });
    setIsAddLogOpen(false);
    logForm.reset();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isAddLogOpen} onOpenChange={setIsAddLogOpen}>
          <DialogTrigger asChild><Button size="sm"><PlusCircle className="h-4 w-4 mr-2" /> Add Log</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Maintenance Entry</DialogTitle></DialogHeader>
            <Form {...logForm}>
              <form onSubmit={logForm.handleSubmit(handleAddLog)} className="space-y-4 pt-4">
                <FormField control={logForm.control} name="maintenanceType" render={({ field }) => (<FormItem><FormLabel>Type</FormLabel><Input placeholder="e.g., 50h Inspection" {...field} /></FormItem>)} />
                <FormField control={logForm.control} name="date" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><Input type="date" {...field} /></FormItem>)} />
                <FormField control={logForm.control} name="reference" render={({ field }) => (<FormItem><FormLabel>Reference #</FormLabel><Input placeholder="Logbook ref or AMO #" {...field} /></FormItem>)} />
                <FormField control={logForm.control} name="details" render={({ field }) => (<FormItem><FormLabel>Details</FormLabel><Textarea {...field} /></FormItem>)} />
                <DialogFooter><Button type="submit">Save Log</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length > 0 ? logs.map(log => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap font-medium">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                <TableCell><Badge variant="outline">{log.maintenanceType}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{log.reference || '-'}</TableCell>
                <TableCell className="max-w-md truncate text-xs">{log.details}</TableCell>
              </TableRow>
            )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No logs found.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DocumentsTab({ aircraft, tenantId }: { aircraft: Aircraft, tenantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [viewingDocUrl, setViewingDocUrl] = useState<string | null>(null);

  const handleUpload = (docDetails: any) => {
    if (!firestore) return;
    const updatedDocs = [...(aircraft.documents || []), docDetails];
    updateDocumentNonBlocking(doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id), { documents: updatedDocs });
    toast({ title: 'Document Uploaded' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <DocumentUploader
          onDocumentUploaded={handleUpload}
          trigger={(open) => <Button size="sm" onClick={() => open()}><PlusCircle className="h-4 w-4 mr-2" /> Add Document</Button>}
        />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Document Name</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aircraft.documents && aircraft.documents.length > 0 ? aircraft.documents.map((doc, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{doc.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(doc.uploadDate), 'dd MMM yyyy')}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setViewingDocUrl(doc.url)}>
                    <View className="h-4 w-4 mr-2" /> View
                  </Button>
                </TableCell>
              </TableRow>
            )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">No documents uploaded.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!viewingDocUrl} onOpenChange={() => setViewingDocUrl(null)}>
        <DialogContent className="max-w-4xl h-[85vh]">
          <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          <div className="flex-1 w-full h-full relative bg-muted rounded-md overflow-hidden">
            {viewingDocUrl && <iframe src={viewingDocUrl} className="w-full h-full border-none" />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ComponentsTab({ aircraft, tenantId }: { aircraft: Aircraft, tenantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const form = useForm({
    defaultValues: { name: '', partNumber: '', serialNumber: '', tsn: 0, maxHours: 0, installDate: format(new Date(), 'yyyy-MM-dd') }
  });

  const handleAddComponent = (values: any) => {
    if (!firestore) return;
    const component: AircraftComponent = {
      ...values,
      id: uuidv4(),
      installDate: new Date(values.installDate).toISOString(),
      installHours: aircraft.currentHobbs || 0,
      totalTime: values.tsn,
      tso: 0,
      manufacturer: '',
      notes: ''
    };
    updateDocumentNonBlocking(doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id), {
      components: arrayUnion(component)
    });
    toast({ title: 'Component Added' });
    setIsAddOpen(false);
    form.reset();
  };

  const handleDelete = (id: string) => {
    if (!firestore || !window.confirm('Remove this component?')) return;
    const updated = (aircraft.components || []).filter(c => c.id !== id);
    updateDocumentNonBlocking(doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id), { components: updated });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild><Button size="sm"><PlusCircle className="h-4 w-4 mr-2" /> Add Component</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Track New Component</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddComponent)} className="space-y-4 pt-4">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Component Name</FormLabel><Input placeholder="e.g., Magneto Left" {...field} /></FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="partNumber" render={({ field }) => (<FormItem><FormLabel>Part #</FormLabel><Input {...field} /></FormItem>)} />
                  <FormField control={form.control} name="serialNumber" render={({ field }) => (<FormItem><FormLabel>Serial #</FormLabel><Input {...field} /></FormItem>)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="tsn" render={({ field }) => (<FormItem><FormLabel>Current TSN</FormLabel><Input type="number" step="0.1" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormItem>)} />
                  <FormField control={form.control} name="maxHours" render={({ field }) => (<FormItem><FormLabel>Life Limit (Hrs)</FormLabel><Input type="number" step="0.1" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormItem>)} />
                </div>
                <FormField control={form.control} name="installDate" render={({ field }) => (<FormItem><FormLabel>Installation Date</FormLabel><Input type="date" {...field} /></FormItem>)} />
                <DialogFooter><Button type="submit">Track Component</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Component</TableHead>
              <TableHead>Part/Serial</TableHead>
              <TableHead className="text-right">TSN</TableHead>
              <TableHead className="text-right">Limit</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aircraft.components && aircraft.components.length > 0 ? aircraft.components.map(c => {
              const remaining = c.maxHours - c.tsn;
              const isUrgent = remaining < 50;
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-xs">{c.name}</TableCell>
                  <TableCell className="text-[10px] font-mono opacity-70">P: {c.partNumber}<br/>S: {c.serialNumber}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{c.tsn.toFixed(1)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{c.maxHours.toFixed(1)}</TableCell>
                  <TableCell className={cn("text-right font-bold font-mono text-xs", isUrgent ? "text-destructive" : "text-green-600")}>
                    {remaining.toFixed(1)}h
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="h-7 w-7 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            }) : <TableRow><TableCell colSpan={6} className="h-24 text-center">No lifecycle components tracked.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded-md", className)} />;
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
