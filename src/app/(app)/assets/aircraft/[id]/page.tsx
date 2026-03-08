'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from "date-fns";
import { ArrowLeft, Plus, Pencil, FileText, Settings2, Clock, History, PenLine, FileUp } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import { DocumentUploader } from '@/components/document-uploader';

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
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components')) : null),
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
  const [isCompDialogOpen, setIsCompDialogOpen] = useState(false);

  // Form states
  const [tempHours, setTempHours] = useState({ hobbs: 0, tacho: 0 });
  const [tempService, setTempService] = useState({ next50: 0, next100: 0 });
  const [newLog, setNewLog] = useState<Partial<MaintenanceLog>>({ maintenanceType: '', details: '', reference: '', ameNo: '', amoNo: '' });
  const [newComp, setNewComp] = useState<Partial<AircraftComponent>>({ name: '', partNumber: '', serialNumber: '', tsn: 0, maxHours: 0 });

  const handleUpdateHours = () => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, { currentHobbs: tempHours.hobbs, currentTacho: tempHours.tacho });
    toast({ title: "Flight Hours Updated" });
    setIsHoursDialogOpen(false);
  };

  const handleUpdateService = () => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, { tachoAtNext50Inspection: tempService.next50, tachoAtNext100Inspection: tempService.next100 });
    toast({ title: "Service Targets Updated" });
    setIsServiceDialogOpen(false);
  };

  const handleAddLog = () => {
    if (!firestore || !aircraftId) return;
    const logData = { ...newLog, date: new Date().toISOString(), aircraftId };
    addDocumentNonBlocking(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'maintenanceLogs'), logData);
    toast({ title: "Maintenance Entry Certified" });
    setIsLogDialogOpen(false);
    setNewLog({ maintenanceType: '', details: '', reference: '', ameNo: '', amoNo: '' });
  };

  const handleAddComponent = () => {
    if (!firestore || !aircraftId) return;
    addDocumentNonBlocking(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components'), newComp);
    toast({ title: "Component Tracked" });
    setIsCompDialogOpen(false);
    setNewComp({ name: '', partNumber: '', serialNumber: '', tsn: 0, maxHours: 0 });
  };

  const handleDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    if (!aircraftRef) return;
    const currentDocs = aircraft?.documents || [];
    updateDocumentNonBlocking(aircraftRef, { documents: [...currentDocs, docDetails] });
  };

  if (isLoadingAircraft) return <Skeleton className="h-screen w-full" />;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/assets/aircraft"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isHoursDialogOpen} onOpenChange={setIsHoursDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setTempHours({ hobbs: aircraft.currentHobbs || 0, tacho: aircraft.currentTacho || 0 })}>
                <Clock className="mr-2 h-4 w-4" /> Edit Flight Hours
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Override Flight Hours</DialogTitle>
                <DialogDescription>Manually adjust current meter readings.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Current Hobbs</Label>
                  <Input type="number" step="0.1" value={tempHours.hobbs} onChange={e => setTempHours({...tempHours, hobbs: parseFloat(e.target.value)})} />
                </div>
                <div className="grid gap-2">
                  <Label>Current Tacho</Label>
                  <Input type="number" step="0.1" value={tempHours.tacho} onChange={e => setTempHours({...tempHours, tacho: parseFloat(e.target.value)})} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleUpdateHours}>Save Readings</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setTempService({ next50: aircraft.tachoAtNext50Inspection || 0, next100: aircraft.tachoAtNext100Inspection || 0 })}>
                <Settings2 className="mr-2 h-4 w-4" /> Edit Service
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Service Targets</DialogTitle>
                <DialogDescription>Set next Tachometer readings for inspection intervals.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Next 50-Hour Inspection (Tacho)</Label>
                  <Input type="number" step="0.1" value={tempService.next50} onChange={e => setTempService({...tempService, next50: parseFloat(e.target.value)})} />
                </div>
                <div className="grid gap-2">
                  <Label>Next 100-Hour Inspection (Tacho)</Label>
                  <Input type="number" step="0.1" value={tempService.next100} onChange={e => setTempService({...tempService, next100: parseFloat(e.target.value)})} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleUpdateService}>Update Targets</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Current Hobbs</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{aircraft.currentHobbs?.toFixed(1) || '0.0'}h</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Current Tacho</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{aircraft.currentTacho?.toFixed(1) || '0.0'}h</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Next 50hr</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{((aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0)).toFixed(1)}h<span className="text-xs text-muted-foreground ml-1">rem.</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Next 100hr</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{((aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0)).toFixed(1)}h<span className="text-xs text-muted-foreground ml-1">rem.</span></div></CardContent></Card>
      </div>

      <Card className="rounded-xl border shadow-none overflow-hidden">
        <Tabs defaultValue="components" className="w-full">
          <TabsList className="bg-muted/50 h-auto p-1 gap-1 border-b rounded-none w-full justify-start">
            <TabsTrigger value="components" className="rounded-full px-6 py-2 data-[state=active]:bg-background">Tracked Components</TabsTrigger>
            <TabsTrigger value="history" className="rounded-full px-6 py-2 data-[state=active]:bg-background">Maintenance History</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-full px-6 py-2 data-[state=active]:bg-background">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="components" className="m-0 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Life-Limited Components</h3>
              <Dialog open={isCompDialogOpen} onOpenChange={setIsCompDialogOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Component</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Track New Component</DialogTitle></DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2"><Label>Name</Label><Input value={newComp.name} onChange={e => setNewComp({...newComp, name: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2"><Label>Part No.</Label><Input value={newComp.partNumber} onChange={e => setNewComp({...newComp, partNumber: e.target.value})} /></div>
                      <div className="grid gap-2"><Label>Serial No.</Label><Input value={newComp.serialNumber} onChange={e => setNewComp({...newComp, serialNumber: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2"><Label>Current TSN (h)</Label><Input type="number" step="0.1" value={newComp.tsn} onChange={e => setNewComp({...newComp, tsn: parseFloat(e.target.value)})} /></div>
                      <div className="grid gap-2"><Label>Max Hours (h)</Label><Input type="number" step="0.1" value={newComp.maxHours} onChange={e => setNewComp({...newComp, maxHours: parseFloat(e.target.value)})} /></div>
                    </div>
                  </div>
                  <DialogFooter><Button onClick={handleAddComponent}>Start Tracking</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="border rounded-lg">
              <Table>
                <TableHeader><TableRow className="bg-muted/30"><TableHead>Component</TableHead><TableHead>P/N</TableHead><TableHead>S/N</TableHead><TableHead className="text-right">TSN</TableHead><TableHead className="text-right">Limit</TableHead><TableHead className="text-right">Remaining</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {components?.map(comp => {
                    const remaining = (comp.maxHours || 0) - (comp.tsn || 0);
                    return (
                      <TableRow key={comp.id}>
                        <TableCell className="font-medium">{comp.name}</TableCell>
                        <TableCell>{comp.partNumber}</TableCell>
                        <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                        <TableCell className="text-right">{comp.tsn?.toFixed(1) || '0.0'}h</TableCell>
                        <TableCell className="text-right text-muted-foreground">{comp.maxHours?.toFixed(1) || '0.0'}h</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={remaining < 50 ? 'destructive' : 'secondary'} className="font-bold">{remaining?.toFixed(1) || '0.0'}h</Badge>
                        </TableCell>
                        <TableCell className="text-right"><Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="history" className="m-0 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Maintenance Logs</h3>
              <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
                <DialogTrigger asChild><Button size="sm"><PenLine className="mr-2 h-4 w-4" /> Add Maintenance Entry</Button></DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>New Maintenance Entry</DialogTitle></DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2"><Label>Maintenance Type</Label><Input placeholder="e.g. 50hr Inspection, Unscheduled Repair" value={newLog.maintenanceType} onChange={e => setNewLog({...newLog, maintenanceType: e.target.value})} /></div>
                    <div className="grid gap-2"><Label>Work Performed Details</Label><Textarea className="min-h-32" value={newLog.details} onChange={e => setNewLog({...newLog, details: e.target.value})} /></div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2"><Label>AME No.</Label><Input value={newLog.ameNo} onChange={e => setNewLog({...newLog, ameNo: e.target.value})} /></div>
                      <div className="grid gap-2"><Label>AMO No.</Label><Input value={newLog.amoNo} onChange={e => setNewLog({...newLog, amoNo: e.target.value})} /></div>
                      <div className="grid gap-2"><Label>Reference</Label><Input value={newLog.reference} onChange={e => setNewLog({...newLog, reference: e.target.value})} /></div>
                    </div>
                  </div>
                  <DialogFooter><Button onClick={handleAddLog}>Certify & Save</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="border rounded-lg">
              <Table>
                <TableHeader><TableRow className="bg-muted/30"><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Details</TableHead><TableHead>AME No.</TableHead><TableHead>AMO No.</TableHead><TableHead>Reference</TableHead></TableRow></TableHeader>
                <TableBody>
                  {logs?.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="font-semibold">{log.maintenanceType}</TableCell>
                      <TableCell className="max-w-md truncate" title={log.details}>{log.details}</TableCell>
                      <TableCell>{log.ameNo || '-'}</TableCell>
                      <TableCell>{log.amoNo || '-'}</TableCell>
                      <TableCell>{log.reference || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="m-0 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Aircraft Documents</h3>
              <DocumentUploader 
                onDocumentUploaded={handleDocumentUploaded}
                trigger={(open) => <Button size="sm" onClick={() => open()}><FileUp className="mr-2 h-4 w-4" /> Upload Document</Button>}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aircraft.documents?.map((doc, idx) => (
                <Card key={idx} className="flex flex-row items-center p-4 gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg"><FileText className="h-6 w-6 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">Uploaded {format(new Date(doc.uploadDate), 'PP')}</p>
                  </div>
                  <Button variant="ghost" size="icon" asChild><a href={doc.url} target="_blank" rel="noreferrer"><ArrowLeft className="h-4 w-4 rotate-180" /></a></Button>
                </Card>
              ))}
              {(!aircraft.documents || aircraft.documents.length === 0) && (
                <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">No documents uploaded.</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
