
'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, 
  Settings2, 
  Clock, 
  Wrench, 
  FileText, 
  History, 
  PlusCircle,
  FileUp,
  Camera,
  Trash2,
  CalendarIcon,
  View
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DocumentUploader } from '@/components/document-uploader';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const CompactStat = ({ label, value, subValue, colorClass }: { label: string, value: string, subValue?: string, colorClass?: string }) => (
  <Card className={cn("shadow-none border p-3 flex flex-col justify-center", colorClass)}>
    <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1.5">{label}</p>
    <div className="flex items-baseline gap-2">
      <span className="text-lg font-bold font-mono tracking-tight">{value}</span>
      {subValue && <span className="text-[10px] font-semibold opacity-80">{subValue}</span>}
    </div>
  </Card>
);

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const aircraftId = resolvedParams.id;
  const tenantId = 'safeviate';

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const maintenanceQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`) : null),
    [firestore, tenantId, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: loadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: logs, isLoading: loadingLogs } = useCollection<MaintenanceLog>(maintenanceQuery);
  const { data: components, isLoading: loadingComponents } = useCollection<AircraftComponent>(componentsQuery);

  // Form States
  const [newHours, setNewHours] = useState({ hobbs: 0, tacho: 0 });
  const [newTargets, setNewTargets] = useState({ tacho50: 0, tacho100: 0 });

  const handleUpdateHours = () => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, {
      currentHobbs: newHours.hobbs,
      currentTacho: newHours.tacho,
    });
    toast({ title: "Flight Hours Updated" });
  };

  const handleUpdateTargets = () => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, {
      tachoAtNext50Inspection: newTargets.tacho50,
      tachoAtNext100Inspection: newTargets.tacho100,
    });
    toast({ title: "Service Targets Updated" });
  };

  const handleDeleteComponent = (id: string) => {
    const compRef = doc(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`, id);
    deleteDocumentNonBlocking(compRef);
    toast({ title: "Component Deleted" });
  };

  if (loadingAircraft) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  const tacho = aircraft.currentTacho || 0;
  const rem50 = (aircraft.tachoAtNext50Inspection || 0) - tacho;
  const rem100 = (aircraft.tachoAtNext100Inspection || 0) - tacho;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon" className="rounded-full">
            <Link href="/assets/aircraft"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">{aircraft.tailNumber}</h1>
            <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog onOpenChange={(open) => open && setNewHours({ hobbs: aircraft.currentHobbs || 0, tacho: aircraft.currentTacho || 0 })}>
            <DialogTrigger asChild>
              <Button variant="outline"><Clock className="mr-2 h-4 w-4" /> Edit Flight Hours</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Meter Readings</DialogTitle>
                <DialogDescription>Manually adjust the current Hobbs and Tachometer values.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Current Hobbs</Label>
                  <Input type="number" value={newHours.hobbs} onChange={e => setNewHours({ ...newHours, hobbs: parseFloat(e.target.value) })} />
                </div>
                <div className="grid gap-2">
                  <Label>Current Tacho</Label>
                  <Input type="number" value={newHours.tacho} onChange={e => setNewHours({ ...newHours, tacho: parseFloat(e.target.value) })} />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button onClick={handleUpdateHours}>Save Changes</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog onOpenChange={(open) => open && setNewTargets({ tacho50: aircraft.tachoAtNext50Inspection || 0, tacho100: aircraft.tachoAtNext100Inspection || 0 })}>
            <DialogTrigger asChild>
              <Button variant="outline"><Settings2 className="mr-2 h-4 w-4" /> Edit Service</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Service Targets</DialogTitle>
                <DialogDescription>Set next Tachometer readings for inspection intervals.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Next 50hr Tacho</Label>
                  <Input type="number" value={newTargets.tacho50} onChange={e => setNewTargets({ ...newTargets, tacho50: parseFloat(e.target.value) })} />
                </div>
                <div className="grid gap-2">
                  <Label>Next 100hr Tacho</Label>
                  <Input type="number" value={newTargets.tacho100} onChange={e => setNewTargets({ ...newTargets, tacho100: parseFloat(e.target.value) })} />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button onClick={handleUpdateTargets}>Save Changes</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Compact Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <CompactStat label="Current Tacho" value={tacho.toFixed(1)} />
        <CompactStat 
          label="Next 50hr" 
          value={aircraft.tachoAtNext50Inspection?.toFixed(1) || '0.0'} 
          subValue={`${rem50.toFixed(1)} left`}
          colorClass="bg-blue-50/50 border-blue-100"
        />
        <CompactStat 
          label="Next 100hr" 
          value={aircraft.tachoAtNext100Inspection?.toFixed(1) || '0.0'} 
          subValue={`${rem100.toFixed(1)} left`}
          colorClass="bg-orange-50/50 border-orange-100"
        />
        <CompactStat label="Current Hobbs" value={(aircraft.currentHobbs || 0).toFixed(1)} />
        <CompactStat label="Initial Tacho" value={(aircraft.initialTacho || 0).toFixed(1)} />
        <CompactStat label="Initial Hobbs" value={(aircraft.initialHobbs || 0).toFixed(1)} />
      </div>

      <Tabs defaultValue="components" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0">
          <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Tracked Components</TabsTrigger>
          <TabsTrigger value="history" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Maintenance History</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Documents</TabsTrigger>
        </TabsList>

        <Card className="shadow-none border rounded-xl overflow-hidden">
          <TabsContent value="components" className="m-0">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/10">
              <div>
                <CardTitle className="text-lg">Life-Limited Components</CardTitle>
                <CardDescription>Track time-since-new (TSN) and overhaul (TSO) for major components.</CardDescription>
              </div>
              <AddComponentDialog aircraftId={aircraftId} tenantId={tenantId} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component Name</TableHead>
                    <TableHead>Part/Serial No.</TableHead>
                    <TableHead className="text-right">TSN</TableHead>
                    <TableHead className="text-right">TSO</TableHead>
                    <TableHead className="text-right">Limit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components?.map(comp => (
                    <TableRow key={comp.id}>
                      <TableCell className="font-semibold">{comp.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{comp.partNumber} / {comp.serialNumber}</TableCell>
                      <TableCell className="text-right font-mono">{comp.tsn?.toFixed(1) || '0.0'}</TableCell>
                      <TableCell className="text-right font-mono">{comp.tso?.toFixed(1) || '0.0'}</TableCell>
                      <TableCell className="text-right font-mono">{comp.maxHours?.toFixed(1) || '0.0'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteComponent(comp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!components || components.length === 0) && (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No components tracked for this aircraft.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </TabsContent>

          <TabsContent value="history" className="m-0">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/10">
              <div>
                <CardTitle className="text-lg">Technical Log</CardTitle>
                <CardDescription>Chronological record of maintenance activities and inspections.</CardDescription>
              </div>
              <AddMaintenanceDialog aircraftId={aircraftId} tenantId={tenantId} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>AME No.</TableHead>
                    <TableHead>AMO No.</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="font-semibold">{log.maintenanceType}</TableCell>
                      <TableCell className="max-w-md truncate">{log.details}</TableCell>
                      <TableCell className="font-mono text-xs">{log.ameNo || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{log.amoNo || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.reference || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {(!logs || logs.length === 0) && (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No technical records found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </TabsContent>

          <TabsContent value="documents" className="m-0">
            <AircraftDocumentsTab aircraft={aircraft} tenantId={tenantId} />
          </TabsContent>
        </Card>
      </Tabs>
    </div>
  );
}

function AddComponentDialog({ aircraftId, tenantId }: { aircraftId: string, tenantId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState({ name: '', partNumber: '', serialNumber: '', tsn: 0, tso: 0, maxHours: 0 });

  const handleSave = () => {
    const colRef = collection(useFirestore(), `tenants/${tenantId}/aircrafts/${aircraftId}/components`);
    addDocumentNonBlocking(colRef, { ...data, id: uuidv4() });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Tracked Component</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2"><Label>Component Name</Label><Input value={data.name} onChange={e => setData({...data, name: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2"><Label>Part Number</Label><Input value={data.partNumber} onChange={e => setData({...data, partNumber: e.target.value})} /></div>
            <div className="grid gap-2"><Label>Serial Number</Label><Input value={data.serialNumber} onChange={e => setData({...data, serialNumber: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2"><Label>TSN</Label><Input type="number" value={data.tsn} onChange={e => setData({...data, tsn: parseFloat(e.target.value)})} /></div>
            <div className="grid gap-2"><Label>TSO</Label><Input type="number" value={data.tso} onChange={e => setData({...data, tso: parseFloat(e.target.value)})} /></div>
            <div className="grid gap-2"><Label>Life Limit</Label><Input type="number" value={data.maxHours} onChange={e => setData({...data, maxHours: parseFloat(e.target.value)})} /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={handleSave}>Save Component</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddMaintenanceDialog({ aircraftId, tenantId }: { aircraftId: string, tenantId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState({ type: '', details: '', ame: '', amo: '', ref: '', date: new Date().toISOString() });

  const handleSave = () => {
    const colRef = collection(useFirestore(), `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(colRef, { 
      maintenanceType: data.type, 
      details: data.details, 
      ameNo: data.ame, 
      amoNo: data.amo, 
      reference: data.ref, 
      date: data.date,
      id: uuidv4() 
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Maintenance Log</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New Maintenance Entry</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2"><Label>Maintenance Type</Label><Input placeholder="e.g., 50hr Inspection, Unscheduled" value={data.type} onChange={e => setData({...data, type: e.target.value})} /></div>
          <div className="grid gap-2"><Label>Work Performed Details</Label><Textarea value={data.details} onChange={e => setData({...data, details: e.target.value})} className="min-h-32" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2"><Label>AME License No.</Label><Input value={data.ame} onChange={e => setData({...data, ame: e.target.value})} /></div>
            <div className="grid gap-2"><Label>AMO Number</Label><Input value={data.amo} onChange={e => setData({...data, amo: e.target.value})} /></div>
          </div>
          <div className="grid gap-2"><Label>Internal Reference</Label><Input value={data.ref} onChange={e => setData({...data, ref: e.target.value})} /></div>
        </div>
        <DialogFooter><Button onClick={handleSave}>Certify Entry</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AircraftDocumentsTab({ aircraft, tenantId }: { aircraft: Aircraft, tenantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    const currentDocs = aircraft.documents || [];
    const updatedDocs = [...currentDocs, docDetails];
    const acRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(acRef, { documents: updatedDocs });
    toast({ title: "Document Uploaded" });
  };

  const handleDocumentDelete = (name: string) => {
    const currentDocs = aircraft.documents || [];
    const updatedDocs = currentDocs.filter(d => d.name !== name);
    const acRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(acRef, { documents: updatedDocs });
    toast({ title: "Document Removed" });
  };

  const handleExpirationDateChange = (name: string, date: Date | undefined) => {
    const currentDocs = aircraft.documents || [];
    const updatedDocs = currentDocs.map(d => d.name === name ? { ...d, expirationDate: date?.toISOString() || null } : d);
    const acRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(acRef, { documents: updatedDocs });
  };

  return (
    <div className="space-y-6">
      <CardHeader className="flex flex-row items-center justify-between bg-muted/10 border-b">
        <div>
          <CardTitle className="text-lg">Aircraft Certification & Records</CardTitle>
          <CardDescription>C of A, Insurance, and other technical certificates.</CardDescription>
        </div>
        <DocumentUploader
          onDocumentUploaded={onDocumentUploaded}
          trigger={(openDialog) => (
            <Button size="sm" variant="outline" onClick={() => openDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Document
            </Button>
          )}
        />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document Name</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-center">Set Expiry</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aircraft.documents?.map((doc) => (
              <TableRow key={doc.name}>
                <TableCell className="font-medium">{doc.name}</TableCell>
                <TableCell>{doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}</TableCell>
                <TableCell className="text-center">
                  <Popover>
                    <PopoverTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8"><CalendarIcon className="h-4 w-4" /></Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CustomCalendar selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined} onDateSelect={(date) => handleExpirationDateChange(doc.name, date)} />
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => window.open(doc.url, '_blank')}><View className="mr-2 h-4 w-4" /> View</Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDocumentDelete(doc.name)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!aircraft.documents || aircraft.documents.length === 0) && (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No documents uploaded.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </div>
  );
}
