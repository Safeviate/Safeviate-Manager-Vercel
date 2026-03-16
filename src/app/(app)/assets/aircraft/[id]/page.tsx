'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy, arrayUnion } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, PlusCircle, Trash2, FileText, Settings2, ShieldCheck, History, Clock } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { DocumentUploader } from '@/components/document-uploader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const aircraftRef = useMemoFirebase(() => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null), [firestore, tenantId, aircraftId]);
  const logsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null), [firestore, tenantId, aircraftId]);

  const { data: aircraft, isLoading: loadingAc } = useDoc<Aircraft>(aircraftRef);
  const { data: logs, isLoading: loadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  const handleDocumentUploaded = (docDetails: any) => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, {
      documents: arrayUnion(docDetails)
    });
    toast({ title: 'Document Saved' });
  };

  const handleDeleteDocument = (docName: string) => {
    if (!aircraftRef || !aircraft?.documents) return;
    const updated = aircraft.documents.filter(d => d.name !== docName);
    updateDocumentNonBlocking(aircraftRef, { documents: updated });
    toast({ title: 'Document Removed' });
  };

  if (loadingAc) {
    return <div className="max-w-[1200px] mx-auto w-full px-1"><Skeleton className="h-[600px] w-full" /></div>;
  }

  if (!aircraft) return <div className="p-10 text-center">Aircraft not found.</div>;

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full px-1 overflow-hidden">
      <div className="shrink-0 flex justify-between items-center">
        <Button asChild variant="ghost" size="sm">
          <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link>
        </Button>
      </div>

      <Card className="shrink-0 shadow-none border bg-muted/5">
        <CardHeader className="py-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle className="text-3xl font-black tracking-tighter">{aircraft.tailNumber}</CardTitle>
              <CardDescription>{aircraft.make} {aircraft.model} • {aircraft.type || 'Single-Engine'}</CardDescription>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Current Hobbs</p>
                <p className="text-2xl font-mono font-bold text-primary">{aircraft.currentHobbs?.toFixed(1) || '0.0'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Current Tacho</p>
                <p className="text-2xl font-mono font-bold text-primary">{aircraft.currentTacho?.toFixed(1) || '0.0'}</p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="maintenance" className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="shrink-0">
          <TabsList className="bg-transparent h-auto p-0 gap-2 mb-4 border-b-0 justify-start">
            <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-xs shrink-0">Maintenance Logs</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-xs shrink-0">Technical Documents</TabsTrigger>
            <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-xs shrink-0">Component Tracker</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent value="maintenance" className="m-0 h-full">
            <MaintenanceTab logs={logs || []} aircraftId={aircraftId} tenantId={tenantId} />
          </TabsContent>
          <TabsContent value="documents" className="m-0 h-full">
            <DocumentsTab documents={aircraft.documents || []} onUpload={handleDocumentUploaded} onDelete={handleDeleteDocument} />
          </TabsContent>
          <TabsContent value="components" className="m-0 h-full">
            <ComponentsTab aircraft={aircraft} tenantId={tenantId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function MaintenanceTab({ logs, aircraftId, tenantId }: { logs: MaintenanceLog[], aircraftId: string, tenantId: string }) {
  return (
    <Card className="h-full flex flex-col overflow-hidden shadow-none border">
      <CardHeader className="shrink-0 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Maintenance History</CardTitle>
          <CardDescription>Chronological record of technical work and inspections.</CardDescription>
        </div>
        <AddLogDialog aircraftId={aircraftId} tenantId={tenantId} />
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full custom-scrollbar">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 z-10">
              <TableRow>
                <TableHead className="text-[10px] uppercase font-bold">Date</TableHead>
                <TableHead className="text-[10px] uppercase font-bold">Type</TableHead>
                <TableHead className="text-[10px] uppercase font-bold">Details</TableHead>
                <TableHead className="text-[10px] uppercase font-bold">Reference</TableHead>
                <TableHead className="text-[10px] uppercase font-bold">AMO/AME</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-xs">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{log.maintenanceType}</Badge></TableCell>
                  <TableCell className="max-w-md text-xs">{log.details}</TableCell>
                  <TableCell className="text-xs font-mono">{log.reference || '-'}</TableCell>
                  <TableCell className="text-xs">{log.amoNo || log.ameNo || '-'}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic text-xs">No maintenance logs recorded.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function DocumentsTab({ documents, onUpload, onDelete }: { documents: any[], onUpload: (d: any) => void, onDelete: (n: string) => void }) {
  return (
    <Card className="h-full flex flex-col overflow-hidden shadow-none border">
      <CardHeader className="shrink-0 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Technical Documents</CardTitle>
          <CardDescription>C of A, Insurance, and other critical certifications.</CardDescription>
        </div>
        <DocumentUploader
          onDocumentUploaded={onUpload}
          trigger={(open) => (
            <Button size="sm" onClick={() => open()} variant="outline">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Document
            </Button>
          )}
        />
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full custom-scrollbar">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 z-10">
              <TableRow>
                <TableHead className="text-[10px] uppercase font-bold">Document Name</TableHead>
                <TableHead className="text-[10px] uppercase font-bold">Upload Date</TableHead>
                <TableHead className="text-[10px] uppercase font-bold">Expiry</TableHead>
                <TableHead className="text-right text-[10px] uppercase font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.name}>
                  <TableCell className="font-semibold text-xs">{doc.name}</TableCell>
                  <TableCell className="text-xs">{format(new Date(doc.uploadDate), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="text-xs">{doc.expirationDate ? format(new Date(doc.expirationDate), 'dd MMM yyyy') : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="ghost" size="sm" className="h-7 text-[10px] px-2">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer"><FileText className="mr-1 h-3 w-3" /> View</a>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(doc.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {documents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic text-xs">No documents uploaded.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ComponentsTab({ aircraft, tenantId }: { aircraft: Aircraft, tenantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = (compId: string) => {
    if (!firestore || !aircraft.components) return;
    const updated = aircraft.components.filter(c => c.id !== compId);
    const acRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(acRef, { components: updated });
    toast({ title: 'Component Removed' });
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden shadow-none border">
      <CardHeader className="shrink-0 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base uppercase font-bold tracking-tight">Component Life Limits</CardTitle>
          <CardDescription>Tracking Time Since Overhaul (TSO) for serialized parts.</CardDescription>
        </div>
        <AddComponentDialog aircraftId={aircraft.id} tenantId={tenantId} existingComponents={aircraft.components || []} />
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full custom-scrollbar">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 z-10">
              <TableRow>
                <TableHead className="text-[10px] uppercase font-bold">Component</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-right">Current Hours</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-right">Limit</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-right">Remaining</TableHead>
                <TableHead className="text-right text-[10px] uppercase font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(aircraft.components || []).map((comp) => {
                const remaining = (comp.maxHours || 0) - (comp.tsn || 0);
                const isWarning = remaining < 100;
                const isCritical = remaining < 20;

                return (
                  <TableRow key={comp.id}>
                    <TableCell className="font-bold text-xs">{comp.name}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{(comp.tsn || 0).toFixed(1)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{(comp.maxHours || 0).toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant={isCritical ? 'destructive' : isWarning ? 'secondary' : 'outline'}
                        className={cn("text-[10px] py-0 h-5 font-bold min-w-[60px] justify-center", !isCritical && !isWarning && "bg-emerald-50 text-emerald-700 border-emerald-200")}
                      >
                        {remaining.toFixed(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(comp.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {(aircraft.components || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic text-xs">No life-limited components tracked.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function AddLogDialog({ aircraftId, tenantId }: { aircraftId: string, tenantId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<any>({
    defaultValues: { date: new Date().toISOString().substring(0, 10), maintenanceType: '50 Hour Inspection', details: '', reference: '', amoNo: '' }
  });

  const onSubmit = (values: any) => {
    if (!firestore) return;
    const colRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(colRef, values);
    toast({ title: 'Log Added' });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Log</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New Maintenance Entry</DialogTitle></DialogHeader>
        <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>)} />
          <FormField control={form.control} name="maintenanceType" render={({ field }) => (<FormItem><FormLabel>Type</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
          <FormField control={form.control} name="details" render={({ field }) => (<FormItem><FormLabel>Details</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="reference" render={({ field }) => (<FormItem><FormLabel>Reference</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="amoNo" render={({ field }) => (<FormItem><FormLabel>AMO Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
          </div>
          <DialogFooter><Button type="submit">Save Log</Button></DialogFooter>
        </form></Form>
      </DialogContent>
    </Dialog>
  );
}

const componentFormSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  tsn: z.number({ coerce: true }).default(0),
  maxHours: z.number({ coerce: true }).default(0),
});

function AddComponentDialog({ aircraftId, tenantId, existingComponents }: { aircraftId: string, tenantId: string, existingComponents: AircraftComponent[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof componentFormSchema>>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: { name: '', tsn: 0, maxHours: 0 }
  });

  const onSubmit = (values: z.infer<typeof componentFormSchema>) => {
    if (!firestore) return;
    const acRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId);
    const newComp: Partial<AircraftComponent> = {
      id: uuidv4(),
      name: values.name,
      tsn: values.tsn,
      maxHours: values.maxHours,
      totalTime: values.tsn,
    };
    
    updateDocumentNonBlocking(acRef, {
      components: arrayUnion(newComp)
    });

    toast({ title: 'Component Added' });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild><Button size="sm" className="gap-2"><PlusCircle className="h-4 w-4" /> Add Component</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Track Life-Limited Component</DialogTitle>
          <DialogDescription>Define a new serialized part for lifecycle tracking.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Propeller, Engine" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tsn" render={({ field }) => (
                <FormItem><FormLabel>Time Since New (TSN)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="maxHours" render={({ field }) => (
                <FormItem><FormLabel>Life Limit (Hours)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormMessage /></FormItem>
              )} />
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
