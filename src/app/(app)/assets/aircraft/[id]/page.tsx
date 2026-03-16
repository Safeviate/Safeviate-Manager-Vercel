'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, arrayUnion } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Wrench, FileText, ClipboardList, Gauge, History, Trash2, ShieldCheck, Clock } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DocumentUploader } from '@/components/document-uploader';
import { v4 as uuidv4 } from 'uuid';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const componentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  tsn: z.number({ coerce: true }).min(0),
  maxHours: z.number({ coerce: true }).min(1, 'Life limit required'),
});

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

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

  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);

  const addComponentForm = useForm<z.infer<typeof componentSchema>>({
    resolver: zodResolver(componentSchema),
    defaultValues: { name: '', serialNumber: '', tsn: 0, maxHours: 2000 },
  });

  const handleAddComponent = (values: z.infer<typeof componentSchema>) => {
    if (!firestore || !aircraft) return;
    
    const newComponent: AircraftComponent = {
      id: uuidv4(),
      ...values,
      manufacturer: 'Unknown',
      partNumber: 'N/A',
      installDate: new Date().toISOString(),
      installHours: aircraft.currentHobbs || 0,
      tso: 0,
      totalTime: values.tsn,
      notes: '',
    };

    updateDocumentNonBlocking(aircraftRef!, {
      components: arrayUnion(newComponent)
    });

    toast({ title: 'Component Added', description: `Successfully added ${values.name} to the tracker.` });
    setIsAddComponentOpen(false);
    addComponentForm.reset();
  };

  const onDocumentUploaded = (docDetails: any) => {
    if (!firestore || !aircraft) return;
    updateDocumentNonBlocking(aircraftRef!, {
      documents: arrayUnion(docDetails)
    });
    toast({ title: 'Document Saved' });
  };

  if (isLoadingAircraft) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col h-full overflow-hidden gap-4 pb-10">
      <div className="shrink-0 px-1">
        <Button asChild variant="ghost" className="mb-2">
          <Link href="/assets/aircraft">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet
          </Link>
        </Button>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <p className="text-muted-foreground">{aircraft.make} {aircraft.model}</p>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-[10px] uppercase font-black text-muted-foreground">Hobbs</p>
              <p className="text-2xl font-mono font-bold text-primary">{aircraft.currentHobbs?.toFixed(1) || '0.0'}</p>
            </div>
            <div className="text-right border-l pl-4">
              <p className="text-[10px] uppercase font-black text-muted-foreground">Tacho</p>
              <p className="text-2xl font-mono font-bold text-primary">{aircraft.currentTacho?.toFixed(1) || '0.0'}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-1 shrink-0">
          <TabsList className="bg-transparent h-auto p-0 gap-2 mb-4 border-b-0 justify-start">
            <TabsTrigger value="details" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Details</TabsTrigger>
            <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Maintenance Logs</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Technical Documents</TabsTrigger>
            <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Component Tracker</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden px-1">
          <TabsContent value="details" className="m-0 h-full">
            <ScrollArea className="h-full pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
                <Card className="shadow-none border">
                  <CardHeader><CardTitle className="text-sm uppercase font-black tracking-widest text-primary">Specifications</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between border-b pb-2"><span>Type</span><span className="font-bold">{aircraft.type || 'Single-Engine'}</span></div>
                    <div className="flex justify-between border-b pb-2"><span>Airframe Hours</span><span className="font-bold">{aircraft.frameHours || 0}h</span></div>
                    <div className="flex justify-between border-b pb-2"><span>Engine Hours</span><span className="font-bold">{aircraft.engineHours || 0}h</span></div>
                  </CardContent>
                </Card>
                <Card className="shadow-none border">
                  <CardHeader><CardTitle className="text-sm uppercase font-black tracking-widest text-primary">Inspection Thresholds</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between border-b pb-2"><span>Next 50hr</span><span className="font-bold">{aircraft.tachoAtNext50Inspection?.toFixed(1) || 'N/A'}</span></div>
                    <div className="flex justify-between border-b pb-2"><span>Next 100hr</span><span className="font-bold">{aircraft.tachoAtNext100Inspection?.toFixed(1) || 'N/A'}</span></div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="maintenance" className="m-0 h-full">
            <Card className="h-full flex flex-col overflow-hidden shadow-none border">
              <CardHeader className="flex flex-row items-center justify-between bg-muted/5 shrink-0 border-b">
                <div>
                  <CardTitle>Maintenance History</CardTitle>
                  <CardDescription>All recorded procedural work and inspections.</CardDescription>
                </div>
                <Button size="sm" disabled><PlusCircle className="mr-2 h-4 w-4" /> Add Log</Button>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="text-[10px] uppercase font-bold">Date</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold">Type</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold">Details</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold">Engineer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs && logs.length > 0 ? logs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                          <TableCell><Badge variant="outline">{log.maintenanceType}</Badge></TableCell>
                          <TableCell className="max-w-md truncate">{log.details}</TableCell>
                          <TableCell>{log.ameNo || 'N/A'}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={4} className="text-center py-10 opacity-50 italic">No logs recorded.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="m-0 h-full">
            <Card className="h-full flex flex-col overflow-hidden shadow-none border">
              <CardHeader className="flex flex-row items-center justify-between bg-muted/5 shrink-0 border-b">
                <div>
                  <CardTitle>Technical Documents</CardTitle>
                  <CardDescription>Certificates, manuals, and insurance records.</CardDescription>
                </div>
                <DocumentUploader onDocumentUploaded={onDocumentUploaded} trigger={(open) => (
                  <Button size="sm" onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>
                )} />
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="text-[10px] uppercase font-bold">Name</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold">Uploaded</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aircraft.documents && aircraft.documents.length > 0 ? aircraft.documents.map((doc, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-semibold">{doc.name}</TableCell>
                          <TableCell>{format(new Date(doc.uploadDate), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild><a href={doc.url} target="_blank">View</a></Button>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={3} className="text-center py-10 opacity-50 italic">No documents uploaded.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="components" className="m-0 h-full">
            <Card className="h-full flex flex-col overflow-hidden shadow-none border">
              <CardHeader className="flex flex-row items-center justify-between bg-muted/5 shrink-0 border-b">
                <div>
                  <CardTitle>Component Lifecycle Tracker</CardTitle>
                  <CardDescription>Serialized components and their time limits.</CardDescription>
                </div>
                <Dialog open={isAddComponentOpen} onOpenChange={setIsAddComponentOpen}>
                  <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Serialized Component</DialogTitle><DialogDescription>Track hours since new and lifecycle limits.</DialogDescription></DialogHeader>
                    <Form {...addComponentForm}><form onSubmit={addComponentForm.handleSubmit(handleAddComponent)} className="space-y-4">
                      <FormField control={addComponentForm.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Engine #1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={addComponentForm.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={addComponentForm.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>TSN (Hours)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={addComponentForm.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Life Limit (Hours)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                      </div>
                      <DialogFooter><Button type="submit">Track Component</Button></DialogFooter>
                    </form></Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="text-[10px] uppercase font-bold">Component</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold">Serial No.</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-right">TSN</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-right">Limit</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-right">Remaining</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aircraft.components && aircraft.components.length > 0 ? aircraft.components.map(comp => {
                        const remaining = comp.maxHours - comp.totalTime;
                        return (
                          <TableRow key={comp.id}>
                            <TableCell className="font-bold">{comp.name}</TableCell>
                            <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                            <TableCell className="text-right font-mono">{comp.totalTime.toFixed(1)}</TableCell>
                            <TableCell className="text-right font-mono">{comp.maxHours.toFixed(1)}</TableCell>
                            <TableCell className="text-right font-mono font-bold text-primary">{remaining.toFixed(1)}</TableCell>
                          </TableRow>
                        )
                      }) : (
                        <TableRow><TableCell colSpan={5} className="text-center py-10 opacity-50 italic">No tracked components.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
