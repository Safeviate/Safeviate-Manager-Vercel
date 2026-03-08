'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { format } from 'date-fns';
import { ArrowLeft, Clock, PenTool, PlusCircle, Settings2, FileText, History, Layers, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import { cn } from '@/lib/utils';
import { DocumentUploader } from '@/components/document-uploader';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  // Real-time Data
  const aircraftRef = useMemoFirebase(() => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null), [firestore, aircraftId]);
  const componentsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components'), orderBy('name')) : null), [firestore, aircraftId]);
  const maintenanceQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'maintenanceLogs'), orderBy('date', 'desc')) : null), [firestore, aircraftId]);

  const { data: aircraft, isLoading: loadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: loadingComponents } = useCollection<AircraftComponent>(componentsQuery);
  const { data: maintenanceLogs, isLoading: loadingLogs } = useCollection<MaintenanceLog>(maintenanceQuery);

  // Form States for Overrides
  const [tempHobbs, setTempHobbs] = useState<number>(0);
  const [tempTacho, setTempTacho] = useState<number>(0);
  const [tempNext50, setTempNext50] = useState<number>(0);
  const [tempNext100, setTempNext100] = useState<number>(0);

  // New Record States
  const [newLog, setNewLog] = useState<Partial<MaintenanceLog>>({ maintenanceType: '', details: '', ameNo: '', amoNo: '', reference: '', date: new Date().toISOString() });
  const [newComp, setNewComp] = useState<Partial<AircraftComponent>>({ name: '', partNumber: '', serialNumber: '', tsn: 0, maxHours: 0 });

  const handleUpdateHours = () => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, { currentHobbs: tempHobbs, currentTacho: tempTacho });
  };

  const handleUpdateService = () => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, { tachoAtNext50Inspection: tempNext50, tachoAtNext100Inspection: tempNext100 });
  };

  const handleAddLog = () => {
    if (!firestore) return;
    const logsCol = collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'maintenanceLogs');
    addDocumentNonBlocking(logsCol, { ...newLog, date: new Date().toISOString() });
    setNewLog({ maintenanceType: '', details: '', ameNo: '', amoNo: '', reference: '' });
  };

  const handleAddComponent = () => {
    if (!firestore) return;
    const compsCol = collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components');
    addDocumentNonBlocking(compsCol, { ...newComp, installDate: new Date().toISOString(), installHours: aircraft?.currentTacho || 0, tso: 0, totalTime: 0 });
    setNewComp({ name: '', partNumber: '', serialNumber: '', tsn: 0, maxHours: 0 });
  };

  const handleDocumentUploaded = (docDetails: any) => {
    if (!aircraftRef) return;
    const currentDocs = aircraft?.documents || [];
    updateDocumentNonBlocking(aircraftRef, { documents: [...currentDocs, docDetails] });
  };

  if (loadingAircraft) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button asChild variant="ghost">
          <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link>
        </Button>
        <div className="flex gap-2">
          {/* Edit Flight Hours Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => { setTempHobbs(aircraft.currentHobbs || 0); setTempTacho(aircraft.currentTacho || 0); }}>
                <Clock className="mr-2 h-4 w-4" /> Edit Flight Hours
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Flight Hours</DialogTitle>
                <DialogDescription>Manually override the current Hobbs and Tachometer readings.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="hobbs" className="text-right">Hobbs</Label>
                  <Input id="hobbs" type="number" step="0.1" value={tempHobbs} onChange={(e) => setTempHobbs(parseFloat(e.target.value))} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tacho" className="text-right">Tacho</Label>
                  <Input id="tacho" type="number" step="0.1" value={tempTacho} onChange={(e) => setTempTacho(parseFloat(e.target.value))} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button onClick={handleUpdateHours}>Save Changes</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Service Targets Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => { setTempNext50(aircraft.tachoAtNext50Inspection || 0); setTempNext100(aircraft.tachoAtNext100Inspection || 0); }}>
                <Settings2 className="mr-2 h-4 w-4" /> Edit Service
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Service Targets</DialogTitle>
                <DialogDescription>Set next Tachometer readings for inspection intervals.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Next 50h</Label>
                  <Input type="number" step="0.1" value={tempNext50} onChange={(e) => setTempNext50(parseFloat(e.target.value))} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Next 100h</Label>
                  <Input type="number" step="0.1" value={tempNext100} onChange={(e) => setTempNext100(parseFloat(e.target.value))} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button onClick={handleUpdateService}>Update Targets</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Current Hobbs</CardDescription><CardTitle className="text-2xl font-bold">{aircraft.currentHobbs?.toFixed(1) || '0.0'}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Current Tacho</CardDescription><CardTitle className="text-2xl font-bold">{aircraft.currentTacho?.toFixed(1) || '0.0'}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 50h Due</CardDescription><CardTitle className="text-2xl font-bold">{(aircraft.tachoAtNext50Inspection || 0).toFixed(1)}</CardTitle><CardDescription className="text-xs">{Math.max(0, (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0)).toFixed(1)}h remaining</CardDescription></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 100h Due</CardDescription><CardTitle className="text-2xl font-bold">{(aircraft.tachoAtNext100Inspection || 0).toFixed(1)}</CardTitle><CardDescription className="text-xs">{Math.max(0, (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0)).toFixed(1)}h remaining</CardDescription></CardHeader></Card>
      </div>

      <Card className="border-none shadow-none bg-transparent">
        <Tabs defaultValue="components" className="w-full">
          <TabsList className="bg-transparent h-auto p-0 gap-2 mb-4 border-b-0">
            <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Tracked Components</TabsTrigger>
            <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Maintenance History</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Documents</TabsTrigger>
          </TabsList>

          <div className="border rounded-xl bg-card overflow-hidden">
            <TabsContent value="components" className="m-0 p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold">Life-Limited Components</h3>
                  <p className="text-sm text-muted-foreground">Monitor service life and replacement intervals.</p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>New Component Tracking</DialogTitle><DialogDescription>Add a new life-limited part to this aircraft.</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2"><Label>Component Name</Label><Input value={newComp.name} onChange={e => setNewComp({...newComp, name: e.target.value})} placeholder="e.g., Magneto (Left)" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Part Number</Label><Input value={newComp.partNumber} onChange={e => setNewComp({...newComp, partNumber: e.target.value})} /></div>
                        <div className="space-y-2"><Label>Serial Number</Label><Input value={newComp.serialNumber} onChange={e => setNewComp({...newComp, serialNumber: e.target.value})} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>TSN (Initial)</Label><Input type="number" step="0.1" value={newComp.tsn} onChange={e => setNewComp({...newComp, tsn: parseFloat(e.target.value)})} /></div>
                        <div className="space-y-2"><Label>Max Hours</Label><Input type="number" step="0.1" value={newComp.maxHours} onChange={e => setNewComp({...newComp, maxHours: parseFloat(e.target.value)})} /></div>
                      </div>
                    </div>
                    <DialogFooter><DialogClose asChild><Button onClick={handleAddComponent}>Add to Registry</Button></DialogClose></DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead>Component Name</TableHead>
                    <TableHead>Part / Serial</TableHead>
                    <TableHead className="text-right">TSN</TableHead>
                    <TableHead className="text-right">Limit</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingComponents ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">Loading technical records...</TableCell></TableRow>
                  ) : (components || []).map((comp) => {
                    const currentTsn = (comp.tsn || 0) + ((aircraft.currentTacho || 0) - (comp.installHours || 0));
                    const remaining = (comp.maxHours || 0) - currentTsn;
                    return (
                      <TableRow key={comp.id}>
                        <TableCell className="font-bold">{comp.name}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{comp.partNumber} / {comp.serialNumber}</TableCell>
                        <TableCell className="text-right">{currentTsn.toFixed(1)}h</TableCell>
                        <TableCell className="text-right text-muted-foreground">{comp.maxHours?.toFixed(1) || '0.0'}h</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={remaining < 50 ? 'destructive' : 'secondary'} className="font-bold">
                            {remaining.toFixed(1)}h
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><PenTool className="h-4 w-4" /></Button>
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
                  <h3 className="text-lg font-bold">Certification History</h3>
                  <p className="text-sm text-muted-foreground">Historical record of all maintenance events.</p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Maintenance Log</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>New Maintenance Entry</DialogTitle><DialogDescription>Certify technical work performed on this aircraft.</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Maintenance Type</Label><Input value={newLog.maintenanceType} onChange={e => setNewLog({...newLog, maintenanceType: e.target.value})} placeholder="e.g., 50h Inspection" /></div>
                        <div className="space-y-2"><Label>Reference</Label><Input value={newLog.reference} onChange={e => setNewLog({...newLog, reference: e.target.value})} placeholder="Job ID / Release No." /></div>
                      </div>
                      <div className="space-y-2"><Label>Work Details</Label><Textarea value={newLog.details} onChange={e => setNewLog({...newLog, details: e.target.value})} placeholder="Comprehensive description of work..." /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>AME Number</Label><Input value={newLog.ameNo} onChange={e => setNewLog({...newLog, ameNo: e.target.value})} placeholder="Engineer License" /></div>
                        <div className="space-y-2"><Label>AMO Number</Label><Input value={newLog.amoNo} onChange={e => setNewLog({...newLog, amoNo: e.target.value})} placeholder="Organization ID" /></div>
                      </div>
                    </div>
                    <DialogFooter><DialogClose asChild><Button onClick={handleAddLog}>Certify & Save</Button></DialogClose></DialogFooter>
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
                  {(maintenanceLogs || []).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="font-semibold">{log.maintenanceType}</TableCell>
                      <TableCell className="max-w-md truncate">{log.details}</TableCell>
                      <TableCell className="text-xs font-mono">{log.ameNo || 'N/A'}</TableCell>
                      <TableCell className="text-xs font-mono">{log.amoNo || 'N/A'}</TableCell>
                      <TableCell className="text-xs font-mono">{log.reference || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                  {!loadingLogs && (!maintenanceLogs || maintenanceLogs.length === 0) && (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No historical records found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="documents" className="m-0 p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold">Aircraft Documents</h3>
                  <p className="text-sm text-muted-foreground">Manage registration, certificates, and insurance.</p>
                </div>
                <DocumentUploader
                  onDocumentUploaded={handleDocumentUploaded}
                  trigger={(open) => (
                    <Button size="sm" onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Upload Document</Button>
                  )}
                />
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead>Document Name</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(aircraft.documents || []).map((doc, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>{format(new Date(doc.uploadDate), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{doc.expirationDate ? format(new Date(doc.expirationDate), 'dd MMM yyyy') : 'No Expiry'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon"><FileText className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(aircraft.documents || []).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No documents uploaded yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
