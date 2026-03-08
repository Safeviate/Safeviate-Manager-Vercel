
'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ArrowLeft, Clock, Settings2, PlusCircle, Pencil, History, Wrench } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
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

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components'), orderBy('name', 'asc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'maintenanceLogs'), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  const [isHoursDialogOpen, setIsHoursDialogOpen] = useState(false);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [isComponentDialogOpen, setIsComponentDialogOpen] = useState(false);

  // Form states
  const [hoursForm, setHoursForm] = useState({ hobbs: 0, tacho: 0 });
  const [serviceForm, setServiceForm] = useState({ next50: 0, next100: 0 });
  const [logForm, setLogForm] = useState({ type: '', details: '', ameNo: '', amoNo: '', reference: '', date: format(new Date(), 'yyyy-MM-dd') });
  const [compForm, setCompForm] = useState({ name: '', partNumber: '', serialNumber: '', tsn: 0, maxHours: 0 });

  useEffect(() => {
    if (aircraft) {
      setHoursForm({ hobbs: aircraft.currentHobbs || 0, tacho: aircraft.currentTacho || 0 });
      setServiceForm({ next50: aircraft.tachoAtNext50Inspection || 0, next100: aircraft.tachoAtNext100Inspection || 0 });
    }
  }, [aircraft]);

  const handleUpdateHours = () => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, {
      currentHobbs: Number(hoursForm.hobbs),
      currentTacho: Number(hoursForm.tacho)
    });
    toast({ title: "Flight Hours Updated" });
    setIsHoursDialogOpen(false);
  };

  const handleUpdateService = () => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, {
      tachoAtNext50Inspection: Number(serviceForm.next50),
      tachoAtNext100Inspection: Number(serviceForm.next100)
    });
    toast({ title: "Service Targets Updated" });
    setIsServiceDialogOpen(false);
  };

  const handleAddLog = () => {
    if (!firestore) return;
    const logsCol = collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'maintenanceLogs');
    addDocumentNonBlocking(logsCol, {
      maintenanceType: logForm.type,
      details: logForm.details,
      ameNo: logForm.ameNo,
      amoNo: logForm.amoNo,
      reference: logForm.reference,
      date: new Date(logForm.date).toISOString()
    });
    toast({ title: "Maintenance Log Added" });
    setIsLogDialogOpen(false);
    setLogForm({ type: '', details: '', ameNo: '', amoNo: '', reference: '', date: format(new Date(), 'yyyy-MM-dd') });
  };

  const handleAddComponent = () => {
    if (!firestore) return;
    const compsCol = collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components');
    addDocumentNonBlocking(compsCol, {
      ...compForm,
      tsn: Number(compForm.tsn),
      maxHours: Number(compForm.maxHours)
    });
    toast({ title: "Component Added" });
    setIsComponentDialogOpen(false);
    setCompForm({ name: '', partNumber: '', serialNumber: '', tsn: 0, maxHours: 0 });
  };

  if (isLoadingAircraft) return <Skeleton className="h-screen w-full" />;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  const fiftyRemaining = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const hundredRemaining = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link href="/assets/aircraft" className="text-sm text-primary hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3 w-3" /> Back to Fleet
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none font-bold">HEALTHY</Badge>
          </div>
          <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={isHoursDialogOpen} onOpenChange={setIsHoursDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Clock className="mr-2 h-4 w-4" /> Edit Flight Hours</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit Current Flight Hours</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="hobbs" className="text-right">Hobbs</Label>
                  <Input id="hobbs" type="number" className="col-span-3" value={hoursForm.hobbs} onChange={e => setHoursForm({ ...hoursForm, hobbs: parseFloat(e.target.value) })} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tacho" className="text-right">Tacho</Label>
                  <Input id="tacho" type="number" className="col-span-3" value={hoursForm.tacho} onChange={e => setHoursForm({ ...hoursForm, tacho: parseFloat(e.target.value) })} />
                </div>
              </div>
              <DialogFooter><Button onClick={handleUpdateHours}>Save Changes</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Settings2 className="mr-2 h-4 w-4" /> Edit Service</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Set Maintenance Intervals</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="next50" className="text-right whitespace-nowrap text-xs">Next 50hr (Tacho)</Label>
                  <Input id="next50" type="number" className="col-span-3" value={serviceForm.next50} onChange={e => setServiceForm({ ...serviceForm, next50: parseFloat(e.target.value) })} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="next100" className="text-right whitespace-nowrap text-xs">Next 100hr (Tacho)</Label>
                  <Input id="next100" type="number" className="col-span-3" value={serviceForm.next100} onChange={e => setServiceForm({ ...serviceForm, next100: parseFloat(e.target.value) })} />
                </div>
              </div>
              <DialogFooter><Button onClick={handleUpdateService}>Save Intervals</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-muted/30">
          <CardHeader className="pb-2"><CardDescription>Current Hobbs</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">{aircraft.currentHobbs?.toFixed(1) || '0.0'}h</p></CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardHeader className="pb-2"><CardDescription>Current Tacho</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">{aircraft.currentTacho?.toFixed(1) || '0.0'}h</p></CardContent>
        </Card>
        <Card className={cn(fiftyRemaining < 10 ? "bg-red-50" : "bg-muted/30")}>
          <CardHeader className="pb-2"><CardDescription>Next 50hr In</CardDescription></CardHeader>
          <CardContent><p className={cn("text-2xl font-bold", fiftyRemaining < 10 && "text-destructive")}>{fiftyRemaining.toFixed(1)}h</p></CardContent>
        </Card>
        <Card className={cn(hundredRemaining < 10 ? "bg-red-50" : "bg-muted/30")}>
          <CardHeader className="pb-2"><CardDescription>Next 100hr In</CardDescription></CardHeader>
          <CardContent><p className={cn("text-2xl font-bold", hundredRemaining < 10 && "text-destructive")}>{hundredRemaining.toFixed(1)}h</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="components" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-4">
          <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Wrench className="mr-2 h-4 w-4" /> Tracked Components
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-full px-6 py-2 border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="mr-2 h-4 w-4" /> Maintenance History
          </TabsTrigger>
        </TabsList>

        <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <TabsContent value="components" className="m-0">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Life Limited Components</h3>
                <Dialog open={isComponentDialogOpen} onOpenChange={setIsComponentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Register New Component</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid gap-2"><Label>Component Name</Label><Input value={compForm.name} onChange={e => setCompForm({ ...compForm, name: e.target.value })} /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2"><Label>Part Number</Label><Input value={compForm.partNumber} onChange={e => setCompForm({ ...compForm, partNumber: e.target.value })} /></div>
                        <div className="grid gap-2"><Label>Serial Number</Label><Input value={compForm.serialNumber} onChange={e => setCompForm({ ...compForm, serialNumber: e.target.value })} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2"><Label>Hours Since New</Label><Input type="number" value={compForm.tsn} onChange={e => setCompForm({ ...compForm, tsn: parseFloat(e.target.value) })} /></div>
                        <div className="grid gap-2"><Label>Max Hours (TBO)</Label><Input type="number" value={compForm.maxHours} onChange={e => setCompForm({ ...compForm, maxHours: parseFloat(e.target.value) })} /></div>
                      </div>
                    </div>
                    <DialogFooter><Button onClick={handleAddComponent}>Add to Aircraft</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead>Name</TableHead>
                    <TableHead>Part No.</TableHead>
                    <TableHead>Serial No.</TableHead>
                    <TableHead className="text-right">TSN</TableHead>
                    <TableHead className="text-right">TBO</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components?.map(comp => {
                    const remaining = (comp.maxHours || 0) - (comp.tsn || 0);
                    return (
                      <TableRow key={comp.id}>
                        <TableCell className="font-semibold">{comp.name}</TableCell>
                        <TableCell className="text-xs">{comp.partNumber}</TableCell>
                        <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                        <TableCell className="text-right">{comp.tsn?.toFixed(1) || '0.0'}h</TableCell>
                        <TableCell className="text-right text-muted-foreground">{comp.maxHours?.toFixed(1) || '0.0'}h</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={remaining < 50 ? 'destructive' : 'secondary'} className="font-bold">
                            {remaining.toFixed(1)}h
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-3 w-3" /></Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {(!components || components.length === 0) && (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No components being tracked.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="history" className="m-0">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Maintenance History & Certification</h3>
                <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Maintenance Entry</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>New Maintenance Entry</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2"><Label>Date</Label><Input type="date" value={logForm.date} onChange={e => setLogForm({ ...logForm, date: e.target.value })} /></div>
                        <div className="grid gap-2"><Label>Maintenance Type</Label><Input placeholder="e.g. 50hr Inspection" value={logForm.type} onChange={e => setLogForm({ ...logForm, type: e.target.value })} /></div>
                      </div>
                      <div className="grid gap-2"><Label>Work Details</Label><Textarea className="min-h-[120px]" placeholder="Provide a thorough description of the work performed..." value={logForm.details} onChange={e => setLogForm({ ...logForm, details: e.target.value })} /></div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2"><Label>Engineer (AME No.)</Label><Input placeholder="Lic #..." value={logForm.ameNo} onChange={e => setLogForm({ ...logForm, ameNo: e.target.value })} /></div>
                        <div className="grid gap-2"><Label>AMO Number</Label><Input placeholder="AMO #..." value={logForm.amoNo} onChange={e => setLogForm({ ...logForm, amoNo: e.target.value })} /></div>
                        <div className="grid gap-2"><Label>Reference</Label><Input placeholder="Rel #..." value={logForm.reference} onChange={e => setLogForm({ ...logForm, reference: e.target.value })} /></div>
                      </div>
                    </div>
                    <DialogFooter><Button onClick={handleAddLog}>Certify & Save</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-[30%]">Details</TableHead>
                    <TableHead>AME No.</TableHead>
                    <TableHead>AMO No.</TableHead>
                    <TableHead className="text-right">Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="font-medium">{log.maintenanceType}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-pre-wrap">{log.details}</TableCell>
                      <TableCell className="font-mono text-xs">{log.ameNo}</TableCell>
                      <TableCell className="font-mono text-xs">{log.amoNo}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{log.reference}</TableCell>
                    </TableRow>
                  ))}
                  {(!logs || logs.length === 0) && (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No maintenance records found.</TableCell></TableRow>
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
