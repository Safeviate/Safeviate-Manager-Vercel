
'use client';

import { use, useMemo, useState, useEffect } from 'react';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Pencil, PlusCircle, Wrench, Settings2, Clock, FileText, Trash2, CalendarIcon, Upload, Camera } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import { DocumentUploader } from '@/components/document-uploader';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const maintenanceFormSchema = z.object({
    maintenanceType: z.string().min(1, 'Type is required'),
    details: z.string().min(1, 'Details are required'),
    ameNo: z.string().min(1, 'Engineer license number is required'),
    amoNo: z.string().min(1, 'AMO number is required'),
    reference: z.string().min(1, 'Reference is required'),
    date: z.date(),
});

type MaintenanceFormValues = z.infer<typeof maintenanceFormSchema>;

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(
        collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`),
        orderBy('date', 'desc')
    ) : null),
    [firestore, tenantId, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);

  const [isEditHoursOpen, setIsEditHoursOpen] = useState(false);
  const [isEditServiceOpen, setIsEditServiceOpen] = useState(false);
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);

  const maintenanceForm = useForm<MaintenanceFormValues>({
      resolver: zodResolver(maintenanceFormSchema),
      defaultValues: {
          maintenanceType: '',
          details: '',
          ameNo: '',
          amoNo: '',
          reference: '',
          date: new Date(),
      }
  });

  const handleUpdateFlightHours = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !aircraftRef) return;
    const formData = new FormData(e.currentTarget);
    const updates = {
        currentHobbs: parseFloat(formData.get('hobbs') as string) || 0,
        currentTacho: parseFloat(formData.get('tacho') as string) || 0,
    };
    updateDocumentNonBlocking(aircraftRef, updates);
    toast({ title: 'Flight Hours Updated' });
    setIsEditHoursOpen(false);
  };

  const handleUpdateServiceTargets = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !aircraftRef) return;
    const formData = new FormData(e.currentTarget);
    const updates = {
        tachoAtNext50Inspection: parseFloat(formData.get('next50') as string) || 0,
        tachoAtNext100Inspection: parseFloat(formData.get('next100') as string) || 0,
    };
    updateDocumentNonBlocking(aircraftRef, updates);
    toast({ title: 'Service Targets Updated' });
    setIsEditServiceOpen(false);
  };

  const onAddMaintenanceLog = (values: MaintenanceFormValues) => {
      if (!firestore) return;
      const logsCol = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
      const newLog = {
          ...values,
          aircraftId,
          date: values.date.toISOString(),
      };
      addDocumentNonBlocking(logsCol, newLog);
      toast({ title: 'Maintenance Entry Recorded', description: 'Log has been certified and saved.' });
      maintenanceForm.reset();
      setIsAddLogOpen(false);
  };

  const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    if (!firestore || !aircraftRef) return;
    const currentDocs = aircraft?.documents || [];
    const updatedDocs = [...currentDocs, docDetails];
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocs });
    toast({ title: 'Document Added' });
  };

  if (isLoadingAircraft) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-48" />
            <div className='flex gap-2'><Skeleton className="h-10 w-32" /><Skeleton className="h-10 w-32" /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!aircraft) return <div className="text-center py-12">Aircraft not found.</div>;

  const next50Remaining = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const next100Remaining = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className='flex items-center gap-4'>
            <Button asChild variant="outline" size="icon" className='h-8 w-8 rounded-full'>
                <Link href="/assets/aircraft"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
                <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isEditHoursOpen} onOpenChange={setIsEditHoursOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Clock className="mr-2 h-4 w-4" /> Edit Flight Hours
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Meter Readings</DialogTitle>
                <DialogDescription>Manually override current Hobbs and Tachometer values.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateFlightHours}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="hobbs" className="text-right">Hobbs</Label>
                    <Input id="hobbs" name="hobbs" type="number" step="0.1" defaultValue={aircraft.currentHobbs} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="tacho" className="text-right">Tacho</Label>
                    <Input id="tacho" name="tacho" type="number" step="0.1" defaultValue={aircraft.currentTacho} className="col-span-3" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Save Readings</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditServiceOpen} onOpenChange={setIsEditServiceOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="mr-2 h-4 w-4" /> Edit Service
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Service Targets</DialogTitle>
                <DialogDescription>Set next Tachometer readings for inspection intervals.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateServiceTargets}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="next50" className="text-right whitespace-nowrap">Next 50hr</Label>
                    <Input id="next50" name="next50" type="number" step="0.1" defaultValue={aircraft.tachoAtNext50Inspection} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="next100" className="text-right whitespace-nowrap">Next 100hr</Label>
                    <Input id="next100" name="next100" type="number" step="0.1" defaultValue={aircraft.tachoAtNext100Inspection} className="col-span-3" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Update Targets</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Current Hobbs</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{aircraft.currentHobbs?.toFixed(1) || '0.0'}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Current Tacho</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{aircraft.currentTacho?.toFixed(1) || '0.0'}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Next 50hr Inspection</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aircraft.tachoAtNext50Inspection?.toFixed(1) || 'N/A'}</div>
            <p className={cn("text-xs mt-1 font-semibold", next50Remaining < 5 ? "text-destructive" : "text-muted-foreground")}>
                {next50Remaining.toFixed(1)}h remaining
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Next 100hr Inspection</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aircraft.tachoAtNext100Inspection?.toFixed(1) || 'N/A'}</div>
            <p className={cn("text-xs mt-1 font-semibold", next100Remaining < 10 ? "text-destructive" : "text-muted-foreground")}>
                {next100Remaining.toFixed(1)}h remaining
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="components" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0">
          <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Tracked Components</TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Maintenance History</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Documents</TabsTrigger>
        </TabsList>

        <div className='border rounded-xl bg-card shadow-sm overflow-hidden'>
            <TabsContent value="components" className="m-0">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-semibold">Technical Components</h3>
                        <p className="text-sm text-muted-foreground">Manage life-limited parts and equipment tracking.</p>
                    </div>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
                </div>
                <Table>
                    <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableHead>Component Name</TableHead>
                        <TableHead>Part Number</TableHead>
                        <TableHead>Serial Number</TableHead>
                        <TableHead className="text-right">TSN</TableHead>
                        <TableHead className="text-right">Limit</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {(components || []).length > 0 ? components?.map((comp) => {
                        const remaining = (comp.maxHours || 0) - (comp.tsn || 0);
                        return (
                        <TableRow key={comp.id}>
                            <TableCell className="font-semibold">{comp.name}</TableCell>
                            <TableCell>{comp.partNumber}</TableCell>
                            <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                            <TableCell className="text-right">{(comp.tsn || 0).toFixed(1)}h</TableCell>
                            <TableCell className="text-right text-muted-foreground">{(comp.maxHours || 0).toFixed(1)}h</TableCell>
                            <TableCell className="text-right">
                            <Badge variant={remaining < 50 ? 'destructive' : 'secondary'} className="font-bold">
                                {remaining.toFixed(1)}h
                            </Badge>
                            </TableCell>
                            <TableCell className='text-right'>
                                <Button variant="ghost" size="icon" className='h-8 w-8'><Pencil className='h-4 w-4' /></Button>
                            </TableCell>
                        </TableRow>
                        )
                    }) : (
                        <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No components being tracked.</TableCell></TableRow>
                    )}
                    </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="maintenance" className="m-0">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-semibold">Maintenance Certification Logs</h3>
                        <p className="text-sm text-muted-foreground">Historical record of all certified maintenance actions.</p>
                    </div>
                    <Dialog open={isAddLogOpen} onOpenChange={setIsAddLogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Maintenance Entry</Button>
                        </DialogTrigger>
                        <DialogContent className='max-w-2xl'>
                            <DialogHeader>
                                <DialogTitle>New Maintenance Entry</DialogTitle>
                                <DialogDescription>Record and certify a maintenance action for this aircraft.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={maintenanceForm.handleSubmit(onAddMaintenanceLog)} className='space-y-4 pt-4'>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Maintenance Type</Label>
                                        <Input placeholder='e.g., 50hr Inspection' {...maintenanceForm.register('maintenanceType')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {format(maintenanceForm.watch('date'), 'PPP')}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <CustomCalendar selectedDate={maintenanceForm.watch('date')} onDateSelect={(d) => maintenanceForm.setValue('date', d)} />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Details of Work Performed</Label>
                                    <Textarea className='min-h-[120px]' placeholder='Describe the maintenance actions taken...' {...maintenanceForm.register('details')} />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>AME License No.</Label>
                                        <Input placeholder='License #' {...maintenanceForm.register('ameNo')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>AMO Number</Label>
                                        <Input placeholder='AMO #' {...maintenanceForm.register('amoNo')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Reference</Label>
                                        <Input placeholder='Log Ref' {...maintenanceForm.register('reference')} />
                                    </div>
                                </div>
                                <DialogFooter className='pt-4'>
                                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                    <Button type="submit">Certify & Save</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
                <Table>
                    <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className='w-[30%]'>Details</TableHead>
                        <TableHead>AME No.</TableHead>
                        <TableHead>AMO No.</TableHead>
                        <TableHead>Reference</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {(logs || []).length > 0 ? logs?.map((log) => (
                        <TableRow key={log.id}>
                            <TableCell className="whitespace-nowrap">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                            <TableCell className="font-semibold">{log.maintenanceType}</TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-pre-wrap">{log.details}</TableCell>
                            <TableCell className='font-mono text-xs'>{log.ameNo}</TableCell>
                            <TableCell className='font-mono text-xs'>{log.amoNo}</TableCell>
                            <TableCell className='font-mono text-xs'>{log.reference}</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No maintenance history recorded.</TableCell></TableRow>
                    )}
                    </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="m-0">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-semibold">Aircraft Documentation</h3>
                        <p className="text-sm text-muted-foreground">C of A, Registration, and other mandatory certificates.</p>
                    </div>
                    <DocumentUploader 
                        trigger={(open) => <Button size="sm" onClick={() => open()}><Upload className="mr-2 h-4 w-4" /> Upload Document</Button>}
                        onDocumentUploaded={onDocumentUploaded}
                    />
                </div>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableHead>Document Name</TableHead>
                            <TableHead>Upload Date</TableHead>
                            <TableHead>Expiry Date</TableHead>
                            <TableHead className='text-right'>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(aircraft.documents || []).length > 0 ? aircraft.documents?.map((doc, idx) => (
                            <TableRow key={idx}>
                                <TableCell className="font-semibold">{doc.name}</TableCell>
                                <TableCell className="text-muted-foreground">{format(new Date(doc.uploadDate), 'PPP')}</TableCell>
                                <TableCell>
                                    <div className='flex items-center gap-2'>
                                        {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'No Expiry'}
                                    </div>
                                </TableCell>
                                <TableCell className='text-right'>
                                    <div className="flex gap-2 justify-end">
                                        <Button variant="ghost" size="icon" className='h-8 w-8' asChild><a href={doc.url} target="_blank" rel="noreferrer"><FileText className='h-4 w-4' /></a></Button>
                                        <Button variant="ghost" size="icon" className='h-8 w-8 text-destructive'><Trash2 className='h-4 w-4' /></Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No documents uploaded.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
              </div>
            </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
