'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Plus, History, Settings2, Clock, Gauge, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';

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
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tracking-tight">{value}</span>
          <span className="text-xs text-muted-foreground font-medium">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AircraftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const aircraftRef = useMemoFirebase(() => doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId), [firestore, tenantId, aircraftId]);
  const componentsQuery = useMemoFirebase(() => query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`), orderBy('name')), [firestore, tenantId, aircraftId]);
  const maintenanceQuery = useMemoFirebase(() => query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')), [firestore, tenantId, aircraftId]);

  const { data: aircraft, isLoading: loadingAc } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: loadingComp } = useCollection<AircraftComponent>(componentsQuery);
  const { data: logs, isLoading: loadingLogs } = useCollection<MaintenanceLog>(maintenanceQuery);

  const [isHourDialogOpen, setIsHourDialogOpen] = useState(false);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isCompDialogOpen, setIsCompDialogOpen] = useState(false);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);

  if (loadingAc) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  const hoursRemaining50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const hoursRemaining100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  const handleUpdateHours = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateDocumentNonBlocking(aircraftRef, {
      currentHobbs: parseFloat(formData.get('hobbs') as string),
      currentTacho: parseFloat(formData.get('tacho') as string),
    });
    setIsHourDialogOpen(false);
  };

  const handleUpdateService = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateDocumentNonBlocking(aircraftRef, {
      tachoAtNext50Inspection: parseFloat(formData.get('next50') as string),
      tachoAtNext100Inspection: parseFloat(formData.get('next100') as string),
    });
    setIsServiceDialogOpen(false);
  };

  const handleSaveComponent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      partNumber: formData.get('partNumber') as string,
      serialNumber: formData.get('serialNumber') as string,
      tsn: parseFloat(formData.get('tsn') as string),
      maxHours: parseFloat(formData.get('maxHours') as string),
    };

    if (editingComponent) {
      updateDocumentNonBlocking(doc(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`, editingComponent.id), data);
    } else {
      addDocumentNonBlocking(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`), data);
    }
    setIsCompDialogOpen(false);
    setEditingComponent(null);
  };

  const handleAddLog = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addDocumentNonBlocking(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), {
      maintenanceType: formData.get('type') as string,
      date: new Date().toISOString(),
      details: formData.get('details') as string,
      ameNo: formData.get('ameNo') as string,
    });
    setIsLogDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Fleet List</Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none font-bold">HEALTHY</Badge>
          </div>
          <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isHourDialogOpen} onOpenChange={setIsHourDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Clock className="mr-2 h-4 w-4" /> Edit Flight Hours</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Current Hours</DialogTitle>
                <DialogDescription>Manually override the current Hobbs and Tacho readings.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateHours} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hobbs">Current Hobbs</Label>
                    <Input id="hobbs" name="hobbs" type="number" step="0.1" defaultValue={aircraft.currentHobbs} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tacho">Current Tacho</Label>
                    <Input id="tacho" name="tacho" type="number" step="0.1" defaultValue={aircraft.currentTacho} required />
                  </div>
                </div>
                <DialogFooter><Button type="submit">Update Readings</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Settings2 className="mr-2 h-4 w-4" /> Edit Service</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Service Targets</DialogTitle>
                <DialogDescription>Manually set the Tachometer readings for the next inspections.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateService} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="next50">Next 50h Inspection (Tacho)</Label>
                    <Input id="next50" name="next50" type="number" step="0.1" defaultValue={aircraft.tachoAtNext50Inspection} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="next100">Next 100h Inspection (Tacho)</Label>
                    <Input id="next100" name="next100" type="number" step="0.1" defaultValue={aircraft.tachoAtNext100Inspection} required />
                  </div>
                </div>
                <DialogFooter><Button type="submit">Save Targets</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1) || '0.0'} unit="h" />
        <StatCard title="Current Tacho" value={aircraft.currentTacho?.toFixed(1) || '0.0'} unit="h" />
        <StatCard 
          title="50h Inspection" 
          value={hoursRemaining50.toFixed(1)} 
          unit="h remaining" 
          status={hoursRemaining50 < 10 ? 'danger' : hoursRemaining50 < 20 ? 'warning' : 'ok'} 
        />
        <StatCard 
          title="100h Inspection" 
          value={hoursRemaining100.toFixed(1)} 
          unit="h remaining" 
          status={hoursRemaining100 < 15 ? 'danger' : hoursRemaining100 < 30 ? 'warning' : 'ok'} 
        />
      </div>

      <Card className="rounded-xl overflow-hidden border-2">
        <Tabs defaultValue="components" className="w-full">
          <div className="bg-muted/30 border-b px-4 py-2">
            <TabsList className="bg-transparent gap-2 h-auto p-0">
              <TabsTrigger 
                value="components" 
                className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-6 py-2"
              >
                Tracked Components
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-6 py-2"
              >
                Maintenance History
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="components" className="m-0 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Life-Limited Components</h3>
              <Button size="sm" onClick={() => { setEditingComponent(null); setIsCompDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Add Component
              </Button>
            </div>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Component</th>
                    <th className="px-4 py-3 text-left font-medium">Serial No.</th>
                    <th className="px-4 py-3 text-right font-medium">TSN</th>
                    <th className="px-4 py-3 text-right font-medium">Limit</th>
                    <th className="px-4 py-3 text-right font-medium">Remaining</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {components?.map((comp) => {
                    const remaining = (comp.maxHours || 0) - (comp.tsn || 0);
                    return (
                      <tr key={comp.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">{comp.name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{comp.serialNumber}</td>
                        <td className="px-4 py-3 text-right">{comp.tsn?.toFixed(1) || '0.0'}h</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{comp.maxHours?.toFixed(1) || 'N/A'}h</td>
                        <td className="px-4 py-3 text-right">
                          <Badge variant={remaining < 50 ? 'destructive' : 'secondary'} className="font-bold">
                            {remaining.toFixed(1)}h
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingComponent(comp); setIsCompDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="history" className="m-0 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Service Log</h3>
              <Button size="sm" onClick={() => setIsLogDialogOpen(true)}>
                <History className="mr-2 h-4 w-4" /> Add Maintenance Log
              </Button>
            </div>
            <div className="space-y-4">
              {logs?.map((log) => (
                <div key={log.id} className="p-4 rounded-lg border bg-background flex flex-col md:flex-row gap-4 justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{log.maintenanceType}</span>
                      <span className="text-xs text-muted-foreground">• {format(new Date(log.date), 'dd MMM yyyy')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{log.details}</p>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Certified By</span>
                    <span className="text-sm font-mono">{log.ameNo}</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Dialogs */}
      <Dialog open={isCompDialogOpen} onOpenChange={setIsCompDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingComponent ? 'Edit Component' : 'Add Component'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveComponent} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Component Name</Label>
              <Input name="name" defaultValue={editingComponent?.name} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Part Number</Label>
                <Input name="partNumber" defaultValue={editingComponent?.partNumber} />
              </div>
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input name="serialNumber" defaultValue={editingComponent?.serialNumber} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>TSN (Time Since New)</Label>
                <Input name="tsn" type="number" step="0.1" defaultValue={editingComponent?.tsn} required />
              </div>
              <div className="space-y-2">
                <Label>Limit (Hours)</Label>
                <Input name="maxHours" type="number" step="0.1" defaultValue={editingComponent?.maxHours} required />
              </div>
            </div>
            <DialogFooter><Button type="submit">Save Component</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Maintenance Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddLog} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Maintenance Type</Label>
              <Input name="type" placeholder="e.g., 50hr Inspection, Engine Oil Change" required />
            </div>
            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea name="details" placeholder="Describe work performed..." required />
            </div>
            <div className="space-y-2">
              <Label>Engineer License No.</Label>
              <Input name="ameNo" required />
            </div>
            <DialogFooter><Button type="submit">Certify & Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
