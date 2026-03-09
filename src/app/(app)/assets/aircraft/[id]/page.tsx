
'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Settings2, 
  Clock, 
  PlusCircle, 
  Trash2, 
  FileText, 
  Wrench, 
  Activity, 
  View,
  History,
  CalendarIcon
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { DocumentUploader } from '@/components/document-uploader';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const CompactStat = ({ label, value, subValue, colorClass }: { label: string, value: string | number, subValue?: string, colorClass?: string }) => (
  <Card className="flex-1 min-w-[140px] shadow-none border bg-card/50">
    <CardHeader className="p-3 pb-0 space-y-0">
      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</p>
    </CardHeader>
    <CardContent className="p-3 pt-1 flex items-baseline gap-2">
      <span className={cn("text-lg font-bold font-mono", colorClass)}>{value}</span>
      {subValue && <span className="text-[10px] text-muted-foreground font-medium">{subValue}</span>}
    </CardContent>
  </Card>
);

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const aircraftId = resolvedParams.id;
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const [isEditHoursOpen, setIsEditHoursOpen] = useState(false);
  const [isEditServiceOpen, setIsEditServiceOpen] = useState(false);
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [isAddCompOpen, setIsAddCompOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`)) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAc } = useDoc<Aircraft>(aircraftRef);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);
  const { data: components, isLoading: isLoadingComps } = useCollection<AircraftComponent>(componentsQuery);

  const isLoading = isLoadingAc || isLoadingLogs || isLoadingComps;

  const handleUpdateHours = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const hobbs = parseFloat(formData.get('currentHobbs') as string);
    const tacho = parseFloat(formData.get('currentTacho') as string);

    if (aircraftRef) {
      updateDocumentNonBlocking(aircraftRef, { currentHobbs: hobbs, currentTacho: tacho });
      toast({ title: 'Hours Updated' });
      setIsEditHoursOpen(false);
    }
  };

  const handleUpdateService = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const t50 = parseFloat(formData.get('next50') as string);
    const t100 = parseFloat(formData.get('next100') as string);

    if (aircraftRef) {
      updateDocumentNonBlocking(aircraftRef, { tachoAtNext50Inspection: t50, tachoAtNext100Inspection: t100 });
      toast({ title: 'Service Targets Updated' });
      setIsEditServiceOpen(false);
    }
  };

  const handleAddLog = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const logData = {
      aircraftId,
      date: formData.get('date') as string,
      maintenanceType: formData.get('type') as string,
      details: formData.get('details') as string,
      ameNo: formData.get('ame') as string,
      amoNo: formData.get('amo') as string,
      reference: formData.get('ref') as string,
    };

    const logsRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(logsRef, logData);
    toast({ title: 'Log Entry Added' });
    setIsAddLogOpen(false);
  };

  const handleAddDocument = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    if (!aircraftRef || !aircraft) return;
    const currentDocs = aircraft.documents || [];
    updateDocumentNonBlocking(aircraftRef, { documents: [...currentDocs, docDetails] });
    toast({ title: 'Document Added' });
  };

  const handleDeleteDocument = (docName: string) => {
    if (!aircraftRef || !aircraft) return;
    const filteredDocs = (aircraft.documents || []).filter(d => d.name !== docName);
    updateDocumentNonBlocking(aircraftRef, { documents: filteredDocs });
    toast({ title: 'Document Removed' });
  };

  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };

  if (isLoading) return <Skeleton className="h-[600px] w-full" />;
  if (!aircraft) return <div className="text-center py-12">Aircraft not found.</div>;

  const hoursRemaining50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const hoursRemaining100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Fleet</Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
        </div>
        <div className="flex gap-2">
          <Dialog open={isEditHoursOpen} onOpenChange={setIsEditHoursOpen}>
            <DialogTrigger asChild><Button variant="outline" size="sm"><Clock className="mr-2 h-4 w-4" /> Edit Flight Hours</Button></DialogTrigger>
            <DialogContent>
              <form onSubmit={handleUpdateHours}>
                <DialogHeader><DialogTitle>Update Meter Readings</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2"><Label htmlFor="currentHobbs">Current Hobbs</Label><Input id="currentHobbs" name="currentHobbs" type="number" step="0.1" defaultValue={aircraft.currentHobbs} /></div>
                  <div className="grid gap-2"><Label htmlFor="currentTacho">Current Tachometer</Label><Input id="currentTacho" name="currentTacho" type="number" step="0.1" defaultValue={aircraft.currentTacho} /></div>
                </div>
                <DialogFooter><Button type="submit">Save Changes</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditServiceOpen} onOpenChange={setIsEditServiceOpen}>
            <DialogTrigger asChild><Button variant="outline" size="sm"><Settings2 className="mr-2 h-4 w-4" /> Edit Service</Button></DialogTrigger>
            <DialogContent>
              <form onSubmit={handleUpdateService}>
                <DialogHeader><DialogTitle>Service Targets</DialogTitle><DialogDescription>Set next Tachometer readings for inspection intervals.</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2"><Label htmlFor="next50">Next 50 Hour (Tacho)</Label><Input id="next50" name="next50" type="number" step="0.1" defaultValue={aircraft.tachoAtNext50Inspection} /></div>
                  <div className="grid gap-2"><Label htmlFor="next100">Next 100 Hour (Tacho)</Label><Input id="next100" name="next100" type="number" step="0.1" defaultValue={aircraft.tachoAtNext100Inspection} /></div>
                </div>
                <DialogFooter><Button type="submit">Update Targets</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <CompactStat label="Initial Hobbs" value={aircraft.initialHobbs?.toFixed(1) || '0.0'} />
        <CompactStat label="Initial Tacho" value={aircraft.initialTacho?.toFixed(1) || '0.0'} />
        <CompactStat label="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1) || '0.0'} />
        <CompactStat label="Current Tacho" value={aircraft.currentTacho?.toFixed(1) || '0.0'} />
        <CompactStat label="Next 50hr" value={aircraft.tachoAtNext50Inspection?.toFixed(1) || 'N/A'} subValue={`${hoursRemaining50.toFixed(1)} left`} colorClass="text-blue-600" />
        <CompactStat label="Next 100hr" value={aircraft.tachoAtNext100Inspection?.toFixed(1) || 'N/A'} subValue={`${hoursRemaining100.toFixed(1)} left`} colorClass="text-orange-600" />
      </div>

      <Tabs defaultValue="components" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0">
          <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Tracked Components</TabsTrigger>
          <TabsTrigger value="history" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Maintenance History</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Documents</TabsTrigger>
        </TabsList>

        <Card className="rounded-xl shadow-none">
          <TabsContent value="components" className="m-0 p-6">
            <div className="flex justify-between items-center mb-6">
              <div><h3 className="text-xl font-bold">Tracked Components</h3><p className="text-sm text-muted-foreground">Monitor life-limited parts and periodic components.</p></div>
              <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Component</TableHead><TableHead>Serial No.</TableHead><TableHead className="text-right">Hours Since New</TableHead><TableHead className="text-right">Hours Remaining</TableHead></TableRow></TableHeader>
              <TableBody>
                {components?.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.serialNumber}</TableCell>
                    <TableCell className="text-right font-mono">{c.tsn?.toFixed(1)}</TableCell>
                    <TableCell className="text-right font-mono">{(c.maxHours - c.tsn).toFixed(1)}</TableCell>
                  </TableRow>
                ))}
                {(!components || components.length === 0) && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No components being tracked.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="history" className="m-0 p-6">
            <div className="flex justify-between items-center mb-6">
              <div><h3 className="text-xl font-bold">Maintenance History</h3><p className="text-sm text-muted-foreground">Log of all certified maintenance actions.</p></div>
              <Dialog open={isAddLogOpen} onOpenChange={setIsAddLogOpen}>
                <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Entry</Button></DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <form onSubmit={handleAddLog}>
                    <DialogHeader><DialogTitle>New Maintenance Entry</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="grid gap-2"><Label>Date</Label><Input type="date" name="date" required /></div>
                      <div className="grid gap-2"><Label>Type</Label><Input name="type" placeholder="e.g., 50hr Inspection" required /></div>
                      <div className="grid gap-2 col-span-2"><Label>Work Details</Label><Textarea name="details" required /></div>
                      <div className="grid gap-2"><Label>AME License No.</Label><Input name="ame" required /></div>
                      <div className="grid gap-2"><Label>AMO Number</Label><Input name="amo" required /></div>
                      <div className="grid gap-2 col-span-2"><Label>Reference / Release</Label><Input name="ref" placeholder="e.g., Form 1 #12345" required /></div>
                    </div>
                    <DialogFooter><Button type="submit">Certify Entry</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
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
                    <TableCell className="font-mono text-xs">{log.ameNo}</TableCell>
                    <TableCell className="font-mono text-xs">{log.amoNo}</TableCell>
                    <TableCell className="font-mono text-xs">{log.reference}</TableCell>
                  </TableRow>
                ))}
                {(!logs || logs.length === 0) && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No maintenance logs recorded.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="documents" className="m-0 p-6">
            <div className="flex justify-between items-center mb-6">
              <div><h3 className="text-xl font-bold">Aircraft Documentation</h3><p className="text-sm text-muted-foreground">C of A, Insurance, and other technical certificates.</p></div>
              <DocumentUploader
                onDocumentUploaded={handleAddDocument}
                trigger={(open) => <Button variant="outline" size="sm" onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aircraft.documents?.map((doc) => (
                <Card key={doc.name} className="shadow-none border bg-muted/10">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-muted rounded-md"><FileText className="h-4 w-4 text-muted-foreground" /></div>
                        <div><CardTitle className="text-sm">{doc.name}</CardTitle><p className="text-[10px] text-muted-foreground">Uploaded: {format(new Date(doc.uploadDate), 'MMMM do, yyyy')}</p></div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteDocument(doc.name)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <Button variant="secondary" className="w-full text-xs" onClick={() => handleViewImage(doc.url)}><View className="mr-2 h-3 w-3" /> View Document</Button>
                  </CardContent>
                </Card>
              ))}
              {(!aircraft.documents || aircraft.documents.length === 0) && <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">No documents uploaded.</div>}
            </div>
          </TabsContent>
        </Card>
      </Tabs>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          {viewingImageUrl && <div className="relative h-[80vh] w-full"><Image src={viewingImageUrl} alt="Document" fill className="object-contain" /></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
