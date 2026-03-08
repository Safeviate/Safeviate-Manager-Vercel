
'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { PlusCircle, Pencil, Trash2, Clock, Settings2, ArrowLeft, History, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

function StatCard({ title, value, unit, status = 'ok' }: { title: string; value: string; unit: string; status?: 'ok' | 'warning' | 'danger' }) {
  return (
    <Card className={cn(
      status === 'warning' && 'border-orange-200 bg-orange-50',
      status === 'danger' && 'border-red-200 bg-red-50'
    )}>
      <CardHeader className="p-4 pb-0">
        <CardDescription className="text-[10px] font-bold uppercase tracking-wider">{title}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-1">
        <div className="text-2xl font-bold flex items-baseline gap-1">
          {value}
          <span className="text-xs font-normal text-muted-foreground">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
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
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components')) : null),
    [firestore, tenantId, aircraftId]
  );

  const maintenanceQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'maintenanceLogs'), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);
  const { data: maintenanceLogs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(maintenanceQuery);

  const [isHourDialogOpen, setIsHourDialogOpen] = useState(false);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [isCompDialogOpen, setIsCompDialogOpen] = useState(false);

  const [hoursForm, setHoursHoursForm] = useState({ hobbs: 0, tacho: 0 });
  const [serviceForm, setServiceForm] = useState({ tacho50: 0, tacho100: 0 });
  const [logForm, setLogForm] = useState({ type: '', details: '', ame: '', amo: '', reference: '' });
  const [compForm, setCompForm] = useState({ name: '', serial: '', partNumber: '', maxHours: 0, tsn: 0 });

  const remaining50 = (aircraft?.tachoAtNext50Inspection || 0) - (aircraft?.currentTacho || 0);
  const remaining100 = (aircraft?.tachoAtNext100Inspection || 0) - (aircraft?.currentTacho || 0);

  const handleUpdateHours = () => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, {
      currentHobbs: Number(hoursForm.hobbs),
      currentTacho: Number(hoursForm.tacho)
    });
    toast({ title: "Flight Hours Updated" });
    setIsHourDialogOpen(false);
  };

  const handleUpdateService = () => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, {
      tachoAtNext50Inspection: Number(serviceForm.tacho50),
      tachoAtNext100Inspection: Number(serviceForm.tacho100)
    });
    toast({ title: "Service Targets Updated" });
    setIsServiceDialogOpen(false);
  };

  const handleAddLog = () => {
    if (!firestore) return;
    const logsRef = collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'maintenanceLogs');
    addDocumentNonBlocking(logsRef, {
      ...logForm,
      date: new Date().toISOString(),
      maintenanceType: logForm.type,
      ameNo: logForm.ame,
      amoNo: logForm.amo
    });
    toast({ title: "Maintenance Certified" });
    setIsLogDialogOpen(false);
    setLogForm({ type: '', details: '', ame: '', amo: '', reference: '' });
  };

  const handleAddComponent = () => {
    if (!firestore) return;
    const compRef = collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components');
    addDocumentNonBlocking(compRef, {
      ...compForm,
      installDate: new Date().toISOString(),
      installHours: aircraft?.currentTacho || 0,
      tso: 0
    });
    toast({ title: "Component Added" });
    setIsCompDialogOpen(false);
    setCompForm({ name: '', serial: '', partNumber: '', maxHours: 0, tsn: 0 });
  };

  if (isLoadingAircraft) return <Skeleton className="h-screen w-full" />;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none font-bold">HEALTHY</Badge>
          </div>
          <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isHourDialogOpen} onOpenChange={(open) => {
            if (open) setHoursHoursForm({ hobbs: aircraft.currentHobbs || 0, tacho: aircraft.currentTacho || 0 });
            setIsHourDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button variant="outline"><Clock className="mr-2 h-4 w-4" /> Edit Flight Hours</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Manual Hour Override</DialogTitle><DialogDescription>Update current aircraft meter readings.</DialogDescription></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="hobbs" className="text-right">Current Hobbs</Label>
                  <Input id="hobbs" type="number" step="0.1" value={hoursForm.hobbs} onChange={e => setHoursHoursForm({ ...hoursForm, hobbs: Number(e.target.value) })} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tacho" className="text-right">Current Tacho</Label>
                  <Input id="tacho" type="number" step="0.1" value={hoursForm.tacho} onChange={e => setHoursHoursForm({ ...hoursForm, tacho: Number(e.target.value) })} className="col-span-3" />
                </div>
              </div>
              <DialogFooter><Button onClick={handleUpdateHours}>Save Readings</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isServiceDialogOpen} onOpenChange={(open) => {
            if (open) setServiceForm({ tacho50: aircraft.tachoAtNext50Inspection || 0, tacho100: aircraft.tachoAtNext100Inspection || 0 });
            setIsServiceDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button variant="outline"><Settings2 className="mr-2 h-4 w-4" /> Edit Service</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Service Interval Targets</DialogTitle><DialogDescription>Set the next Tachometer targets for major inspections.</DialogDescription></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tacho50" className="text-right">Next 50hr</Label>
                  <Input id="tacho50" type="number" step="0.1" value={serviceForm.tacho50} onChange={e => setServiceForm({ ...serviceForm, tacho50: Number(e.target.value) })} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tacho100" className="text-right">Next 100hr</Label>
                  <Input id="tacho100" type="number" step="0.1" value={serviceForm.tacho100} onChange={e => setServiceForm({ ...serviceForm, tacho100: Number(e.target.value) })} className="col-span-3" />
                </div>
              </div>
              <DialogFooter><Button onClick={handleUpdateService}>Update Targets</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard title="Current Hobbs" value={(aircraft.currentHobbs || 0).toFixed(1)} unit="h" />
        <StatCard title="Current Tacho" value={(aircraft.currentTacho || 0).toFixed(1)} unit="h" />
        <StatCard title="Next 50hr (Tacho)" value={(aircraft.tachoAtNext50Inspection || 0).toFixed(1)} unit="h" />
        <StatCard title="Next 100hr (Tacho)" value={(aircraft.tachoAtNext100Inspection || 0).toFixed(1)} unit="h" />
        <StatCard title="Remaining to 50hr" value={remaining50.toFixed(1)} unit="h" status={remaining50 < 10 ? 'warning' : 'ok'} />
        <StatCard title="Remaining to 100hr" value={remaining100.toFixed(1)} unit="h" status={remaining100 < 10 ? 'warning' : 'ok'} />
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <Tabs defaultValue="components" className="w-full">
          <div className="px-4 pt-4 border-b bg-muted/30">
            <TabsList className="bg-transparent h-auto p-0 gap-4">
              <TabsTrigger 
                value="components" 
                className="rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background px-6 py-3 font-semibold"
              >
                Tracked Components
              </TabsTrigger>
              <TabsTrigger 
                value="maintenance" 
                className="rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background px-6 py-3 font-semibold"
              >
                Maintenance History
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="components" className="m-0 p-0">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Life-Limited Parts</h3>
                <Dialog open={isCompDialogOpen} onOpenChange={setIsCompDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>New Tracked Component</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Name</Label><Input value={compForm.name} onChange={e => setCompForm({...compForm, name: e.target.value})} className="col-span-3" /></div>
                      <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Part No.</Label><Input value={compForm.partNumber} onChange={e => setCompForm({...compForm, partNumber: e.target.value})} className="col-span-3" /></div>
                      <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Serial No.</Label><Input value={compForm.serial} onChange={e => setCompForm({...compForm, serial: e.target.value})} className="col-span-3" /></div>
                      <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Max Hours</Label><Input type="number" value={compForm.maxHours} onChange={e => setCompForm({...compForm, maxHours: Number(e.target.value)})} className="col-span-3" /></div>
                      <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Current TSN</Label><Input type="number" value={compForm.tsn} onChange={e => setCompForm({...compForm, tsn: Number(e.target.value)})} className="col-span-3" /></div>
                    </div>
                    <DialogFooter><Button onClick={handleAddComponent}>Add Part</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead>Component Name</TableHead>
                    <TableHead>Part / Serial</TableHead>
                    <TableHead className="text-right">TSN</TableHead>
                    <TableHead className="text-right">Life Limit</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(components || []).map((comp) => {
                    const remaining = (comp.maxHours || 0) - (comp.tsn || 0);
                    return (
                      <TableRow key={comp.id}>
                        <TableCell className="font-bold">{comp.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{comp.partNumber} / {comp.serialNumber}</TableCell>
                        <TableCell className="text-right font-mono">{(comp.tsn || 0).toFixed(1)}h</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{(comp.maxHours || 0).toFixed(1)}h</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={remaining < 50 ? 'destructive' : 'secondary'} className="font-bold">
                            {remaining.toFixed(1)}h
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(firestore!, 'tenants', tenantId, 'aircrafts', aircraftId, 'components', comp.id))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!components || components.length === 0) && (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No life-limited parts tracked.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="maintenance" className="m-0 p-0">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Certification Log</h3>
                <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Maintenance Entry</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>New Maintenance Entry</DialogTitle><DialogDescription>Certify work performed on this aircraft.</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Type</Label><Input value={logForm.type} onChange={e => setLogForm({...logForm, type: e.target.value})} placeholder="e.g., 50hr Inspection" className="col-span-3" /></div>
                      <div className="grid grid-cols-4 items-start gap-4"><Label className="text-right pt-2">Details</Label><Textarea value={logForm.details} onChange={e => setLogForm({...logForm, details: e.target.value})} placeholder="Work performed..." className="col-span-3 min-h-[100px]" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid grid-cols-2 items-center gap-4"><Label className="text-right">AME No.</Label><Input value={logForm.ame} onChange={e => setLogForm({...logForm, ame: e.target.value})} className="" /></div>
                        <div className="grid grid-cols-2 items-center gap-4"><Label className="text-right">AMO No.</Label><Input value={logForm.amo} onChange={e => setLogForm({...logForm, amo: e.target.value})} className="" /></div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Reference</Label><Input value={logForm.reference} onChange={e => setLogForm({...logForm, reference: e.target.value})} className="col-span-3" /></div>
                    </div>
                    <DialogFooter><Button onClick={handleAddLog}>Certify & Save</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="w-[150px]">Date</TableHead>
                    <TableHead>Work Performed</TableHead>
                    <TableHead>Certifier</TableHead>
                    <TableHead className="text-right">Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(maintenanceLogs || []).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                      <TableCell>
                        <div className="font-bold text-primary">{log.maintenanceType}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{log.details}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-bold">{log.ameNo}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{log.amoNo}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{log.reference || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                  {(!maintenanceLogs || maintenanceLogs.length === 0) && (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No maintenance history recorded.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
