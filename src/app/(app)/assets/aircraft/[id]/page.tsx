'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, Settings, FileText, Plus, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`), orderBy('name', 'asc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: loadingAc } = useDoc<Aircraft>(aircraftRef);
  const { data: logs, isLoading: loadingLogs } = useCollection<MaintenanceLog>(logsQuery);
  const { data: components, isLoading: loadingComp } = useCollection<AircraftComponent>(componentsQuery);

  // Modal states
  const [isHoursOpen, setIsHoursOpen] = useState(false);
  const [isServiceOpen, setIsServiceOpen] = useState(false);
  const [isComponentOpen, setIsComponentOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);

  // Form states
  const [hoursForm, setHoursOpen] = useState({ hobbs: 0, tacho: 0 });
  const [serviceForm, setServiceForm] = useState({ target50: 0, target100: 0 });
  const [logForm, setLogForm] = useState({ type: '', details: '', ameNo: '', amoNo: '', reference: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    if (aircraft) {
      setHoursOpen({ hobbs: aircraft.currentHobbs || 0, tacho: aircraft.currentTacho || 0 });
      setServiceForm({ target50: aircraft.tachoAtNext50Inspection || 0, target100: aircraft.tachoAtNext100Inspection || 0 });
    }
  }, [aircraft]);

  const handleUpdateHours = () => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, { currentHobbs: hoursForm.hobbs, currentTacho: hoursForm.tacho });
    toast({ title: 'Flight Hours Updated' });
    setIsHoursOpen(false);
  };

  const handleUpdateService = () => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, { tachoAtNext50Inspection: serviceForm.target50, tachoAtNext100Inspection: serviceForm.target100 });
    toast({ title: 'Service Targets Updated' });
    setIsServiceOpen(false);
  };

  const handleAddLog = () => {
    if (!firestore) return;
    const colRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(colRef, { ...logForm, aircraftId });
    toast({ title: 'Maintenance Entry Recorded' });
    setIsLogOpen(false);
  };

  if (loadingAc) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button asChild variant="outline" size="sm">
          <Link href="/assets/aircraft">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsHoursOpen(true)}>
            <Clock className="mr-2 h-4 w-4" /> Edit Flight Hours
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsServiceOpen(true)}>
            <Settings className="mr-2 h-4 w-4" /> Edit Service
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">{aircraft.tailNumber}</CardTitle>
            <CardDescription>{aircraft.make} {aircraft.model} • {aircraft.type}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div><p className="text-xs font-bold text-muted-foreground uppercase">Current Hobbs</p><p className="text-2xl font-mono">{aircraft.currentHobbs?.toFixed(1) || '0.0'}</p></div>
            <div><p className="text-xs font-bold text-muted-foreground uppercase">Current Tacho</p><p className="text-2xl font-mono">{aircraft.currentTacho?.toFixed(1) || '0.0'}</p></div>
            <div><p className="text-xs font-bold text-muted-foreground uppercase">Next 50hr</p><p className="text-2xl font-mono text-primary">{(aircraft.tachoAtNext50Inspection || 0).toFixed(1)}</p></div>
            <div><p className="text-xs font-bold text-muted-foreground uppercase">Next 100hr</p><p className="text-2xl font-mono text-primary">{(aircraft.tachoAtNext100Inspection || 0).toFixed(1)}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Service Status</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">50hr Remaining</span>
              <Badge variant={(aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0) < 10 ? 'destructive' : 'secondary'}>
                {((aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0)).toFixed(1)}h
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">100hr Remaining</span>
              <Badge variant={(aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0) < 10 ? 'destructive' : 'secondary'}>
                {((aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0)).toFixed(1)}h
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border shadow-sm bg-card overflow-hidden">
        <Tabs defaultValue="components" className="w-full">
          <TabsList className="bg-muted/50 h-auto p-4 gap-2 border-b rounded-none w-full justify-start">
            <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Tracked Components</TabsTrigger>
            <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Maintenance History</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="components" className="p-0 m-0">
            <div className="p-4 border-b bg-muted/10 flex justify-between items-center">
              <h3 className="font-semibold">Life-Limited Components</h3>
              <Button size="sm" onClick={() => setIsComponentOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Component</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead>Component Name</TableHead>
                  <TableHead>Serial No.</TableHead>
                  <TableHead className="text-right">TSN</TableHead>
                  <TableHead className="text-right">Life Limit</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {components?.map((comp) => {
                  const remaining = (comp.maxHours || 0) - (comp.tsn || 0);
                  return (
                    <TableRow key={comp.id}>
                      <TableCell className="font-medium">{comp.name}</TableCell>
                      <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                      <TableCell className="text-right">{(comp.tsn || 0).toFixed(1)}h</TableCell>
                      <TableCell className="text-right text-muted-foreground">{(comp.maxHours || 0).toFixed(1)}h</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={remaining < 50 ? 'destructive' : 'secondary'} className="font-bold">
                          {remaining.toFixed(1)}h
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!components || components.length === 0) && (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No life-limited components tracked.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="maintenance" className="p-0 m-0">
            <div className="p-4 border-b bg-muted/10 flex justify-between items-center">
              <h3 className="font-semibold">Certified Maintenance Logs</h3>
              <Button size="sm" onClick={() => setIsLogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Maintenance Entry</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>AME No.</TableHead>
                  <TableHead>AMO No.</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap font-medium">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>{log.maintenanceType}</TableCell>
                    <TableCell className="max-w-md truncate">{log.details}</TableCell>
                    <TableCell className="font-mono text-xs uppercase">{log.ameNo || '-'}</TableCell>
                    <TableCell className="font-mono text-xs uppercase">{log.amoNo || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{log.reference || '-'}</TableCell>
                  </TableRow>
                ))}
                {(!logs || logs.length === 0) && (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No maintenance history recorded.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="documents" className="p-6">
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              <FileText className="mx-auto h-12 w-12 opacity-20 mb-4" />
              <p>Maintenance certificates and digital documentation will appear here.</p>
              <Button variant="outline" className="mt-4">Upload Documents</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <Dialog open={isHoursOpen} onOpenChange={setIsHoursOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Flight Hours</DialogTitle>
            <DialogDescription>Manually override current Hobbs and Tachometer readings.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Current Hobbs</Label><Input type="number" step="0.1" value={hoursForm.hobbs} onChange={(e) => setHoursOpen(p => ({ ...p, hobbs: parseFloat(e.target.value) }))} /></div>
            <div className="grid gap-2"><Label>Current Tacho</Label><Input type="number" step="0.1" value={hoursForm.tacho} onChange={(e) => setHoursOpen(p => ({ ...p, tacho: parseFloat(e.target.value) }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleUpdateHours}>Save Readings</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isServiceOpen} onOpenChange={setIsServiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Service Targets</DialogTitle>
            <DialogDescription>Set next Tachometer readings for inspection intervals.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Next 50hr Target (Tacho)</Label><Input type="number" step="0.1" value={serviceForm.target50} onChange={(e) => setServiceForm(p => ({ ...p, target50: parseFloat(e.target.value) }))} /></div>
            <div className="grid gap-2"><Label>Next 100hr Target (Tacho)</Label><Input type="number" step="0.1" value={serviceForm.target100} onChange={(e) => setServiceForm(p => ({ ...p, target100: parseFloat(e.target.value) }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleUpdateService}>Update Targets</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Maintenance Entry</DialogTitle>
            <DialogDescription>Record and certify completed maintenance work.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="grid gap-2 col-span-2"><Label>Maintenance Type</Label><Input placeholder="e.g., 50hr Inspection, Spark Plug Replacement" value={logForm.type} onChange={(e) => setLogForm(p => ({ ...p, type: e.target.value }))} /></div>
            <div className="grid gap-2 col-span-2"><Label>Work Details</Label><Textarea placeholder="Describe the work performed..." value={logForm.details} onChange={(e) => setLogForm(p => ({ ...p, details: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Engineer License No. (AME)</Label><Input value={logForm.ameNo} onChange={(e) => setLogForm(p => ({ ...p, ameNo: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>AMO Number</Label><Input value={logForm.amoNo} onChange={(e) => setLogForm(p => ({ ...p, amoNo: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Reference / Release No.</Label><Input value={logForm.reference} onChange={(e) => setLogForm(p => ({ ...p, reference: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Date of Completion</Label><Input type="date" value={logForm.date} onChange={(e) => setLogForm(p => ({ ...p, date: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleAddLog}>Certify & Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
