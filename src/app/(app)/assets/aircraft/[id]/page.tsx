
'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Pencil, Plus, Trash2, Settings2, History, Wrench, CalendarIcon, FileText } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';

// --- Form Schemas ---

const hoursFormSchema = z.object({
  currentHobbs: z.coerce.number().min(0),
  currentTacho: z.coerce.number().min(0),
});

const serviceTargetsSchema = z.object({
  tachoAtNext50Inspection: z.coerce.number().min(0),
  tachoAtNext100Inspection: z.coerce.number().min(0),
});

const componentFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  serialNumber: z.string().min(1, 'S/N is required'),
  partNumber: z.string().min(1, 'P/N is required'),
  tsn: z.coerce.number().min(0),
  maxHours: z.coerce.number().min(0),
});

const maintenanceFormSchema = z.object({
  maintenanceType: z.string().min(1, 'Type is required'),
  details: z.string().min(1, 'Details are required'),
  ameNo: z.string().min(1, 'AME License No is required'),
  amoNo: z.string().min(1, 'AMO No is required'),
  reference: z.string().min(1, 'Reference is required'),
  date: z.string(),
});

// --- UI Components ---

function StatCard({ title, value, unit, status = 'ok' }: { title: string; value: string; unit: string; status?: 'ok' | 'warning' }) {
  return (
    <Card className={cn(status === 'warning' && 'border-orange-200 bg-orange-50')}>
      <CardHeader className="p-4 pb-0">
        <CardDescription className="text-[10px] font-bold uppercase tracking-wider">{title}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-1">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{value}</span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Page ---

export default function AircraftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const [isHoursDialogOpen, setIsHoursDialogOpen] = useState(false);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isComponentDialogOpen, setIsComponentDialogOpen] = useState(false);
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components')) : null),
    [firestore, tenantId, aircraftId]
  );

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'maintenanceLogs'), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: loadingAc } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: loadingComp } = useCollection<AircraftComponent>(componentsQuery);
  const { data: logs, isLoading: loadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  const hoursForm = useForm<z.infer<typeof hoursFormSchema>>({
    resolver: zodResolver(hoursFormSchema),
    defaultValues: { currentHobbs: aircraft?.currentHobbs || 0, currentTacho: aircraft?.currentTacho || 0 },
  });

  const serviceForm = useForm<z.infer<typeof serviceTargetsSchema>>({
    resolver: zodResolver(serviceTargetsSchema),
    defaultValues: { 
      tachoAtNext50Inspection: aircraft?.tachoAtNext50Inspection || 0, 
      tachoAtNext100Inspection: aircraft?.tachoAtNext100Inspection || 0 
    },
  });

  const componentForm = useForm<z.infer<typeof componentFormSchema>>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: { name: '', serialNumber: '', partNumber: '', tsn: 0, maxHours: 0 },
  });

  const maintenanceForm = useForm<z.infer<typeof maintenanceFormSchema>>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: { 
      maintenanceType: '', 
      details: '', 
      ameNo: '', 
      amoNo: '', 
      reference: '', 
      date: new Date().toISOString() 
    },
  });

  const onUpdateHours = (values: z.infer<typeof hoursFormSchema>) => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, values);
    toast({ title: 'Hours Updated', description: 'Aircraft flight hours have been overridden.' });
    setIsHoursDialogOpen(false);
  };

  const onUpdateService = (values: z.infer<typeof serviceTargetsSchema>) => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, values);
    toast({ title: 'Service Targets Updated', description: 'Inspection targets have been updated.' });
    setIsServiceDialogOpen(false);
  };

  const onSaveComponent = (values: z.infer<typeof componentFormSchema>) => {
    if (!firestore) return;
    const colRef = collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components');
    if (editingComponent) {
      const docRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components', editingComponent.id);
      updateDocumentNonBlocking(docRef, values);
      toast({ title: 'Component Updated' });
    } else {
      addDocumentNonBlocking(colRef, { ...values, installDate: new Date().toISOString() });
      toast({ title: 'Component Added' });
    }
    setIsComponentDialogOpen(false);
    setEditingComponent(null);
    componentForm.reset();
  };

  const onAddLog = (values: z.infer<typeof maintenanceFormSchema>) => {
    if (!firestore) return;
    const colRef = collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'maintenanceLogs');
    addDocumentNonBlocking(colRef, values);
    toast({ title: 'Maintenance Log Recorded', description: 'Certification successfully saved to history.' });
    setIsMaintenanceDialogOpen(false);
    maintenanceForm.reset();
  };

  const handleDeleteComp = (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components', id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Component Removed' });
  };

  if (loadingAc) return <div className="p-8 text-center"><Skeleton className="h-96 w-full" /></div>;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  const rem50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const rem100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-8">
            <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none font-bold">HEALTHY</Badge>
          </div>
          <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsServiceDialogOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" /> Edit Service
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsHoursDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit Flight Hours
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1) || '0.0'} unit="hours" />
        <StatCard title="Current Tacho" value={aircraft.currentTacho?.toFixed(1) || '0.0'} unit="hours" />
        <StatCard title="Next 50h Due" value={rem50.toFixed(1)} unit="remaining" status={rem50 < 10 ? 'warning' : 'ok'} />
        <StatCard title="Next 100h Due" value={rem100.toFixed(1)} unit="remaining" status={rem100 < 10 ? 'warning' : 'ok'} />
      </div>

      <Card className="rounded-xl overflow-hidden border">
        <Tabs defaultValue="components" className="w-full">
          <div className="bg-muted/30 border-b px-4">
            <TabsList className="bg-transparent h-12 p-0 gap-4">
              <TabsTrigger 
                value="components" 
                className="rounded-t-lg rounded-b-none data-[state=active]:bg-background data-[state=active]:shadow-none border-x border-t border-transparent data-[state=active]:border-border h-full px-6 font-semibold"
              >
                Tracked Components
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="rounded-t-lg rounded-b-none data-[state=active]:bg-background data-[state=active]:shadow-none border-x border-t border-transparent data-[state=active]:border-border h-full px-6 font-semibold"
              >
                Maintenance History
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="components" className="m-0 border-none">
            <CardContent className="p-0">
              <div className="p-4 border-b bg-background flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Life-Limited Components</h3>
                <Button size="sm" onClick={() => { setEditingComponent(null); componentForm.reset(); setIsComponentDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" /> Add Component
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead>Component Name</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead className="text-right">TSN</TableHead>
                    <TableHead className="text-right">Limit</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components?.map((comp) => {
                    const remaining = (comp.maxHours || 0) - (comp.tsn || 0);
                    return (
                      <TableRow key={comp.id}>
                        <TableCell className="font-semibold">{comp.name}</TableCell>
                        <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                        <TableCell className="text-right font-mono">{comp.tsn?.toFixed(1) || '0.0'}h</TableCell>
                        <TableCell className="text-right text-muted-foreground font-mono">{comp.maxHours?.toFixed(1) || '0.0'}h</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={remaining < 50 ? 'destructive' : 'secondary'} className="font-bold">
                            {remaining.toFixed(1)}h
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingComponent(comp); componentForm.reset(comp); setIsComponentDialogOpen(true); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteComp(comp.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!components || components.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        No life-limited components tracked.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </TabsContent>

          <TabsContent value="history" className="m-0 border-none">
            <CardContent className="p-0">
              <div className="p-4 border-b bg-background flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Maintenance Logbook</h3>
                <Button size="sm" onClick={() => setIsMaintenanceDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Maintenance Log
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead>Date</TableHead>
                    <TableHead>Maintenance Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>AME / AMO</TableHead>
                    <TableHead className="text-right">Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap font-medium">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell><Badge variant="outline">{log.maintenanceType}</Badge></TableCell>
                      <TableCell className="max-w-md truncate text-muted-foreground text-xs">{log.details}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold">{log.ameNo}</div>
                        <div className="text-[10px] text-muted-foreground">AMO: {log.amoNo}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{log.reference}</TableCell>
                    </TableRow>
                  ))}
                  {(!logs || logs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        No maintenance history records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>

      {/* --- Dialogs --- */}

      <Dialog open={isHoursDialogOpen} onOpenChange={setIsHoursDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Flight Hours</DialogTitle>
            <DialogDescription>Manually override the current aircraft meter readings.</DialogDescription>
          </DialogHeader>
          <Form {...hoursForm}>
            <form onSubmit={hoursForm.handleSubmit(onUpdateHours)} className="space-y-4">
              <FormField control={hoursForm.control} name="currentHobbs" render={({ field }) => (
                <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={hoursForm.control} name="currentTacho" render={({ field }) => (
                <FormItem><FormLabel>Current Tachometer</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>
              )} />
              <DialogFooter><Button type="submit">Save Changes</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service Targets</DialogTitle>
            <DialogDescription>Set the tachometer targets for the next scheduled inspections.</DialogDescription>
          </DialogHeader>
          <Form {...serviceForm}>
            <form onSubmit={serviceForm.handleSubmit(onUpdateService)} className="space-y-4">
              <FormField control={serviceForm.control} name="tachoAtNext50Inspection" render={({ field }) => (
                <FormItem><FormLabel>Next 50 Hour Due (Tacho)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={serviceForm.control} name="tachoAtNext100Inspection" render={({ field }) => (
                <FormItem><FormLabel>Next 100 Hour Due (Tacho)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>
              )} />
              <DialogFooter><Button type="submit">Save Targets</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isComponentDialogOpen} onOpenChange={setIsComponentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingComponent ? 'Edit Component' : 'Add New Component'}</DialogTitle>
          </DialogHeader>
          <Form {...componentForm}>
            <form onSubmit={componentForm.handleSubmit(onSaveComponent)} className="space-y-4">
              <FormField control={componentForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Magneto (Left)" {...field} /></FormControl></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={componentForm.control} name="serialNumber" render={({ field }) => (
                  <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={componentForm.control} name="partNumber" render={({ field }) => (
                  <FormItem><FormLabel>Part Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={componentForm.control} name="tsn" render={({ field }) => (
                  <FormItem><FormLabel>Time Since New (h)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={componentForm.control} name="maxHours" render={({ field }) => (
                  <FormItem><FormLabel>Service Life Limit (h)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <DialogFooter><Button type="submit">Save Component</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Maintenance Entry</DialogTitle>
            <DialogDescription>Record and certify maintenance work performed on this aircraft.</DialogDescription>
          </DialogHeader>
          <Form {...maintenanceForm}>
            <form onSubmit={maintenanceForm.handleSubmit(onAddLog)} className="space-y-4">
              <FormField control={maintenanceForm.control} name="maintenanceType" render={({ field }) => (
                <FormItem><FormLabel>Maintenance Type</FormLabel><FormControl><Input placeholder="e.g., 50hr Inspection, Battery Replacement" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={maintenanceForm.control} name="details" render={({ field }) => (
                <FormItem>
                  <FormLabel>Work Details</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Comprehensive description of work performed..." 
                      className="min-h-[120px]" 
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={maintenanceForm.control} name="ameNo" render={({ field }) => (
                  <FormItem><FormLabel>Engineer License No (AME)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={maintenanceForm.control} name="amoNo" render={({ field }) => (
                  <FormItem><FormLabel>AMO Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={maintenanceForm.control} name="reference" render={({ field }) => (
                <FormItem><FormLabel>Release Reference (CRS)</FormLabel><FormControl><Input placeholder="e.g., JOB-2024-001" {...field} /></FormControl></FormItem>
              )} />
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white border-none font-bold">Certify & Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
