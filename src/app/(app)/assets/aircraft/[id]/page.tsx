'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy, arrayUnion } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, FileText, History, Settings2, Trash2, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DocumentUploader } from '../../../../users/personnel/[id]/document-uploader';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';

const componentFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  serialNumber: z.string().min(1, 'Serial is required'),
  tsn: z.number({ coerce: true }).min(0),
  maxHours: z.number({ coerce: true }).min(0),
});

const maintenanceFormSchema = z.object({
  maintenanceType: z.string().min(1, 'Type is required'),
  date: z.string().min(1, 'Date is required'),
  details: z.string().min(1, 'Details required'),
});

export default function AircraftDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: aircraft, isLoading: loadingAc } = useDoc<Aircraft>(aircraftRef);
  const { data: logs, isLoading: loadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [isCompDialogOpen, setIsCompDialogOpen] = useState(false);

  const logForm = useForm<z.infer<typeof maintenanceFormSchema>>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: { maintenanceType: '', date: format(new Date(), 'yyyy-MM-dd'), details: '' }
  });

  const compForm = useForm<z.infer<typeof componentFormSchema>>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: { name: '', serialNumber: '', tsn: 0, maxHours: 0 }
  });

  const handleAddLog = (values: z.infer<typeof maintenanceFormSchema>) => {
    if (!firestore) return;
    const colRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(colRef, { ...values, aircraftId });
    toast({ title: 'Maintenance Log Recorded' });
    setIsLogDialogOpen(false);
    logForm.reset();
  };

  const handleAddComponent = (values: z.infer<typeof componentFormSchema>) => {
    if (!firestore || !aircraftRef) return;
    const newComponent: AircraftComponent = {
      ...values,
      id: Math.random().toString(36).substr(2, 9),
      manufacturer: '',
      partNumber: '',
      installDate: new Date().toISOString(),
      installHours: aircraft?.currentHobbs || 0,
      notes: '',
      tso: 0,
      totalTime: values.tsn,
    };
    updateDocumentNonBlocking(aircraftRef, {
      components: arrayUnion(newComponent)
    });
    toast({ title: 'Component Added' });
    setIsCompDialogOpen(false);
    compForm.reset();
  };

  const onDocumentUploaded = (docDetails: any) => {
    if (!firestore || !aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, {
      documents: arrayUnion(docDetails)
    });
    toast({ title: 'Document Added' });
  };

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
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <div className="flex items-center gap-4 px-1">
        <Button asChild variant="outline" size="icon">
          <Link href="/assets/aircraft"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
          <p className="text-muted-foreground">{aircraft.make} {aircraft.model}</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <div className="px-1 shrink-0">
          <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start">
            <TabsTrigger value="overview" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Overview</TabsTrigger>
            <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Maintenance Logs</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Technical Documents</TabsTrigger>
            <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Component Tracker</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden px-1">
          {/* OVERVIEW */}
          <TabsContent value="overview" className="m-0 h-full">
            <Card className="h-full shadow-none border">
              <CardHeader><CardTitle>Technical Summary</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-muted/30 p-4">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Current Hobbs</p>
                  <p className="text-2xl font-bold font-mono">{aircraft.currentHobbs?.toFixed(1) || '0.0'}</p>
                </Card>
                <Card className="bg-muted/30 p-4">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Current Tacho</p>
                  <p className="text-2xl font-bold font-mono">{aircraft.currentTacho?.toFixed(1) || '0.0'}</p>
                </Card>
                <Card className="bg-muted/30 p-4">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Airframe</p>
                  <p className="text-2xl font-bold font-mono">{aircraft.frameHours?.toFixed(1) || '0.0'}</p>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MAINTENANCE */}
          <TabsContent value="maintenance" className="m-0 h-full flex flex-col">
            <Card className="flex-1 flex flex-col shadow-none border overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between bg-muted/5 border-b shrink-0">
                <CardTitle>Maintenance Logs</CardTitle>
                <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
                  <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Log</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>New Maintenance Entry</DialogTitle></DialogHeader>
                    <form onSubmit={logForm.handleSubmit(handleAddLog)} className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Type</Label><Input placeholder="e.g., 50-Hour" {...logForm.register('maintenanceType')} /></div>
                        <div className="space-y-2"><Label>Date</Label><Input type="date" {...logForm.register('date')} /></div>
                      </div>
                      <div className="space-y-2"><Label>Details</Label><Textarea placeholder="Work performed..." {...logForm.register('details')} /></div>
                      <DialogFooter><Button type="submit">Save Log</Button></DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <ScrollArea className="flex-1">
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {logs?.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap font-mono">{log.date}</TableCell>
                        <TableCell><Badge variant="outline">{log.maintenanceType}</Badge></TableCell>
                        <TableCell className="text-xs">{log.details}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* DOCUMENTS */}
          <TabsContent value="documents" className="m-0 h-full flex flex-col">
            <Card className="flex-1 flex flex-col shadow-none border overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between bg-muted/5 border-b shrink-0">
                <CardTitle>Technical Documents</CardTitle>
                <DocumentUploader onDocumentUploaded={onDocumentUploaded} trigger={(open) => (
                  <Button size="sm" variant="outline" onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>
                )} />
              </CardHeader>
              <ScrollArea className="flex-1">
                <Table>
                  <TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Uploaded</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {aircraft.documents?.map((doc, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell className="text-xs">{format(new Date(doc.uploadDate), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-right"><Button variant="ghost" size="sm" asChild><Link href={doc.url} target="_blank">View</Link></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* COMPONENTS */}
          <TabsContent value="components" className="m-0 h-full flex flex-col">
            <Card className="flex-1 flex flex-col shadow-none border overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between bg-muted/5 border-b shrink-0">
                <CardTitle>Component Tracker</CardTitle>
                <Dialog open={isCompDialogOpen} onOpenChange={setIsCompDialogOpen}>
                  <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Track New Component</DialogTitle></DialogHeader>
                    <form onSubmit={compForm.handleSubmit(handleAddComponent)} className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Name</Label><Input placeholder="e.g., Engine #1" {...compForm.register('name')} /></div>
                        <div className="space-y-2"><Label>Serial No.</Label><Input placeholder="S/N..." {...compForm.register('serialNumber')} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Current TSN</Label><Input type="number" step="0.1" {...compForm.register('tsn')} /></div>
                        <div className="space-y-2"><Label>Life Limit (Hrs)</Label><Input type="number" step="0.1" {...compForm.register('maxHours')} /></div>
                      </div>
                      <DialogFooter><Button type="submit">Track Component</Button></DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <ScrollArea className="flex-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead>Serial</TableHead>
                      <TableHead className="text-right">TSN</TableHead>
                      <TableHead className="text-right">Limit</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aircraft.components?.map(comp => {
                      const remaining = comp.maxHours - comp.tsn;
                      return (
                        <TableRow key={comp.id}>
                          <TableCell className="font-medium">{comp.name}</TableCell>
                          <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                          <TableCell className="text-right font-mono">{comp.tsn.toFixed(1)}</TableCell>
                          <TableCell className="text-right font-mono">{comp.maxHours.toFixed(1)}</TableCell>
                          <TableCell className={cn("text-right font-bold font-mono", remaining < 50 ? "text-red-600" : "text-green-600")}>
                            {remaining.toFixed(1)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
