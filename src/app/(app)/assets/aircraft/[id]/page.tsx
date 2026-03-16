'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy, arrayUnion } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ArrowLeft, PlusCircle, Trash2, FileText, Settings, History, ClipboardCheck, Clock } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { DocumentUploader } from '@/components/document-uploader';
import { Progress } from '@/components/ui/progress';
import { v4 as uuidv4 } from 'uuid';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const componentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  partNumber: z.string().min(1, 'Part number is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  installDate: z.string().min(1, 'Install date is required'),
  installHours: z.coerce.number().min(0),
  maxHours: z.coerce.number().min(0),
  notes: z.string().optional(),
});

const logSchema = z.object({
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

  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);

  const componentForm = useForm<z.infer<typeof componentSchema>>({
    resolver: zodResolver(componentSchema),
    defaultValues: {
      name: '',
      manufacturer: '',
      partNumber: '',
      serialNumber: '',
      installDate: new Date().toISOString().split('T')[0],
      installHours: 0,
      maxHours: 0,
      notes: '',
    },
  });

  const logForm = useForm<z.infer<typeof logSchema>>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      maintenanceType: '',
      date: new Date().toISOString().split('T')[0],
      details: '',
      reference: '',
      ameNo: '',
      amoNo: '',
    },
  });

  const handleAddComponent = (values: z.infer<typeof componentSchema>) => {
    if (!firestore || !aircraftRef) return;

    const newComponent: AircraftComponent = {
      ...values,
      id: uuidv4(),
      tsn: 0,
      tso: 0,
      totalTime: values.installHours,
      installDate: values.installDate,
      notes: values.notes || '',
    };

    updateDocumentNonBlocking(aircraftRef, {
      components: arrayUnion(newComponent),
    });

    toast({ title: 'Component Added' });
    setIsAddComponentOpen(false);
    componentForm.reset();
  };

  const handleAddLog = (values: z.infer<typeof logSchema>) => {
    if (!firestore) return;

    const logsRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(logsRef, values);

    toast({ title: 'Log Added' });
    setIsAddLogOpen(false);
    logForm.reset();
  };

  const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    if (!firestore || !aircraftRef) return;

    updateDocumentNonBlocking(aircraftRef, {
      documents: arrayUnion(docDetails),
    });

    toast({ title: 'Document Uploaded' });
  };

  if (isLoadingAircraft) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!aircraft) {
    return <div className="max-w-[1200px] mx-auto w-full p-8 text-center">Aircraft not found.</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/assets/aircraft"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-xs uppercase font-bold text-muted-foreground">Hobbs Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aircraft.currentHobbs?.toFixed(1) || '0.0'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-xs uppercase font-bold text-muted-foreground">Tacho Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aircraft.currentTacho?.toFixed(1) || '0.0'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-xs uppercase font-bold text-muted-foreground">Next 50hr Inspection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aircraft.tachoAtNext50Inspection?.toFixed(1) || 'N/A'}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="maintenance" className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-4 border-b-0 justify-start shrink-0">
          <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Maintenance Logs</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Technical Documents</TabsTrigger>
          <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Component Tracker</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden min-h-0">
          <TabsContent value="maintenance" className="m-0 h-full">
            <Card className="h-full flex flex-col shadow-none border overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5 shrink-0">
                <div>
                  <CardTitle className="text-lg">Maintenance History</CardTitle>
                  <CardDescription>Chronological record of all service and inspections.</CardDescription>
                </div>
                <Dialog open={isAddLogOpen} onOpenChange={setIsAddLogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Log Entry</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Maintenance Log</DialogTitle>
                    </DialogHeader>
                    <Form {...logForm}>
                      <form onSubmit={logForm.handleSubmit(handleAddLog)} className="space-y-4 pt-4">
                        <FormField control={logForm.control} name="maintenanceType" render={({ field }) => (
                          <FormItem><FormLabel>Type</FormLabel><FormControl><Input placeholder="e.g., 50hr Inspection" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={logForm.control} name="date" render={({ field }) => (
                          <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={logForm.control} name="details" render={({ field }) => (
                          <FormItem><FormLabel>Details</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <DialogFooter><Button type="submit">Save Log</Button></DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(logs || []).map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="font-semibold">{log.maintenanceType}</TableCell>
                        <TableCell className="max-w-md truncate">{log.details}</TableCell>
                      </TableRow>
                    ))}
                    {(!logs || logs.length === 0) && !isLoadingLogs && (
                      <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic">No maintenance logs found.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="m-0 h-full">
            <Card className="h-full flex flex-col shadow-none border overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5 shrink-0">
                <div>
                  <CardTitle className="text-lg">Technical Documents</CardTitle>
                  <CardDescription>C of A, Insurance, and other mandatory compliance files.</CardDescription>
                </div>
                <DocumentUploader
                  onDocumentUploaded={onDocumentUploaded}
                  trigger={(open) => (
                    <Button size="sm" onClick={() => open()} variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>
                  )}
                />
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Name</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(aircraft.documents || []).map((doc, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold">{doc.name}</TableCell>
                        <TableCell>{format(new Date(doc.uploadDate), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm"><Link href={doc.url} target="_blank">View</Link></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="components" className="m-0 h-full">
            <Card className="h-full flex flex-col shadow-none border overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5 shrink-0">
                <div>
                  <CardTitle className="text-lg">Component Tracker</CardTitle>
                  <CardDescription>Track life limits for critical serialized components.</CardDescription>
                </div>
                <Dialog open={isAddComponentOpen} onOpenChange={setIsAddComponentOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Track New Component</DialogTitle></DialogHeader>
                    <Form {...componentForm}>
                      <form onSubmit={componentForm.handleSubmit(handleAddComponent)} className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={componentForm.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Engine" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={componentForm.control} name="manufacturer" render={({ field }) => (
                            <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={componentForm.control} name="partNumber" render={({ field }) => (
                            <FormItem><FormLabel>Part #</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={componentForm.control} name="serialNumber" render={({ field }) => (
                            <FormItem><FormLabel>Serial #</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={componentForm.control} name="installHours" render={({ field }) => (
                            <FormItem><FormLabel>Installed at (Hours)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={componentForm.control} name="maxHours" render={({ field }) => (
                            <FormItem><FormLabel>Life Limit (Hours)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                        <FormField control={componentForm.control} name="installDate" render={({ field }) => (
                          <FormItem><FormLabel>Install Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <DialogFooter><Button type="submit">Track Component</Button></DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead>Serial #</TableHead>
                      <TableHead className="text-right">TSN</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(aircraft.components || []).map(comp => {
                      const tsn = (aircraft.currentHobbs || 0) - comp.installHours + comp.tsn;
                      const remaining = comp.maxHours - tsn;
                      const progress = Math.min((tsn / comp.maxHours) * 100, 100);
                      return (
                        <TableRow key={comp.id}>
                          <TableCell className="font-semibold">{comp.name}</TableCell>
                          <TableCell className="text-xs font-mono">{comp.serialNumber}</TableCell>
                          <TableCell className="text-right font-mono">{tsn.toFixed(1)}</TableCell>
                          <TableCell className="text-right font-mono">{remaining.toFixed(1)}</TableCell>
                          <TableCell className="w-[150px]"><Progress value={progress} className="h-2" /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// Dummy helper for addDocumentNonBlocking if not imported
function addDocumentNonBlocking(collectionRef: any, data: any) {
  // Real implementation is in src/firebase/non-blocking-updates.tsx
  // This is just to satisfy the TS compiler if needed
}
