'use client';

import { use, useState } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, History, PenTool, Plus, Settings2, ShieldCheck, Wrench } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';

export default function AircraftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const aircraftId = resolvedParams.id;
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`)) : null),
    [firestore, aircraftId]
  );

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, aircraftId]
  );

  const { data: aircraft, isLoading: loadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: loadingComponents } = useCollection<AircraftComponent>(componentsQuery);
  const { data: logs, isLoading: loadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  // Modal States
  const [isHourDialogOpen, setIsHourDialogOpen] = useState(false);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);

  // Form states
  const [newHobbs, setNewHobbs] = useState('');
  const [newTacho, setNewTacho] = useState('');
  const [next50, setNext50] = useState('');
  const [next100, setNext100] = useState('');

  // Maintenance Log Form
  const [logType, setLogType] = useState('');
  const [logDetails, setLogDetails] = useState('');
  const [logAme, setLogAme] = useState('');
  const [logAmo, setLogAmo] = useState('');
  const [logRef, setLogRef] = useState('');

  if (loadingAircraft) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  const handleUpdateHours = () => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, {
      currentHobbs: parseFloat(newHobbs) || aircraft.currentHobbs,
      currentTacho: parseFloat(newTacho) || aircraft.currentTacho,
    });
    setIsHourDialogOpen(false);
  };

  const handleUpdateService = () => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, {
      tachoAtNext50Inspection: parseFloat(next50) || aircraft.tachoAtNext50Inspection,
      tachoAtNext100Inspection: parseFloat(next100) || aircraft.tachoAtNext100Inspection,
    });
    setIsServiceDialogOpen(false);
  };

  const handleAddLog = () => {
    if (!firestore) return;
    const logsCol = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(logsCol, {
      maintenanceType: logType,
      details: logDetails,
      ameNo: logAme,
      amoNo: logAmo,
      reference: logRef,
      date: new Date().toISOString(),
      aircraftId: aircraft.id,
    });
    // Reset fields
    setLogType('');
    setLogDetails('');
    setLogAme('');
    setLogAmo('');
    setLogRef('');
    setIsLogDialogOpen(false);
  };

  const remaining50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const remaining100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/assets/aircraft"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
              <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none font-bold">HEALTHY</Badge>
            </div>
            <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Edit Flight Hours Dialog */}
          <Dialog open={isHourDialogOpen} onOpenChange={setIsHourDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Clock className="h-4 w-4" /> Edit Flight Hours
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Current Hours</DialogTitle>
                <DialogDescription>Manually override the current engine and frame hour readings.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="hobbs" className="text-right">Hobbs</Label>
                  <Input id="hobbs" type="number" step="0.1" className="col-span-3" defaultValue={aircraft.currentHobbs} onChange={(e) => setNewHobbs(e.target.value)} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tacho" className="text-right">Tacho</Label>
                  <Input id="tacho" type="number" step="0.1" className="col-span-3" defaultValue={aircraft.currentTacho} onChange={(e) => setNewTacho(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleUpdateHours}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Service Targets Dialog */}
          <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Settings2 className="h-4 w-4" /> Edit Service
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Service Intervals</DialogTitle>
                <DialogDescription>Set the target Tacho readings for the next required inspections.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="next50" className="text-right text-xs">Next 50hr</Label>
                  <Input id="next50" type="number" step="0.1" className="col-span-3" defaultValue={aircraft.tachoAtNext50Inspection} onChange={(e) => setNext50(e.target.value)} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="next100" className="text-right text-xs">Next 100hr</Label>
                  <Input id="next100" type="number" step="0.1" className="col-span-3" defaultValue={aircraft.tachoAtNext100Inspection} onChange={(e) => setNext100(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleUpdateService}>Update Targets</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1) || '0.0'} unit="h" icon={Clock} />
        <StatCard title="Current Tacho" value={aircraft.currentTacho?.toFixed(1) || '0.0'} unit="h" icon={History} />
        <StatCard 
          title="Next 50hr Inspection" 
          value={remaining50.toFixed(1)} 
          unit="h remaining" 
          status={remaining50 < 10 ? 'warning' : 'ok'} 
          icon={Wrench}
        />
        <StatCard 
          title="Next 100hr Inspection" 
          value={remaining100.toFixed(1)} 
          unit="h remaining" 
          status={remaining100 < 20 ? 'warning' : 'ok'} 
          icon={ShieldCheck}
        />
      </div>

      {/* Technical Records Section */}
      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <Tabs defaultValue="components" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto bg-muted/30 p-1 border-b rounded-none">
            <TabsTrigger value="components" className="rounded-lg py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm font-semibold transition-all">Tracked Components</TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm font-semibold transition-all">Maintenance History</TabsTrigger>
          </TabsList>

          <TabsContent value="components" className="p-0 m-0">
            <div className="p-4 flex justify-between items-center border-b bg-muted/5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Life-Limited Components</h3>
              <Button size="sm" variant="outline" className="h-8 gap-1">
                <Plus className="h-3 w-3" /> Add Component
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead>Component Name</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead className="text-right">TSN</TableHead>
                  <TableHead className="text-right">Life Limit</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingComponents ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading components...</TableCell></TableRow>
                ) : (components || []).length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No tracked components recorded.</TableCell></TableRow>
                ) : components?.map(comp => {
                  const remaining = (comp.maxHours || 0) - (comp.tsn || 0);
                  return (
                    <TableRow key={comp.id}>
                      <TableCell className="font-semibold">{comp.name}</TableCell>
                      <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                      <TableCell className="text-right">{comp.tsn?.toFixed(1) || '0.0'}h</TableCell>
                      <TableCell className="text-right text-muted-foreground">{comp.maxHours?.toFixed(1) || '0.0'}h</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={remaining < 50 ? 'destructive' : 'secondary'} className="font-bold">
                          {remaining.toFixed(1)}h
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><PenTool className="h-3 w-3" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="history" className="p-0 m-0">
            <div className="p-4 flex justify-between items-center border-b bg-muted/5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Maintenance History</h3>
              
              <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 gap-1">
                    <Plus className="h-3 w-3" /> Add Maintenance Log
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>New Maintenance Entry</DialogTitle>
                    <DialogDescription>Certify work performed on this aircraft.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="logType" className="text-right">Type</Label>
                      <Input id="logType" placeholder="e.g., 50hr Inspection" className="col-span-3" value={logType} onChange={(e) => setLogType(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label htmlFor="logDetails" className="text-right mt-2">Details</Label>
                      <Textarea id="logDetails" placeholder="Work performed..." className="col-span-3 min-h-[120px]" value={logDetails} onChange={(e) => setLogDetails(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="flex flex-col gap-2 col-span-2">
                        <Label htmlFor="logAme" className="text-xs font-bold uppercase">AME No.</Label>
                        <Input id="logAme" placeholder="License #" value={logAme} onChange={(e) => setLogAme(e.target.value)} />
                      </div>
                      <div className="flex flex-col gap-2 col-span-2">
                        <Label htmlFor="logAmo" className="text-xs font-bold uppercase">AMO No.</Label>
                        <Input id="logAmo" placeholder="Org #" value={logAmo} onChange={(e) => setLogAmo(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="logRef" className="text-right">Reference</Label>
                      <Input id="logRef" placeholder="Job card or Invoice #" className="col-span-3" value={logRef} onChange={(e) => setLogRef(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddLog} className="w-full sm:w-auto">Certify & Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
                {loadingLogs ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading logs...</TableCell></TableRow>
                ) : (logs || []).length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No maintenance logs found.</TableCell></TableRow>
                ) : logs?.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap font-medium">{log.date ? format(new Date(log.date), 'dd MMM yyyy') : 'N/A'}</TableCell>
                    <TableCell><Badge variant="outline">{log.maintenanceType}</Badge></TableCell>
                    <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground" title={log.details}>{log.details}</TableCell>
                    <TableCell className="text-xs font-mono">{log.ameNo}</TableCell>
                    <TableCell className="text-xs font-mono">{log.amoNo}</TableCell>
                    <TableCell className="text-xs">{log.reference}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({ title, value, unit, status = 'ok', icon: Icon }: { title: string; value: string; unit: string; status?: 'ok' | 'warning', icon: any }) {
  return (
    <Card className={cn(status === 'warning' && 'border-orange-200 bg-orange-50')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
        <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", status === 'warning' ? 'text-orange-500' : 'text-primary')} />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-[10px] text-muted-foreground">{unit}</p>
      </CardContent>
    </Card>
  );
}
