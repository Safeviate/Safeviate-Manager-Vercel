'use client';

import { use, useMemo, useState } from 'react';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { DocumentUploader } from '@/components/document-uploader';
import { format, differenceInDays } from 'date-fns';
import { ArrowLeft, CalendarIcon, PlusCircle, Trash2, View, Wrench, FileText } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';
import type { MaintenanceLog } from '@/types/maintenance';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [isLogActivityOpen, setIsLogActivityOpen] = useState(false);

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  const componentsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);

  const isLoading = isLoadingAircraft || isLoadingLogs || isLoadingComponents;

  const getStatusColor = (expirationDate: string | null | undefined): string | null => {
    if (!expirationDate || !expirySettings) return null;
    const daysUntilExpiry = differenceInDays(new Date(expirationDate), new Date());
    if (daysUntilExpiry < 0) return expirySettings.expiredColor || '#ef4444';
    const sortedPeriods = [...(expirySettings.warningPeriods || [])].sort((a, b) => a.period - b.period);
    for (const warning of sortedPeriods) {
      if (daysUntilExpiry <= warning.period) return warning.color;
    }
    return expirySettings.defaultColor || '#22c55e';
  };

  const handleDocumentUpdate = (updatedDocuments: any[]) => {
    if (aircraftRef) updateDocumentNonBlocking(aircraftRef, { documents: updatedDocuments });
  };

  const onDocumentUploaded = (docDetails: any) => {
    const currentDocs = aircraft?.documents || [];
    const existingIdx = currentDocs.findIndex(d => d.name === docDetails.name);
    let updatedDocs;
    if (existingIdx > -1) {
      updatedDocs = [...currentDocs];
      updatedDocs[existingIdx] = { ...docDetails, expirationDate: updatedDocs[existingIdx].expirationDate };
    } else {
      updatedDocs = [...currentDocs, docDetails];
    }
    handleDocumentUpdate(updatedDocs);
  };

  const handleExpirationDateChange = (docName: string, date: Date | undefined) => {
    const currentDocs = aircraft?.documents || [];
    const updatedDocs = currentDocs.map(d => d.name === docName ? { ...d, expirationDate: date?.toISOString() || null } : d);
    handleDocumentUpdate(updatedDocs);
  };

  const handleDocumentDelete = (docName: string) => {
    const updatedDocs = (aircraft?.documents || []).filter(d => d.name !== docName);
    handleDocumentUpdate(updatedDocs);
  };

  const handleLogActivity = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const logData = {
      maintenanceType: formData.get('maintenanceType') as string,
      date: formData.get('date') as string,
      details: formData.get('details') as string,
      reference: formData.get('reference') as string,
      ameNo: formData.get('ameNo') as string,
      amoNo: formData.get('amoNo') as string,
    };
    if (firestore) {
      addDocumentNonBlocking(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), logData);
      toast({ title: "Maintenance Logged" });
      setIsLogActivityOpen(false);
    }
  };

  const handleAddComponent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const componentData = {
      name: formData.get('name') as string,
      manufacturer: formData.get('manufacturer') as string,
      serialNumber: formData.get('serialNumber') as string,
      installDate: formData.get('installDate') as string,
      tsn: Number(formData.get('tsn')),
      tso: Number(formData.get('tso')),
      totalTime: Number(formData.get('totalTime')),
    };
    if (firestore) {
      addDocumentNonBlocking(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`), componentData);
      toast({ title: "Component Added" });
      setIsAddComponentOpen(false);
    }
  };

  if (isLoading || !aircraft) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;

  const next50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const next100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button asChild variant="outline"><Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Fleet</Link></Button>
        <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber} <span className="text-muted-foreground font-normal">({aircraft.make} {aircraft.model})</span></h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Current Hobbs</CardDescription><CardTitle className="text-2xl font-mono">{(aircraft.currentHobbs || 0).toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Current Tacho</CardDescription><CardTitle className="text-2xl font-mono">{(aircraft.currentTacho || 0).toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 50hr Due</CardDescription><CardTitle className={cn("text-2xl font-mono", next50 < 5 ? "text-destructive" : "")}>{next50.toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 100hr Due</CardDescription><CardTitle className={cn("text-2xl font-mono", next100 < 10 ? "text-destructive" : "")}>{next100.toFixed(1)}</CardTitle></CardHeader></Card>
      </div>

      <Card className="overflow-hidden border-none shadow-lg">
        <Tabs defaultValue="documents">
          <TabsList>
            <TabsTrigger value="documents"><FileText className="mr-2 h-4 w-4" />Documents</TabsTrigger>
            <TabsTrigger value="components"><Wrench className="mr-2 h-4 w-4" />Components</TabsTrigger>
            <TabsTrigger value="maintenance"><Wrench className="mr-2 h-4 w-4" />Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="p-6 pt-2">
            <div className="flex justify-between items-center mb-4">
              <div><CardTitle>Aircraft Documents</CardTitle><CardDescription>Regulatory and lifecycle documentation.</CardDescription></div>
              <DocumentUploader onDocumentUploaded={onDocumentUploaded} trigger={(open) => <Button onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" />Add Document</Button>} />
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Document Name</TableHead><TableHead>Expiration</TableHead><TableHead className="text-center">Set Expiry</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {(aircraft.documents || []).map(doc => {
                  const color = getStatusColor(doc.expirationDate);
                  return (
                    <TableRow key={doc.name}>
                      <TableCell className="font-semibold">{doc.name}</TableCell>
                      <TableCell style={{ color: color || 'inherit' }} className="font-mono font-bold">{doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}</TableCell>
                      <TableCell className="text-center">
                        <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon"><CalendarIcon className="h-4 w-4" /></Button></PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined} onDateSelect={(date) => handleExpirationDateChange(doc.name, date)} /></PopoverContent></Popover>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setViewingImageUrl(doc.url); setIsImageViewerOpen(true); }}><View className="mr-2 h-4 w-4" />View</Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDocumentDelete(doc.name)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="components" className="p-6 pt-2">
            <div className="flex justify-between items-center mb-4">
              <div><CardTitle>Tracked Components</CardTitle><CardDescription>Life-limited and serialised aircraft components.</CardDescription></div>
              <Dialog open={isAddComponentOpen} onOpenChange={setIsAddComponentOpen}>
                <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" />Add Component</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>Add Tracked Component</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddComponent} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Component Name</Label><Input name="name" required /></div>
                      <div className="space-y-2"><Label>Manufacturer</Label><Input name="manufacturer" /></div>
                      <div className="space-y-2"><Label>Serial Number</Label><Input name="serialNumber" /></div>
                      <div className="space-y-2"><Label>Install Date</Label><Input name="installDate" type="date" /></div>
                      <div className="space-y-2"><Label>TSN (Hours)</Label><Input name="tsn" type="number" step="0.1" /></div>
                      <div className="space-y-2"><Label>TSO (Hours)</Label><Input name="tso" type="number" step="0.1" /></div>
                      <div className="space-y-2 col-span-2"><Label>Total Time (Hours)</Label><Input name="totalTime" type="number" step="0.1" /></div>
                    </div>
                    <DialogFooter><Button type="submit">Save Component</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Component</TableHead><TableHead>Manufacturer</TableHead><TableHead>Serial Number</TableHead><TableHead>Install Date</TableHead><TableHead>TSN</TableHead><TableHead>TSO</TableHead><TableHead>Total Time</TableHead></TableRow></TableHeader>
              <TableBody>
                {components?.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold">{c.name}</TableCell>
                    <TableCell>{c.manufacturer}</TableCell>
                    <TableCell className="font-mono">{c.serialNumber}</TableCell>
                    <TableCell>{c.installDate ? format(new Date(c.installDate), 'PP') : 'N/A'}</TableCell>
                    <TableCell className="font-mono">{c.tsn?.toFixed(1)}</TableCell>
                    <TableCell className="font-mono">{c.tso?.toFixed(1)}</TableCell>
                    <TableCell className="font-mono font-bold">{c.totalTime?.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="maintenance" className="p-6 pt-2">
            <div className="flex justify-between items-center mb-4">
              <div><CardTitle>Maintenance Logs</CardTitle><CardDescription>History of all maintenance actions performed.</CardDescription></div>
              <Dialog open={isLogActivityOpen} onOpenChange={setIsLogActivityOpen}>
                <DialogTrigger asChild><Button><Wrench className="mr-2 h-4 w-4" />Log Activity</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>Log Maintenance Activity</DialogTitle></DialogHeader>
                  <form onSubmit={handleLogActivity} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Type</Label><Input name="maintenanceType" placeholder="e.g. 50hr Inspection" required /></div>
                      <div className="space-y-2"><Label>Date</Label><Input name="date" type="date" required /></div>
                      <div className="space-y-2 col-span-2"><Label>Details</Label><Textarea name="details" required /></div>
                      <div className="space-y-2"><Label>Reference</Label><Input name="reference" /></div>
                      <div className="space-y-2"><Label>AME No</Label><Input name="ameNo" /></div>
                      <div className="space-y-2"><Label>AMO No</Label><Input name="amoNo" /></div>
                    </div>
                    <DialogFooter><Button type="submit">Save Log</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Details</TableHead><TableHead>Reference</TableHead><TableHead>AME</TableHead><TableHead>AMO</TableHead></TableRow></TableHeader>
              <TableBody>
                {logs?.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono">{format(new Date(log.date), 'PP')}</TableCell>
                    <TableCell className="font-semibold">{log.maintenanceType}</TableCell>
                    <TableCell className="max-w-xs truncate">{log.details}</TableCell>
                    <TableCell>{log.reference || 'N/A'}</TableCell>
                    <TableCell>{log.ameNo || 'N/A'}</TableCell>
                    <TableCell>{log.amoNo || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </Card>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}><DialogContent className="max-w-4xl h-[80vh]"><DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>{viewingImageUrl && <div className="relative flex-1 w-full h-full"><Image src={viewingImageUrl} alt="Document" fill style={{ objectFit: 'contain' }} /></div>}</DialogContent></Dialog>
    </div>
  );
}
