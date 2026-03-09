
'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, Settings2, PlusCircle, Trash2, FileText, Eye, Hammer } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DocumentUploader } from '@/components/document-uploader';
import Image from 'next/image';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const StatusCard = ({ label, value, subValue, colorClass }: { label: string; value: string; subValue?: string; colorClass?: string }) => (
  <Card className="flex-1 min-w-[140px] shadow-none border bg-card/50">
    <CardContent className="p-3">
      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">{label}</p>
      <p className="text-lg font-bold leading-tight">{value}</p>
      {subValue && <p className={cn("text-[10px] font-medium mt-0.5", colorClass)}>{subValue}</p>}
    </CardContent>
  </Card>
);

import { cn } from '@/lib/utils';

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const maintenanceQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`)) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: loadingAc } = useDoc<Aircraft>(aircraftRef);
  const { data: logs, isLoading: loadingLogs } = useCollection<MaintenanceLog>(maintenanceQuery);
  const { data: components, isLoading: loadingComps } = useCollection<AircraftComponent>(componentsQuery);

  const handleUpdateHours = (field: 'currentHobbs' | 'currentTacho', val: string) => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, { [field]: parseFloat(val) || 0 });
  };

  const handleUpdateInspections = (field: 'tachoAtNext50Inspection' | 'tachoAtNext100Inspection', val: string) => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, { [field]: parseFloat(val) || 0 });
  };

  const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    if (!aircraftRef || !aircraft) return;
    const currentDocs = aircraft.documents || [];
    updateDocumentNonBlocking(aircraftRef, { documents: [...currentDocs, docDetails] });
  };

  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };

  if (loadingAc) return <Skeleton className="h-screen w-full" />;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  const hoursTo50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const hoursTo100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/assets/aircraft"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <p className="text-muted-foreground">{aircraft.make} {aircraft.model}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <EditServiceDialog aircraft={aircraft} onUpdate={handleUpdateInspections} />
          <EditHoursDialog aircraft={aircraft} onUpdate={handleUpdateHours} />
        </div>
      </div>

      {/* Reordered Status Row: Initial -> Current -> Inspections */}
      <div className="flex flex-wrap gap-3">
        <StatusCard label="Initial Hobbs" value={aircraft.initialHobbs?.toFixed(1) || '0.0'} />
        <StatusCard label="Initial Tacho" value={aircraft.initialTacho?.toFixed(1) || '0.0'} />
        <StatusCard label="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1) || '0.0'} />
        <StatusCard label="Current Tacho" value={aircraft.currentTacho?.toFixed(1) || '0.0'} />
        <StatusCard 
          label="Next 50hr" 
          value={aircraft.tachoAtNext50Inspection?.toFixed(1) || '0.0'} 
          subValue={`${hoursTo50.toFixed(1)} hrs left`}
          colorClass={hoursTo50 < 5 ? 'text-orange-600' : 'text-blue-600'}
        />
        <StatusCard 
          label="Next 100hr" 
          value={aircraft.tachoAtNext100Inspection?.toFixed(1) || '0.0'} 
          subValue={`${hoursTo100.toFixed(1)} hrs left`}
          colorClass={hoursTo100 < 10 ? 'text-orange-600' : 'text-blue-600'}
        />
      </div>

      <Tabs defaultValue="components" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0">
          <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Tracked Components</TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Maintenance History</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="mt-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tracked Components</CardTitle>
                <CardDescription>Life-limited parts and component times.</CardDescription>
              </div>
              <AddComponentDialog aircraftId={aircraftId} tenantId={tenantId} />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Serial No.</TableHead>
                    <TableHead className="text-right">TSN</TableHead>
                    <TableHead className="text-right">TSO</TableHead>
                    <TableHead className="text-right">Max Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(components || []).map(comp => (
                    <TableRow key={comp.id}>
                      <TableCell className="font-medium">{comp.name}</TableCell>
                      <TableCell>{comp.serialNumber}</TableCell>
                      <TableCell className="text-right font-mono">{comp.tsn?.toFixed(1) || '0.0'}</TableCell>
                      <TableCell className="text-right font-mono">{comp.tso?.toFixed(1) || '0.0'}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{comp.maxHours || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {(!components || components.length === 0) && (
                    <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No tracked components.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Maintenance & Rectification</CardTitle>
                <CardDescription>Historical record of all maintenance actions.</CardDescription>
              </div>
              <AddMaintenanceDialog aircraftId={aircraftId} tenantId={tenantId} />
            </CardHeader>
            <CardContent>
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
                  {(logs || []).map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{log.maintenanceType}</TableCell>
                      <TableCell className="max-w-md truncate">{log.details}</TableCell>
                      <TableCell>{log.ameNo || '-'}</TableCell>
                      <TableCell>{log.amoNo || '-'}</TableCell>
                      <TableCell>{log.reference || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {(!logs || logs.length === 0) && (
                    <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No maintenance records found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Technical Documentation</CardTitle>
                <CardDescription>Airworthiness and registration certificates.</CardDescription>
              </div>
              <DocumentUploader
                onDocumentUploaded={onDocumentUploaded}
                trigger={(open) => (
                  <Button variant="outline" size="sm" onClick={() => open()}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Upload Document
                  </Button>
                )}
              />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(aircraft.documents || []).map((doc, idx) => (
                  <Card key={idx} className="flex flex-col h-full shadow-none border">
                    <CardHeader className="flex-1 pb-2">
                      <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-center mb-2">
                        <FileText className="h-8 w-8 text-primary/60" />
                      </div>
                      <CardTitle className="text-sm mt-2">{doc.name}</CardTitle>
                    </CardHeader>
                    <CardFooter className="mt-auto pt-2">
                      <Button variant="default" size="sm" className="w-full" onClick={() => handleViewImage(doc.url)}>
                        <Eye className="mr-2 h-4 w-4" /> View
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          {viewingImageUrl && (
            <div className="relative h-[80vh] w-full">
              <Image src={viewingImageUrl} alt="Document" fill className="object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Modals ---

function EditHoursDialog({ aircraft, onUpdate }: { aircraft: Aircraft; onUpdate: (field: any, val: string) => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline" size="sm"><Clock className="mr-2 h-4 w-4" /> Edit Flight Hours</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Adjust Flight Hours</DialogTitle><DialogDescription>Manually update current meter readings.</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Current Hobbs</Label>
            <Input type="number" defaultValue={aircraft.currentHobbs} className="col-span-3" onChange={(e) => onUpdate('currentHobbs', e.target.value)} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Current Tacho</Label>
            <Input type="number" defaultValue={aircraft.currentTacho} className="col-span-3" onChange={(e) => onUpdate('currentTacho', e.target.value)} />
          </div>
        </div>
        <DialogFooter><DialogClose asChild><Button>Done</Button></DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditServiceDialog({ aircraft, onUpdate }: { aircraft: Aircraft; onUpdate: (field: any, val: string) => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline" size="sm"><Settings2 className="mr-2 h-4 w-4" /> Edit Service</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Inspection Targets</DialogTitle><DialogDescription>Set Tachometer targets for upcoming maintenance.</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Next 50hr</Label>
            <Input type="number" defaultValue={aircraft.tachoAtNext50Inspection} className="col-span-3" onChange={(e) => onUpdate('tachoAtNext50Inspection', e.target.value)} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Next 100hr</Label>
            <Input type="number" defaultValue={aircraft.tachoAtNext100Inspection} className="col-span-3" onChange={(e) => onUpdate('tachoAtNext100Inspection', e.target.value)} />
          </div>
        </div>
        <DialogFooter><DialogClose asChild><Button>Done</Button></DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddComponentDialog({ aircraftId, tenantId }: { aircraftId: string; tenantId: string }) {
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState({ name: '', serialNumber: '', tsn: '0', tso: '0', maxHours: '' });

  const handleSave = () => {
    if (!firestore) return;
    const colRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`);
    addDocumentNonBlocking(colRef, {
      ...data,
      tsn: parseFloat(data.tsn) || 0,
      tso: parseFloat(data.tso) || 0,
      maxHours: parseInt(data.maxHours) || null,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Tracked Component</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2"><Label>Component Name</Label><Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} /></div>
          <div className="space-y-2"><Label>Serial Number</Label><Input value={data.serialNumber} onChange={(e) => setData({ ...data, serialNumber: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>TSN</Label><Input type="number" value={data.tsn} onChange={(e) => setData({ ...data, tsn: e.target.value })} /></div>
            <div className="space-y-2"><Label>TSO</Label><Input type="number" value={data.tso} onChange={(e) => setData({ ...data, tso: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Life Limit (Hours)</Label><Input type="number" value={data.maxHours} onChange={(e) => setData({ ...data, maxHours: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={handleSave}>Add Component</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddMaintenanceDialog({ aircraftId, tenantId }: { aircraftId: string; tenantId: string }) {
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState({ type: '', details: '', reference: '', ameNo: '', amoNo: '', date: format(new Date(), 'yyyy-MM-dd') });

  const handleSave = () => {
    if (!firestore) return;
    const colRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(colRef, data);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild><Button size="sm"><Hammer className="mr-2 h-4 w-4" /> Log Maintenance</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Maintenance Entry</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2"><Label>Date</Label><Input type="date" value={data.date} onChange={(e) => setData({ ...data, date: e.target.value })} /></div>
          <div className="space-y-2"><Label>Type</Label><Input value={data.type} onChange={(e) => setData({ ...data, type: e.target.value })} /></div>
          <div className="space-y-2"><Label>Work Details</Label><Textarea value={data.details} onChange={(e) => setData({ ...data, details: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>AME No.</Label><Input value={data.ameNo} onChange={(e) => setData({ ...data, ameNo: e.target.value })} /></div>
            <div className="space-y-2"><Label>AMO No.</Label><Input value={data.amoNo} onChange={(e) => setData({ ...data, amoNo: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Reference</Label><Input value={data.reference} onChange={(e) => setData({ ...data, reference: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={handleSave}>Log Entry</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
