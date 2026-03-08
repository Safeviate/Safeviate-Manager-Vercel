
'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Pencil, PlusCircle, Settings2, History, Gauge, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`), orderBy('name')) : null),
    [firestore, tenantId, aircraftId]
  );

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  if (isLoadingAircraft) {
    return <div className="space-y-6 p-8"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!aircraft) {
    return <div className="p-8 text-center"><p>Aircraft not found.</p><Button asChild variant="link"><Link href="/assets/aircraft">Back to fleet</Link></Button></div>;
  }

  const fiftyRemaining = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const hundredRemaining = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Fleet</Link>
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none font-bold">HEALTHY</Badge>
          </div>
          <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
        </div>
        <div className="flex gap-2">
          <EditHoursDialog aircraft={aircraft} tenantId={tenantId} />
          <EditServiceDialog aircraft={aircraft} tenantId={tenantId} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Current Hobbs" value={(aircraft.currentHobbs || 0).toFixed(1)} unit="hrs" />
        <StatCard title="Current Tacho" value={(aircraft.currentTacho || 0).toFixed(1)} unit="hrs" />
        <StatCard title="50hr Inspection" value={fiftyRemaining.toFixed(1)} unit="remaining" status={fiftyRemaining < 5 ? 'warning' : 'ok'} />
        <StatCard title="100hr Inspection" value={hundredRemaining.toFixed(1)} unit="remaining" status={hundredRemaining < 10 ? 'warning' : 'ok'} />
      </div>

      <div className="border rounded-xl overflow-hidden bg-card">
        <Tabs defaultValue="components" className="w-full">
          <div className="px-4 pt-4 border-b bg-muted/20">
            <TabsList className="h-10 p-1 bg-muted rounded-lg">
              <TabsTrigger value="components" className="rounded-md px-6 flex items-center gap-2"><Settings2 className="h-4 w-4" /> Tracked Components</TabsTrigger>
              <TabsTrigger value="history" className="rounded-md px-6 flex items-center gap-2"><History className="h-4 w-4" /> Maintenance History</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="components" className="m-0">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Life-Limited & Tracked Items</h3>
                <ComponentDialog aircraftId={aircraftId} tenantId={tenantId} />
              </div>
              <div className="rounded-md border bg-background">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Component</th>
                      <th className="px-4 py-3 text-left font-medium">Serial No.</th>
                      <th className="px-4 py-3 text-right font-medium">Current TSN</th>
                      <th className="px-4 py-3 text-right font-medium">Max Limit</th>
                      <th className="px-4 py-3 text-right font-medium">Remaining</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(components || []).map(comp => {
                      const remaining = comp.maxHours - comp.tsn;
                      return (
                        <tr key={comp.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{comp.name}</td>
                          <td className="px-4 py-3 font-mono text-xs">{comp.serialNumber}</td>
                          <td className="px-4 py-3 text-right">{comp.tsn.toFixed(1)}h</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{comp.maxHours.toFixed(1)}h</td>
                          <td className="px-4 py-3 text-right">
                            <Badge variant={remaining < 50 ? 'destructive' : 'secondary'} className="font-bold">
                              {remaining.toFixed(1)}h
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <ComponentDialog aircraftId={aircraftId} tenantId={tenantId} existingComponent={comp} />
                          </td>
                        </tr>
                      );
                    })}
                    {(!components || components.length === 0) && !isLoadingComponents && (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No components tracked for this aircraft.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="m-0">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Service Log</h3>
                <MaintenanceLogDialog aircraftId={aircraftId} tenantId={tenantId} />
              </div>
              <div className="space-y-4">
                {(logs || []).map(log => (
                  <Card key={log.id} className="shadow-none">
                    <CardHeader className="p-4 flex flex-row items-start justify-between bg-muted/10">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{log.maintenanceType}</Badge>
                          <span className="text-sm font-medium">{format(new Date(log.date), 'PPP')}</span>
                        </div>
                        <CardDescription className="mt-1">Performed by: {log.ameNo} at {log.amoNo}</CardDescription>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => deleteDocumentNonBlocking(doc(firestore!, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`, log.id))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-4 text-sm whitespace-pre-wrap">
                      {log.details}
                    </CardContent>
                  </Card>
                ))}
                {(!logs || logs.length === 0) && !isLoadingLogs && (
                  <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">No maintenance records found.</div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({ title, value, unit, status = 'ok' }: { title: string; value: string; unit: string; status?: 'ok' | 'warning' }) {
  return (
    <Card className={cn(status === 'warning' && 'border-orange-200 bg-orange-50')}>
      <CardHeader className="p-4 pb-0">
        <CardDescription className="text-[10px] font-bold uppercase tracking-wider">{title}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-[10px] font-medium text-muted-foreground uppercase">{unit}</span>
      </CardContent>
    </Card>
  );
}

function EditHoursDialog({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  const [hobbs, setHobbs] = useState(String(aircraft.currentHobbs || 0));
  const [tacho, setTacho] = useState(String(aircraft.currentTacho || 0));
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();

  const handleSave = () => {
    const aircraftRef = doc(firestore!, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, {
      currentHobbs: parseFloat(hobbs) || 0,
      currentTacho: parseFloat(tacho) || 0,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2"><Gauge className="h-4 w-4" /> Edit Flight Hours</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Update Aircraft Hours</DialogTitle><DialogDescription>Manually set the current Hobbs and Tachometer readings.</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="hobbs" className="text-right">Hobbs</Label><Input id="hobbs" value={hobbs} onChange={(e) => setHobbs(e.target.value)} type="number" step="0.1" className="col-span-3" /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="tacho" className="text-right">Tacho</Label><Input id="tacho" value={tacho} onChange={(e) => setTacho(e.target.value)} type="number" step="0.1" className="col-span-3" /></div>
        </div>
        <DialogFooter><Button onClick={handleSave}>Save Hours</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditServiceDialog({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  const [next50, setNext50] = useState(String(aircraft.tachoAtNext50Inspection || 0));
  const [next100, setNext100] = useState(String(aircraft.tachoAtNext100Inspection || 0));
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();

  const handleSave = () => {
    const aircraftRef = doc(firestore!, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, {
      tachoAtNext50Inspection: parseFloat(next50) || 0,
      tachoAtNext100Inspection: parseFloat(next100) || 0,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2"><Settings2 className="h-4 w-4" /> Edit Service</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Update Service Intervals</DialogTitle><DialogDescription>Set the tachometer targets for the next inspections.</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="next50" className="text-right whitespace-nowrap">Next 50hr</Label><Input id="next50" value={next50} onChange={(e) => setNext50(e.target.value)} type="number" step="0.1" className="col-span-3" /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="next100" className="text-right whitespace-nowrap">Next 100hr</Label><Input id="next100" value={next100} onChange={(e) => setNext100(e.target.value)} type="number" step="0.1" className="col-span-3" /></div>
        </div>
        <DialogFooter><Button onClick={handleSave}>Save Service Plan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ComponentDialog({ aircraftId, tenantId, existingComponent }: { aircraftId: string; tenantId: string; existingComponent?: AircraftComponent }) {
  const [name, setName] = useState(existingComponent?.name || '');
  const [sn, setSn] = useState(existingComponent?.serialNumber || '');
  const [tsn, setTsn] = useState(String(existingComponent?.tsn || 0));
  const [max, setMax] = useState(String(existingComponent?.maxHours || 2000));
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();

  const handleSave = () => {
    const collectionRef = collection(firestore!, `tenants/${tenantId}/aircrafts/${aircraftId}/components`);
    const data = {
      name,
      serialNumber: sn,
      tsn: parseFloat(tsn) || 0,
      maxHours: parseFloat(max) || 0,
      partNumber: existingComponent?.partNumber || 'N/A',
      installHours: existingComponent?.installHours || 0,
      installDate: existingComponent?.installDate || new Date().toISOString(),
      notes: existingComponent?.notes || '',
      tso: existingComponent?.tso || 0,
      manufacturer: existingComponent?.manufacturer || 'Unknown',
    };

    if (existingComponent) {
      updateDocumentNonBlocking(doc(collectionRef, existingComponent.id), data);
    } else {
      addDocumentNonBlocking(collectionRef, data);
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {existingComponent ? <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button> : <Button size="sm" className="gap-2"><PlusCircle className="h-4 w-4" /> Add Component</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{existingComponent ? 'Edit' : 'Register New'} Component</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">S/N</Label><Input value={sn} onChange={(e) => setSn(e.target.value)} className="col-span-3" /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Current TSN</Label><Input value={tsn} onChange={(e) => setTsn(e.target.value)} type="number" step="0.1" className="col-span-3" /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Service Life</Label><Input value={max} onChange={(e) => setMax(e.target.value)} type="number" className="col-span-3" /></div>
        </div>
        <DialogFooter><Button onClick={handleSave}>Save Component</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MaintenanceLogDialog({ aircraftId, tenantId }: { aircraftId: string; tenantId: string }) {
  const [type, setType] = useState('50hr Inspection');
  const [details, setDetails] = useState('');
  const [ame, setAme] = useState('');
  const [amo, setAmo] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();

  const handleSave = () => {
    const collectionRef = collection(firestore!, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(collectionRef, {
      maintenanceType: type,
      details,
      ameNo: ame,
      amoNo: amo,
      date: new Date().toISOString(),
      aircraftId,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2"><PlusCircle className="h-4 w-4" /> Add Maintenance Log</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New Maintenance Entry</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Type</Label><Input value={type} onChange={(e) => setType(e.target.value)} className="col-span-3" /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Details</Label><Textarea value={details} onChange={(e) => setDetails(e.target.value)} className="col-span-3 h-32" /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">AME No.</Label><Input value={ame} onChange={(e) => setAme(e.target.value)} className="col-span-3" /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">AMO No.</Label><Input value={amo} onChange={(e) => setAmo(e.target.value)} className="col-span-3" /></div>
        </div>
        <DialogFooter><Button onClick={handleSave}>Record Log</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
