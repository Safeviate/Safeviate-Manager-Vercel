
'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft, 
  Pencil, 
  Clock, 
  Settings, 
  AlertTriangle, 
  Plus, 
  Wrench, 
  History,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';

function StatCard({ title, value, unit, status = 'ok' }: { title: string; value: string; unit: string; status?: 'ok' | 'warning' }) {
  return (
    <Card className={cn("shadow-none border-border/50 bg-muted/10", status === 'warning' && 'border-orange-200 bg-orange-50')}>
      <CardHeader className="p-4 pb-0">
        <CardDescription className="text-[10px] font-bold uppercase tracking-wider">{title}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-1 flex items-center justify-between">
        <div className="flex items-baseline gap-1">
          <span className={cn("text-2xl font-bold", status === 'warning' && 'text-orange-600')}>{value}</span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
        <div className={cn("p-2 rounded-full", status === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-muted text-muted-foreground')}>
          {title.includes('Hobbs') ? <Clock size={16} /> : title.includes('Tacho') ? <Settings size={16} /> : <AlertTriangle size={16} />}
        </div>
      </CardContent>
    </Card>
  );
}

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

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`)) : null),
    [firestore, tenantId, aircraftId]
  );

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`)) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: loadingAc } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: loadingComp } = useCollection<AircraftComponent>(componentsQuery);
  const { data: logs, isLoading: loadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  if (loadingAc || !aircraft) {
    return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  }

  const next50Remaining = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const next100Remaining = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link href="/assets/aircraft">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Fleet
          </Link>
        </Button>
        <EditHoursDialog aircraft={aircraft} tenantId={tenantId} />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
          <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none font-bold">HEALTHY</Badge>
        </div>
        <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Current Hobbs" value={(aircraft.currentHobbs || 0).toFixed(1)} unit="hrs" />
        <StatCard title="Current Tacho" value={(aircraft.currentTacho || 0).toFixed(1)} unit="hrs" />
        <StatCard 
          title="Next 50hr" 
          value={next50Remaining.toFixed(1)} 
          unit="hrs" 
          status={next50Remaining < 5 ? 'warning' : 'ok'} 
        />
        <StatCard 
          title="Next 100hr" 
          value={next100Remaining.toFixed(1)} 
          unit="hrs" 
          status={next100Remaining < 10 ? 'warning' : 'ok'} 
        />
      </div>

      <Card className="rounded-xl border shadow-none overflow-hidden">
        <Tabs defaultValue="components" className="w-full">
          <TabsList className="w-full justify-start h-14 bg-muted/30 border-b p-0 rounded-none">
            <TabsTrigger 
              value="components" 
              className="h-full px-8 rounded-none border-r data-[state=active]:bg-background data-[state=active]:border-b-transparent font-semibold"
            >
              Tracked Components
            </TabsTrigger>
            <TabsTrigger 
              value="maintenance" 
              className="h-full px-8 rounded-none border-r data-[state=active]:bg-background data-[state=active]:border-b-transparent font-semibold"
            >
              Maintenance History
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="components" className="m-0">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Fleet Tracked Components</h3>
                <ComponentDialog aircraftId={aircraftId} tenantId={tenantId} />
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/20">
                    <TableHead>Component Name</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>TSN (Hours)</TableHead>
                    <TableHead>TSO (Hours)</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components && components.length > 0 ? (
                    components.map((comp) => {
                      const remaining = (comp.maxHours || 0) - (comp.tsn || 0);
                      return (
                        <TableRow key={comp.id} className="group">
                          <TableCell className="font-medium">{comp.name}</TableCell>
                          <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                          <TableCell>{comp.tsn?.toFixed(1) || '0.0'}</TableCell>
                          <TableCell>{comp.tso?.toFixed(1) || '0.0'}</TableCell>
                          <TableCell className={cn(remaining < 50 ? 'text-orange-600 font-bold' : '')}>
                            {remaining > 0 ? remaining.toFixed(1) : 'EXPIRED'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none text-[10px] font-bold">HEALTHY</Badge>
                              <ComponentDialog 
                                aircraftId={aircraftId} 
                                tenantId={tenantId} 
                                existingComponent={comp}
                                trigger={
                                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Pencil size={14} />
                                  </Button>
                                }
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        No life-limited components registered for this aircraft.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="maintenance" className="m-0">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Aircraft Service Records</h3>
                <MaintenanceDialog aircraftId={aircraftId} tenantId={tenantId} />
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/20">
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>AME No.</TableHead>
                    <TableHead className="text-right">AMO No.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs && logs.length > 0 ? (
                    logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell><Badge variant="outline">{log.maintenanceType}</Badge></TableCell>
                        <TableCell className="max-w-md truncate text-xs text-muted-foreground">{log.details}</TableCell>
                        <TableCell className="font-mono text-xs">{log.ameNo || 'N/A'}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{log.amoNo || 'N/A'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        No maintenance history found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

function EditHoursDialog({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hobbs, setHobbs] = useState(aircraft.currentHobbs?.toString() || '0');
  const [tacho, setTacho] = useState(aircraft.currentTacho?.toString() || '0');
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleSave = () => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, {
      currentHobbs: parseFloat(hobbs) || 0,
      currentTacho: parseFloat(tacho) || 0,
    });
    toast({ title: 'Flight Hours Updated' });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Pencil className="h-4 w-4" />
          Edit Flight Hours
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Aircraft Meters</DialogTitle>
          <DialogDescription>Manually adjust the current Hobbs and Tachometer readings.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="hobbs" className="text-right">Hobbs</Label>
            <Input id="hobbs" type="number" step="0.1" value={hobbs} onChange={(e) => setHobbs(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tacho" className="text-right">Tacho</Label>
            <Input id="tacho" type="number" step="0.1" value={tacho} onChange={(e) => setTacho(e.target.value)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save Meter Readings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ComponentDialog({ aircraftId, tenantId, existingComponent, trigger }: { aircraftId: string; tenantId: string; existingComponent?: AircraftComponent; trigger?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: existingComponent?.name || '',
    partNumber: existingComponent?.partNumber || '',
    serialNumber: existingComponent?.serialNumber || '',
    maxHours: existingComponent?.maxHours?.toString() || '',
    tsn: existingComponent?.tsn?.toString() || '0',
  });

  const handleSave = () => {
    if (!firestore) return;
    const collectionRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`);
    
    const data = {
      ...formData,
      maxHours: parseFloat(formData.maxHours) || 0,
      tsn: parseFloat(formData.tsn) || 0,
      tso: existingComponent?.tso || 0,
      installDate: existingComponent?.installDate || new Date().toISOString(),
    };

    if (existingComponent) {
      const docRef = doc(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`, existingComponent.id);
      updateDocumentNonBlocking(docRef, data);
      toast({ title: 'Component Updated' });
    } else {
      addDocumentNonBlocking(collectionRef, data);
      toast({ title: 'Component Registered' });
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="gap-2">
            <Plus size={14} /> Add Component
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingComponent ? 'Edit Component' : 'Register New Component'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Component Name</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Engine, Magneto" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Part Number</Label>
              <Input value={formData.partNumber} onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input value={formData.serialNumber} onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Life Limit (Hours)</Label>
              <Input type="number" value={formData.maxHours} onChange={(e) => setFormData({ ...formData, maxHours: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Current TSN</Label>
              <Input type="number" value={formData.tsn} onChange={(e) => setFormData({ ...formData, tsn: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>{existingComponent ? 'Save Changes' : 'Add Component'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MaintenanceDialog({ aircraftId, tenantId }: { aircraftId: string; tenantId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    maintenanceType: '50hr Inspection',
    details: '',
    ameNo: '',
    amoNo: '',
  });

  const handleSave = () => {
    if (!firestore) return;
    const collectionRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(collectionRef, {
      ...formData,
      date: new Date().toISOString(),
    });
    toast({ title: 'Maintenance Log Recorded' });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus size={14} /> Add Maintenance Log
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Maintenance Event</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Event Type</Label>
            <Input value={formData.maintenanceType} onChange={(e) => setFormData({ ...formData, maintenanceType: e.target.value })} placeholder="e.g. 100hr Inspection" />
          </div>
          <div className="space-y-2">
            <Label>Work Performed</Label>
            <Textarea value={formData.details} onChange={(e) => setFormData({ ...formData, details: e.target.value })} className="min-h-[100px]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>AME License No.</Label>
              <Input value={formData.ameNo} onChange={(e) => setFormData({ ...formData, ameNo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>AMO Number</Label>
              <Input value={formData.amoNo} onChange={(e) => setFormData({ ...formData, amoNo: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Log Maintenance</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
