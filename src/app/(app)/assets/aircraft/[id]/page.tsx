
'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, PlusCircle, Pencil, Trash2, Settings2, Clock } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const aircraftId = resolvedParams.id;
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const aircraftRef = useMemoFirebase(() => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null), [firestore, aircraftId]);
  const componentsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components')) : null), [firestore, aircraftId]);
  const maintenanceQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'maintenanceLogs'), orderBy('date', 'desc')) : null), [firestore, aircraftId]);

  const { data: aircraft, isLoading: loadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: loadingComponents } = useCollection<AircraftComponent>(componentsQuery);
  const { data: maintenanceLogs, isLoading: loadingLogs } = useCollection<MaintenanceLog>(maintenanceQuery);

  const [isHourDialogOpen, setIsHourDialogOpen] = useState(false);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isCompDialogOpen, setIsCompDialogOpen] = useState(false);
  const [isMaintDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<AircraftComponent | null>(null);

  if (loadingAircraft) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  const handleUpdateHours = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updates = {
      currentHobbs: parseFloat(formData.get('hobbs') as string),
      currentTacho: parseFloat(formData.get('tacho') as string),
    };
    updateDocumentNonBlocking(aircraftRef!, updates);
    setIsHourDialogOpen(false);
    toast({ title: "Flight Hours Updated" });
  };

  const handleUpdateService = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updates = {
      tachoAtNext50Inspection: parseFloat(formData.get('next50') as string),
      tachoAtNext100Inspection: parseFloat(formData.get('next100') as string),
    };
    updateDocumentNonBlocking(aircraftRef!, updates);
    setIsServiceDialogOpen(false);
    toast({ title: "Service Targets Updated" });
  };

  const handleSaveComponent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      partNumber: formData.get('partNumber') as string,
      serialNumber: formData.get('serialNumber') as string,
      manufacturer: formData.get('manufacturer') as string,
      tsn: parseFloat(formData.get('tsn') as string),
      maxHours: parseFloat(formData.get('maxHours') as string),
    };

    if (editingComp) {
      updateDocumentNonBlocking(doc(firestore!, aircraftRef!.path, 'components', editingComp.id), data);
    } else {
      addDocumentNonBlocking(collection(firestore!, aircraftRef!.path, 'components'), data);
    }
    setIsCompDialogOpen(false);
    setEditingComp(null);
    toast({ title: editingComp ? "Component Updated" : "Component Added" });
  };

  const handleSaveMaintenance = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      maintenanceType: formData.get('type') as string,
      details: formData.get('details') as string,
      ameNo: formData.get('ameNo') as string,
      amoNo: formData.get('amoNo') as string,
      reference: formData.get('reference') as string,
      date: new Date().toISOString(),
      aircraftId: aircraftId,
    };
    addDocumentNonBlocking(collection(firestore!, aircraftRef!.path, 'maintenanceLogs'), data);
    setIsMaintenanceDialogOpen(false);
    toast({ title: "Maintenance Entry Certified" });
  };

  const remaining50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const remaining100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button asChild variant="outline" size="sm">
          <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Fleet</Link>
        </Button>
        <div className="flex gap-2">
          <Button onClick={() => setIsHourDialogOpen(true)} variant="outline">
            <Clock className="mr-2 h-4 w-4" /> Edit Flight Hours
          </Button>
          <Button onClick={() => setIsServiceDialogOpen(true)} variant="outline">
            <Settings2 className="mr-2 h-4 w-4" /> Edit Service
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="p-4 pb-2"><CardDescription className="text-[10px] font-bold uppercase">Current Hobbs</CardDescription></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-bold">{aircraft.currentHobbs?.toFixed(1)}h</p></CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="p-4 pb-2"><CardDescription className="text-[10px] font-bold uppercase">Current Tacho</CardDescription></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-bold">{aircraft.currentTacho?.toFixed(1)}h</p></CardContent>
        </Card>
        <Card className={cn(remaining50 < 10 ? "bg-destructive/10 border-destructive/20" : "bg-muted")}>
          <CardHeader className="p-4 pb-2"><CardDescription className="text-[10px] font-bold uppercase">Next 50hr Inspection</CardDescription></CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold">{aircraft.tachoAtNext50Inspection?.toFixed(1)}h</p>
            <p className="text-[10px] text-muted-foreground">({remaining50.toFixed(1)}h remaining)</p>
          </CardContent>
        </Card>
        <Card className={cn(remaining100 < 10 ? "bg-destructive/10 border-destructive/20" : "bg-muted")}>
          <CardHeader className="p-4 pb-2"><CardDescription className="text-[10px] font-bold uppercase">Next 100hr Inspection</CardDescription></CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold">{aircraft.tachoAtNext100Inspection?.toFixed(1)}h</p>
            <p className="text-[10px] text-muted-foreground">({remaining100.toFixed(1)}h remaining)</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="components" className="w-full">
        <div className="border rounded-xl overflow-hidden bg-card">
          <TabsList className="w-full justify-start rounded-none h-12 bg-muted/30 border-b p-0">
            <TabsTrigger value="components" className="rounded-none h-full px-6 data-[state=active]:bg-background border-r">Tracked Components</TabsTrigger>
            <TabsTrigger value="maintenance" className="rounded-none h-full px-6 data-[state=active]:bg-background">Maintenance History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="components" className="m-0 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold">Tracked Components</h3>
                <p className="text-sm text-muted-foreground">Monitoring service life limits for critical parts.</p>
              </div>
              <Button onClick={() => { setEditingComp(null); setIsCompDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Component
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Serial No.</TableHead>
                  <TableHead className="text-right">TSN</TableHead>
                  <TableHead className="text-right">Max Hours</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {components?.map(comp => {
                  const remaining = (comp.maxHours || 0) - (comp.tsn || 0);
                  return (
                    <TableRow key={comp.id}>
                      <TableCell>
                        <p className="font-medium">{comp.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{comp.manufacturer} • {comp.partNumber}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                      <TableCell className="text-right font-mono">{comp.tsn?.toFixed(1)}h</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{comp.maxHours?.toFixed(1)}h</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={remaining < 25 ? "destructive" : "secondary"} className="font-bold font-mono">
                          {remaining.toFixed(1)}h
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingComp(comp); setIsCompDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDocumentNonBlocking(doc(firestore!, aircraftRef!.path, 'components', comp.id))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="maintenance" className="m-0 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold">Maintenance History</h3>
                <p className="text-sm text-muted-foreground">Certified record of all work performed on this aircraft.</p>
              </div>
              <Button onClick={() => setIsMaintenanceDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Maintenance Log
              </Button>
            </div>
            <div className="space-y-4">
              {maintenanceLogs?.map(log => (
                <div key={log.id} className="p-4 border rounded-lg bg-background flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{log.maintenanceType}</p>
                      <Badge variant="outline" className="text-[10px]">{format(new Date(log.date), 'dd MMM yyyy')}</Badge>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{log.details}</p>
                    <div className="flex gap-4 text-[10px] text-muted-foreground uppercase font-bold pt-2">
                      <span>Ref: {log.reference || 'N/A'}</span>
                      <span>AME: {log.ameNo}</span>
                      <span>AMO: {log.amoNo}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={isHourDialogOpen} onOpenChange={setIsHourDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Flight Hours</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdateHours} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Hobbs</Label>
                <Input name="hobbs" type="number" step="0.1" defaultValue={aircraft.currentHobbs} />
              </div>
              <div className="space-y-2">
                <Label>Current Tacho</Label>
                <Input name="tacho" type="number" step="0.1" defaultValue={aircraft.currentTacho} />
              </div>
            </div>
            <DialogFooter><Button type="submit">Save Hours</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Service Targets</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdateService} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tacho at Next 50hr Inspection</Label>
              <Input name="next50" type="number" step="0.1" defaultValue={aircraft.tachoAtNext50Inspection} />
            </div>
            <div className="space-y-2">
              <Label>Tacho at Next 100hr Inspection</Label>
              <Input name="next100" type="number" step="0.1" defaultValue={aircraft.tachoAtNext100Inspection} />
            </div>
            <DialogFooter><Button type="submit">Save Targets</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCompDialogOpen} onOpenChange={setIsCompDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingComp ? 'Edit' : 'Add'} Tracked Component</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveComponent} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Component Name</Label><Input name="name" defaultValue={editingComp?.name} required /></div>
              <div className="space-y-2"><Label>Manufacturer</Label><Input name="manufacturer" defaultValue={editingComp?.manufacturer} /></div>
              <div className="space-y-2"><Label>Part Number</Label><Input name="partNumber" defaultValue={editingComp?.partNumber} /></div>
              <div className="space-y-2"><Label>Serial Number</Label><Input name="serialNumber" defaultValue={editingComp?.serialNumber} /></div>
              <div className="space-y-2"><Label>Current TSN</Label><Input name="tsn" type="number" step="0.1" defaultValue={editingComp?.tsn} required /></div>
              <div className="space-y-2"><Label>Max Hours (Life Limit)</Label><Input name="maxHours" type="number" step="0.1" defaultValue={editingComp?.maxHours} required /></div>
            </div>
            <DialogFooter><Button type="submit">Save Component</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isMaintDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Maintenance Entry</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveMaintenance} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Maintenance Type</Label>
              <Input name="type" placeholder="e.g., 50hr Inspection, Engine Oil Change" required />
            </div>
            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea name="details" placeholder="Describe work performed..." required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Engineer License No.</Label>
                <Input name="ameNo" required />
              </div>
              <div className="space-y-2">
                <Label>AMO Number</Label>
                <Input name="amoNo" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input name="reference" placeholder="Job card or certificate reference" />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full">Certify & Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
