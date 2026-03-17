'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy, arrayUnion } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, FileText, History, Settings2, Info, View, Trash2, CalendarIcon, Plane } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  const { toast } = useToast();

  const [viewingDocUrl, setViewingDocUrl] = useState<string | null>(null);

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
    return <div className="p-8 h-full"><Skeleton className="h-full w-full" /></div>;
  }

  if (!aircraft) {
    return <div className="p-8 text-center">Aircraft not found.</div>;
  }

  const timeTo50 = aircraft.tachoAtNext50Inspection ? (aircraft.tachoAtNext50Inspection - (aircraft.currentTacho || 0)).toFixed(1) : 'N/A';
  const timeTo100 = aircraft.tachoAtNext100Inspection ? (aircraft.tachoAtNext100Inspection - (aircraft.currentTacho || 0)).toFixed(1) : 'N/A';

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/assets/aircraft"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
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

      <Tabs defaultValue="overview" className="w-full flex-1 flex flex-col min-h-0">
        <div className="px-1 shrink-0">
          <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex">
            <TabsTrigger value="overview" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground gap-2">
              <Info className="h-4 w-4" /> Overview
            </TabsTrigger>
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

        <div className="flex-1 min-h-0 px-1 pb-10">
          <TabsContent value="overview" className="m-0 h-full">
            <Card className="shadow-none border">
              <CardHeader>
                <CardTitle>Aircraft Overview</CardTitle>
                <CardDescription>General specifications and current status.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <Plane className="h-4 w-4" /> Specifications
                  </h3>
                  <div className="space-y-2">
                    <DetailItem label="Make" value={aircraft.make} />
                    <DetailItem label="Model" value={aircraft.model} />
                    <DetailItem label="Type" value={aircraft.type} />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <History className="h-4 w-4" /> Current Meters
                  </h3>
                  <div className="space-y-2">
                    <DetailItem label="Current Hobbs" value={`${(aircraft.currentHobbs || 0).toFixed(1)}h`} />
                    <DetailItem label="Current Tacho" value={`${(aircraft.currentTacho || 0).toFixed(1)}h`} />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" /> Inspection Targets
                  </h3>
                  <div className="space-y-2">
                    <DetailItem label="Next 50h Tacho" value={`${(aircraft.tachoAtNext50Inspection || 0).toFixed(1)}h`} />
                    <DetailItem label="Next 100h Tacho" value={`${(aircraft.tachoAtNext100Inspection || 0).toFixed(1)}h`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="m-0 h-full">
            <MaintenanceTab aircraft={aircraft} logs={logs || []} tenantId={tenantId} />
          </TabsContent>

          <TabsContent value="components" className="m-0 h-full">
            <ComponentsTab aircraft={aircraft} tenantId={tenantId} />
          </TabsContent>

          <TabsContent value="documents" className="m-0 h-full">
            <DocumentsTab 
              aircraft={aircraft} 
              tenantId={tenantId} 
              onViewDoc={(url) => setViewingDocUrl(url)}
            />
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={!!viewingDocUrl} onOpenChange={(open) => !open && setViewingDocUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Viewer</DialogTitle>
          </DialogHeader>
          <div className="relative h-[70vh] w-full bg-muted rounded-md overflow-hidden">
            {viewingDocUrl && (
              <iframe src={viewingDocUrl} className="w-full h-full border-none" title="Document Preview" />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingDocUrl(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value || 'N/A'}</p>
    </div>
  );
}

// --- Maintenance Tab ---
function MaintenanceTab({ aircraft, logs, tenantId }: { aircraft: Aircraft; logs: MaintenanceLog[]; tenantId: string }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm({
    defaultValues: { date: new Date(), type: '', details: '', reference: '', ameNo: '' }
  });

  const onSubmit = (values: any) => {
    if (!firestore) return;
    const logsCol = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraft.id}/maintenanceLogs`);
    const logData = { ...values, date: values.date.toISOString() };
    updateDocumentNonBlocking(doc(logsCol), logData);
    toast({ title: 'Maintenance Log Added' });
    setIsAddOpen(false);
    form.reset();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Maintenance History</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Log</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Maintenance Entry</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover><PopoverTrigger asChild><FormControl><Button variant="outline">{field.value ? format(field.value, 'PPP') : 'Pick a date'}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover>
                  </FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Type</FormLabel><Input {...field} placeholder="e.g. 50 Hour Inspection" /></FormItem>)} />
                <FormField control={form.control} name="details" render={({ field }) => (<FormItem><FormLabel>Details</FormLabel><Input {...field} /></FormItem>)} />
                <FormField control={form.control} name="ameNo" render={({ field }) => (<FormItem><FormLabel>AME No.</FormLabel><Input {...field} /></FormItem>)} />
                <FormField control={form.control} name="reference" render={({ field }) => (<FormItem><FormLabel>Reference (WO#)</FormLabel><Input {...field} /></FormItem>)} />
                <DialogFooter><Button type="submit">Save Log</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-[10px] uppercase font-bold">Date</TableHead>
              <TableHead className="text-[10px] uppercase font-bold">Type</TableHead>
              <TableHead className="text-[10px] uppercase font-bold">Details</TableHead>
              <TableHead className="text-[10px] uppercase font-bold">AME No.</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-right">Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map(log => (
              <TableRow key={log.id}>
                <TableCell className="text-xs">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                <TableCell className="text-xs font-bold">{log.type}</TableCell>
                <TableCell className="text-xs max-w-xs truncate">{log.details}</TableCell>
                <TableCell className="text-xs">{log.ameNo}</TableCell>
                <TableCell className="text-xs text-right font-mono">{log.reference}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">No logs recorded.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// --- Components Tab ---
function ComponentsTab({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm({
    defaultValues: { name: '', serialNumber: '', installHours: 0, maxHours: 0, notes: '' }
  });

  const onSubmit = (values: any) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    const newComponent = { ...values, id: uuidv4(), installDate: new Date().toISOString(), tsn: 0, tso: 0, totalTime: 0 };
    updateDocumentNonBlocking(aircraftRef, { components: arrayUnion(newComponent) });
    toast({ title: 'Component Added' });
    setIsAddOpen(false);
    form.reset();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Component Lifecycle Tracker</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Serialized Component</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Component Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="serialNumber" render={({ field }) => (<FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="installHours" render={({ field }) => (<FormItem><FormLabel>Hours at Install</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="maxHours" render={({ field }) => (<FormItem><FormLabel>Life Limit (Hours)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>)} />
                </div>
                <DialogFooter><Button type="submit">Add Component</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-[10px] uppercase font-bold">Component</TableHead>
              <TableHead className="text-[10px] uppercase font-bold">Serial No.</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-right">TSN</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-right">Limit</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-right">Remaining</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(aircraft.components || []).map(comp => {
              const remaining = comp.maxHours - comp.totalTime;
              return (
                <TableRow key={comp.id}>
                  <TableCell className="text-xs font-bold">{comp.name}</TableCell>
                  <TableCell className="text-xs font-mono">{comp.serialNumber}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{comp.totalTime.toFixed(1)}h</TableCell>
                  <TableCell className="text-xs text-right font-mono">{comp.maxHours.toFixed(1)}h</TableCell>
                  <TableCell className={cn("text-xs text-right font-bold font-mono", remaining < 50 ? "text-destructive" : "text-green-600")}>
                    {remaining.toFixed(1)}h
                  </TableCell>
                </TableRow>
              );
            })}
            {(!aircraft.components || aircraft.components.length === 0) && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">No serialized components tracked.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// --- Documents Tab ---
function DocumentsTab({ aircraft, tenantId, onViewDoc }: { aircraft: Aircraft; tenantId: string; onViewDoc: (url: string) => void }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDocUpload = (docDetails: any) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { documents: arrayUnion(docDetails) });
    toast({ title: 'Document Uploaded' });
  };

  const handleDocDelete = (docName: string) => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    const updated = (aircraft.documents || []).filter(d => d.name !== docName);
    updateDocumentNonBlocking(aircraftRef, { documents: updated });
    toast({ title: 'Document Deleted' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Technical Documentation</h2>
        <DocumentUploader onDocumentUploaded={handleDocUpload} trigger={(open) => <Button size="sm" onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>} />
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-[10px] uppercase font-bold">Document Name</TableHead>
              <TableHead className="text-[10px] uppercase font-bold">Upload Date</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(aircraft.documents || []).map(doc => (
              <TableRow key={doc.name}>
                <TableCell className="text-xs font-bold">{doc.name}</TableCell>
                <TableCell className="text-xs">{format(new Date(doc.uploadDate), 'dd MMM yyyy')}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onViewDoc(doc.url)}><View className="h-4 w-4" /></Button>
                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDocDelete(doc.name)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!aircraft.documents || aircraft.documents.length === 0) && <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">No documents uploaded.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
