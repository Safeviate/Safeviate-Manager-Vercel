
'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Pencil, PlusCircle, Settings2, Trash2, View, FileUp, Camera } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DocumentUploader } from '@/components/document-uploader';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const DetailItem = ({ label, value }: { label: string; value: string | number | undefined | null }) => (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value ?? 'N/A'}</p>
    </div>
);

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const aircraftId = resolvedParams.id;
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const { toast } = useToast();

  const [isHourDialogOpen, setIsHourDialogOpen] = useState(false);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [isComponentDialogOpen, setIsComponentDialogOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<any>(aircraftRef);

  const maintenanceQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'maintenanceLogs'), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: maintenanceLogs, isLoading: isLoadingLogs } = useCollection<any>(maintenanceQuery);

  const handleUpdateHours = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updates = {
        currentHobbs: parseFloat(formData.get('hobbs') as string),
        currentTacho: parseFloat(formData.get('tacho') as string),
    };
    updateDocumentNonBlocking(aircraftRef!, updates);
    toast({ title: "Flight Hours Updated" });
    setIsHourDialogOpen(false);
  };

  const handleUpdateService = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updates = {
        tachoAtNext50Inspection: parseFloat(formData.get('next50') as string),
        tachoAtNext100Inspection: parseFloat(formData.get('next100') as string),
    };
    updateDocumentNonBlocking(aircraftRef!, updates);
    toast({ title: "Service Targets Updated" });
    setIsServiceDialogOpen(false);
  };

  const handleAddMaintenance = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const logData = {
        date: new Date(formData.get('date') as string).toISOString(),
        maintenanceType: formData.get('type') as string,
        details: formData.get('details') as string,
        ameNo: formData.get('ameNo') as string,
        amoNo: formData.get('amoNo') as string,
        reference: formData.get('reference') as string,
    };
    const logsRef = collection(firestore!, 'tenants', tenantId, 'aircrafts', aircraftId, 'maintenanceLogs');
    addDocumentNonBlocking(logsRef, logData);
    toast({ title: "Maintenance Certified & Saved" });
    setIsMaintenanceDialogOpen(false);
  };

  const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    const currentDocs = aircraft?.documents || [];
    updateDocumentNonBlocking(aircraftRef!, { documents: [...currentDocs, docDetails] });
  };

  const handleDocumentDelete = (docName: string) => {
    const updatedDocs = (aircraft?.documents || []).filter((d: any) => d.name !== docName);
    updateDocumentNonBlocking(aircraftRef!, { documents: updatedDocs });
    toast({ title: "Document Removed" });
  };

  const handleSetExpiry = (docName: string, date: Date | undefined) => {
    const updatedDocs = (aircraft?.documents || []).map((d: any) => 
        d.name === docName ? { ...d, expirationDate: date?.toISOString() || null } : d
    );
    updateDocumentNonBlocking(aircraftRef!, { documents: updatedDocs });
  };

  if (isLoadingAircraft) return <Skeleton className="h-96 w-full" />;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  const next50Remaining = aircraft.tachoAtNext50Inspection ? (aircraft.tachoAtNext50Inspection - (aircraft.currentTacho || 0)).toFixed(1) : 'N/A';
  const next100Remaining = aircraft.tachoAtNext100Inspection ? (aircraft.tachoAtNext100Inspection - (aircraft.currentTacho || 0)).toFixed(1) : 'N/A';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button asChild variant="ghost">
          <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link>
        </Button>
        <div className="flex gap-2">
          <Dialog open={isHourDialogOpen} onOpenChange={setIsHourDialogOpen}>
            <DialogTrigger asChild><Button variant="outline"><Pencil className="mr-2 h-4 w-4" /> Edit Flight Hours</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Update Flight Hours</DialogTitle></DialogHeader>
              <form onSubmit={handleUpdateHours} className="space-y-4 pt-4">
                <div className="grid gap-2"><Label>Current Hobbs</Label><Input name="hobbs" type="number" step="0.1" defaultValue={aircraft.currentHobbs} /></div>
                <div className="grid gap-2"><Label>Current Tacho</Label><Input name="tacho" type="number" step="0.1" defaultValue={aircraft.currentTacho} /></div>
                <DialogFooter><Button type="submit">Save Hours</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
            <DialogTrigger asChild><Button variant="outline"><Settings2 className="mr-2 h-4 w-4" /> Edit Service</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Service Targets</DialogTitle>
                <DialogDescription>Set next Tachometer readings for inspection intervals.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateService} className="space-y-4 pt-4">
                <div className="grid gap-2"><Label>Next 50-Hour Tacho</Label><Input name="next50" type="number" step="0.1" defaultValue={aircraft.tachoAtNext50Inspection} /></div>
                <div className="grid gap-2"><Label>Next 100-Hour Tacho</Label><Input name="next100" type="number" step="0.1" defaultValue={aircraft.tachoAtNext100Inspection} /></div>
                <DialogFooter><Button type="submit">Save Targets</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>{aircraft.tailNumber}</CardTitle><CardDescription>{aircraft.make} {aircraft.model} • {aircraft.type}</CardDescription></CardHeader>
          <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <DetailItem label="Total Frame" value={`${aircraft.frameHours || 0}h`} />
            <DetailItem label="Total Engine" value={`${aircraft.engineHours || 0}h`} />
            <DetailItem label="Current Hobbs" value={aircraft.currentHobbs} />
            <DetailItem label="Current Tacho" value={aircraft.currentTacho} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Service Status</CardTitle><CardDescription>Hours remaining until next check.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center"><span>Next 50hr</span><Badge variant={parseFloat(next50Remaining) < 10 ? "destructive" : "secondary"}>{next50Remaining}h</Badge></div>
            <div className="flex justify-between items-center"><span>Next 100hr</span><Badge variant={parseFloat(next100Remaining) < 10 ? "destructive" : "secondary"}>{next100Remaining}h</Badge></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="components">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0">
          <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Tracked Components</TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Maintenance History</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Documents</TabsTrigger>
        </TabsList>

        <Card className="rounded-xl overflow-hidden border">
          <TabsContent value="components" className="m-0">
            <div className="p-4 border-b bg-muted/10 flex justify-between items-center">
              <h3 className="font-semibold">Life-Limited Components</h3>
              <Button size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Component</TableHead><TableHead>Serial No.</TableHead><TableHead>Installed</TableHead><TableHead className="text-right">TSN</TableHead><TableHead className="text-right">Remaining</TableHead></TableRow></TableHeader>
              <TableBody>
                {(aircraft.components || []).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.serialNumber}</TableCell>
                    <TableCell>{format(new Date(c.installDate), 'PP')}</TableCell>
                    <TableCell className="text-right">{c.tsn?.toFixed(1) || '0.0'}</TableCell>
                    <TableCell className="text-right">{(c.maxHours - (c.tsn || 0)).toFixed(1)}h</TableCell>
                  </TableRow>
                ))}
                {(!aircraft.components || aircraft.components.length === 0) && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No components being tracked.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="maintenance" className="m-0">
            <div className="p-4 border-b bg-muted/10 flex justify-between items-center">
              <h3 className="font-semibold">Technical Log</h3>
              <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Maintenance Entry</Button></DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>New Maintenance Entry</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddMaintenance} className="grid grid-cols-2 gap-4 pt-4">
                    <div className="grid gap-2"><Label>Date</Label><Input name="date" type="date" required defaultValue={format(new Date(), 'yyyy-MM-dd')} /></div>
                    <div className="grid gap-2"><Label>Maintenance Type</Label><Input name="type" placeholder="e.g., 50hr Inspection" required /></div>
                    <div className="col-span-2 grid gap-2"><Label>Details</Label><Textarea name="details" placeholder="Full description of work performed..." required /></div>
                    <div className="grid gap-2"><Label>Engineer License No. (AME)</Label><Input name="ameNo" required /></div>
                    <div className="grid gap-2"><Label>AMO Number</Label><Input name="amoNo" required /></div>
                    <div className="col-span-2 grid gap-2"><Label>Reference</Label><Input name="reference" placeholder="e.g., Release to Service No." required /></div>
                    <DialogFooter className="col-span-2 mt-4"><Button type="submit">Certify & Save</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Details</TableHead><TableHead>AME No.</TableHead><TableHead>AMO No.</TableHead><TableHead>Reference</TableHead></TableRow></TableHeader>
              <TableBody>
                {maintenanceLogs?.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">{format(new Date(log.date), 'dd MMM yy')}</TableCell>
                    <TableCell>{log.maintenanceType}</TableCell>
                    <TableCell className="max-w-md truncate" title={log.details}>{log.details}</TableCell>
                    <TableCell>{log.ameNo}</TableCell>
                    <TableCell>{log.amoNo}</TableCell>
                    <TableCell>{log.reference}</TableCell>
                  </TableRow>
                ))}
                {(!maintenanceLogs || maintenanceLogs.length === 0) && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No maintenance records found.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="documents" className="m-0">
            <div className="p-4 border-b bg-muted/10 flex justify-between items-center">
              <h3 className="font-semibold">Technical Documents</h3>
              <DocumentUploader
                onDocumentUploaded={onDocumentUploaded}
                trigger={(openDialog) => <Button size="sm" variant="outline" onClick={() => openDialog()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>}
              />
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Document Name</TableHead><TableHead>Expiry</TableHead><TableHead className="text-center">Set Expiry</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {(aircraft.documents || []).map((doc: any) => (
                  <TableRow key={doc.name}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>{doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}</TableCell>
                    <TableCell className="text-center">
                      <Popover>
                        <PopoverTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8"><CalendarIcon className="h-4 w-4" /></Button></PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined} onDateSelect={(date) => handleSetExpiry(doc.name, date)} /></PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => { setViewingImageUrl(doc.url); setIsImageViewerOpen(true); }}><View className="mr-2 h-4 w-4" /> View</Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDocumentDelete(doc.name)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!aircraft.documents || aircraft.documents.length === 0) && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No documents uploaded.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>
        </Card>
      </Tabs>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          {viewingImageUrl && <div className="relative h-[80vh]"><Image src={viewingImageUrl} alt="Document" fill style={{ objectFit: 'contain' }} /></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
