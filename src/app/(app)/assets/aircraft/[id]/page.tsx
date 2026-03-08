
'use client';

import { use, useState, useMemo, useEffect } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  PlusCircle, 
  Wrench, 
  History, 
  Settings2, 
  ArrowLeft, 
  Pencil, 
  FileText,
  Clock,
  CheckCircle2,
  CalendarDays,
  Trash2,
  Upload,
  View
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter, 
  DialogClose 
} from '@/components/ui/dialog';
import { DocumentUploader } from '@/components/document-uploader';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const aircraftId = resolvedParams.id;
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components'), orderBy('name')) : null),
    [firestore, aircraftId]
  );

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'maintenanceLogs'), orderBy('date', 'desc')) : null),
    [firestore, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  // --- Manual Override States ---
  const [editHoursData, setEditHoursData] = useState({ hobbs: 0, tacho: 0 });
  const [editServiceData, setEditServiceData] = useState({ next50: 0, next100: 0 });

  useEffect(() => {
    if (aircraft) {
      setEditHoursData({ 
        hobbs: aircraft.currentHobbs || 0, 
        tacho: aircraft.currentTacho || 0 
      });
      setEditServiceData({ 
        next50: aircraft.tachoAtNext50Inspection || 0, 
        next100: aircraft.tachoAtNext100Inspection || 0 
      });
    }
  }, [aircraft]);

  const handleUpdateHours = () => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, {
      currentHobbs: Number(editHoursData.hobbs),
      currentTacho: Number(editHoursData.tacho)
    });
    toast({ title: "Flight Hours Updated" });
  };

  const handleUpdateService = () => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, {
      tachoAtNext50Inspection: Number(editServiceData.next50),
      tachoAtNext100Inspection: Number(editServiceData.next100)
    });
    toast({ title: "Service Targets Updated" });
  };

  // --- Documents Logic ---
  const handleDocumentUpdate = (updatedDocuments: any[]) => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocuments });
  };

  const onDocumentUploaded = (docDetails: any) => {
    const currentDocs = aircraft?.documents || [];
    handleDocumentUpdate([...currentDocs, docDetails]);
  };

  const handleDocumentDelete = (docName: string) => {
    const currentDocs = aircraft?.documents || [];
    handleDocumentUpdate(currentDocs.filter(d => d.name !== docName));
    toast({ title: "Document Deleted" });
  };

  const handleExpirationDateChange = (docName: string, date: Date | undefined) => {
    const currentDocs = aircraft?.documents || [];
    const updated = currentDocs.map(d => 
      d.name === docName ? { ...d, expirationDate: date ? date.toISOString() : null } : d
    );
    handleDocumentUpdate(updated);
  };

  if (isLoadingAircraft) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  const rem50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const rem100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/assets/aircraft"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Edit Service Targets */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Settings2 className="h-4 w-4" /> Edit Service
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
                  <Input 
                    type="number" 
                    step="0.1" 
                    value={editServiceData.next50} 
                    onChange={e => setEditServiceData(prev => ({ ...prev, next50: Number(e.target.value) }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Next 100-Hour Inspection (Tacho)</Label>
                  <Input 
                    type="number" 
                    step="0.1" 
                    value={editServiceData.next100} 
                    onChange={e => setEditServiceData(prev => ({ ...prev, next100: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button onClick={handleUpdateService}>Update Targets</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Flight Hours */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Clock className="h-4 w-4" /> Edit Flight Hours
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Flight Hours</DialogTitle>
                <DialogDescription>Manually override current meter readings.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Current Hobbs</Label>
                  <Input 
                    type="number" 
                    step="0.1" 
                    value={editHoursData.hobbs} 
                    onChange={e => setEditHoursData(prev => ({ ...prev, hobbs: Number(e.target.value) }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Current Tachometer</Label>
                  <Input 
                    type="number" 
                    step="0.1" 
                    value={editHoursData.tacho} 
                    onChange={e => setEditHoursData(prev => ({ ...prev, tacho: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button onClick={handleUpdateHours}>Save Readings</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Fleet Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Current Hobbs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(aircraft.currentHobbs || 0).toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Current Tacho</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(aircraft.currentTacho || 0).toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Next 50hr</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", rem50 < 10 ? "text-destructive" : "text-primary")}>
              {rem50.toFixed(1)}h <span className="text-sm font-normal text-muted-foreground">rem.</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Next 100hr</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", rem100 < 15 ? "text-destructive" : "text-primary")}>
              {rem100.toFixed(1)}h <span className="text-sm font-normal text-muted-foreground">rem.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Technical Tabs */}
      <Tabs defaultValue="components" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-0 border-b-0">
          <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <Wrench className="h-4 w-4" /> Tracked Components
          </TabsTrigger>
          <TabsTrigger value="logs" className="rounded-full px-6 py-2 border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <History className="h-4 w-4" /> Maintenance History
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <FileText className="h-4 w-4" /> Documents
          </TabsTrigger>
        </TabsList>

        <div className="border rounded-xl bg-card overflow-hidden mt-4">
          <TabsContent value="components" className="m-0">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">Life Limited Components</h3>
                <AddComponentDialog aircraftId={aircraftId} tenantId={tenantId} />
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead>Component Name</TableHead>
                    <TableHead>Part No.</TableHead>
                    <TableHead>Serial No.</TableHead>
                    <TableHead className="text-right">TSN</TableHead>
                    <TableHead className="text-right">TBO</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components?.map(comp => {
                    const remaining = (comp.maxHours || 0) - (comp.tsn || 0);
                    return (
                      <TableRow key={comp.id}>
                        <TableCell className="font-bold">{comp.name}</TableCell>
                        <TableCell className="text-muted-foreground">{comp.partNumber}</TableCell>
                        <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                        <TableCell className="text-right">{(comp.tsn || 0).toFixed(1)}h</TableCell>
                        <TableCell className="text-right text-muted-foreground">{(comp.maxHours || 0).toFixed(1)}h</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={remaining < 50 ? 'destructive' : 'secondary'} className="font-bold">
                            {remaining.toFixed(1)}h
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <EditComponentDialog component={comp} aircraftId={aircraftId} tenantId={tenantId} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!components || components.length === 0) && (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No life-limited components tracked.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="logs" className="m-0">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">Certification Records</h3>
                <AddLogDialog aircraftId={aircraftId} tenantId={tenantId} />
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead>Date</TableHead>
                    <TableHead>Maintenance Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>AME No.</TableHead>
                    <TableHead>AMO No.</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {log.date ? format(new Date(log.date), 'dd MMM yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>{log.maintenanceType}</TableCell>
                      <TableCell className="max-w-[300px] truncate" title={log.details}>{log.details}</TableCell>
                      <TableCell className="font-mono text-xs">{log.ameNo}</TableCell>
                      <TableCell className="font-mono text-xs">{log.amoNo}</TableCell>
                      <TableCell className="text-muted-foreground">{log.reference}</TableCell>
                    </TableRow>
                  ))}
                  {(!logs || logs.length === 0) && (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No maintenance logs recorded.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="m-0">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">Aircraft Documents</h3>
                <DocumentUploader
                  onDocumentUploaded={onDocumentUploaded}
                  trigger={(open) => (
                    <Button onClick={() => open()} className="gap-2">
                      <PlusCircle className="h-4 w-4" /> Add Document
                    </Button>
                  )}
                />
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead>Document Name</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead className="text-center">Set Expiry</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aircraft.documents?.map(doc => (
                    <TableRow key={doc.name}>
                      <TableCell className="font-bold">{doc.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.uploadDate ? format(new Date(doc.uploadDate), 'dd MMM yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {doc.expirationDate ? (
                          <Badge variant="outline" className="gap-2">
                            <CalendarDays className="h-3 w-3" />
                            {format(new Date(doc.expirationDate), 'dd MMM yyyy')}
                          </Badge>
                        ) : 'No Expiry'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8">
                              <CalendarDays className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CustomCalendar
                              selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined}
                              onDateSelect={(date) => handleExpirationDateChange(doc.name, date)}
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                              <View className="h-4 w-4 mr-2" /> View
                            </a>
                          </Button>
                          <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDocumentDelete(doc.name)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!aircraft.documents || aircraft.documents.length === 0) && (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No documents uploaded.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// --- Modals ---

function AddComponentDialog({ aircraftId, tenantId }: { aircraftId: string, tenantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: '', partNumber: '', serialNumber: '', tsn: 0, maxHours: 0 });

  const handleSave = () => {
    if (!firestore) return;
    const colRef = collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components');
    addDocumentNonBlocking(colRef, { ...formData, tsn: Number(formData.tsn), maxHours: Number(formData.maxHours) });
    toast({ title: "Component Added" });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gap-2"><PlusCircle className="h-4 w-4" /> Add Component</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Track New Component</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2"><Label>Component Name</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2"><Label>Part Number</Label><Input value={formData.partNumber} onChange={e => setFormData({...formData, partNumber: e.target.value})} /></div>
            <div className="grid gap-2"><Label>Serial Number</Label><Input value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2"><Label>TSN (Hours)</Label><Input type="number" value={formData.tsn} onChange={e => setFormData({...formData, tsn: Number(e.target.value)})} /></div>
            <div className="grid gap-2"><Label>Max Hours (TBO)</Label><Input type="number" value={formData.maxHours} onChange={e => setFormData({...formData, maxHours: Number(e.target.value)})} /></div>
          </div>
        </div>
        <DialogFooter><DialogClose asChild><Button onClick={handleSave}>Track Component</Button></DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditComponentDialog({ component, aircraftId, tenantId }: { component: AircraftComponent, aircraftId: string, tenantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [formData, setFormData] = useState({ ...component });

  const handleSave = () => {
    if (!firestore) return;
    const docRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components', component.id);
    updateDocumentNonBlocking(docRef, { ...formData, tsn: Number(formData.tsn), maxHours: Number(formData.maxHours) });
    toast({ title: "Component Updated" });
  };

  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Component</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2"><Label>Component Name</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2"><Label>TSN (Hours)</Label><Input type="number" value={formData.tsn} onChange={e => setFormData({...formData, tsn: Number(e.target.value)})} /></div>
            <div className="grid gap-2"><Label>Max Hours (TBO)</Label><Input type="number" value={formData.maxHours} onChange={e => setFormData({...formData, maxHours: Number(e.target.value)})} /></div>
          </div>
        </div>
        <DialogFooter><DialogClose asChild><Button onClick={handleSave}>Save Changes</Button></DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddLogDialog({ aircraftId, tenantId }: { aircraftId: string, tenantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [formData, setFormData] = useState({ 
    maintenanceType: '', 
    details: '', 
    ameNo: '', 
    amoNo: '', 
    reference: '', 
    date: new Date().toISOString() 
  });

  const handleSave = () => {
    if (!firestore) return;
    const colRef = collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'maintenanceLogs');
    addDocumentNonBlocking(colRef, formData);
    toast({ title: "Log Entry Created" });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gap-2"><PlusCircle className="h-4 w-4" /> Add Maintenance Log</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader><DialogTitle>New Maintenance Entry</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Maintenance Type</Label>
            <Input placeholder="e.g. 50-Hour Inspection" value={formData.maintenanceType} onChange={e => setFormData({...formData, maintenanceType: e.target.value})} />
          </div>
          <div className="grid gap-2">
            <Label>Details</Label>
            <Textarea 
              placeholder="Full description of work performed..." 
              value={formData.details} 
              onChange={e => setFormData({...formData, details: e.target.value})}
              className="min-h-[120px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Engineer License No. (AME)</Label>
              <Input placeholder="AME-12345" value={formData.ameNo} onChange={e => setFormData({...formData, ameNo: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>AMO Number</Label>
              <Input placeholder="AMO-6789" value={formData.amoNo} onChange={e => setFormData({...formData, amoNo: e.target.value})} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Reference</Label>
            <Input placeholder="e.g. Work Order #99" value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button onClick={handleSave} className="w-full gap-2">
              <CheckCircle2 className="h-4 w-4" /> Certify & Save
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
