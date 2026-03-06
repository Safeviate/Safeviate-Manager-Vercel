'use client';

import { use, useMemo, useState } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, CalendarIcon, View, Trash2, FileUp } from 'lucide-react';
import Link from 'next/link';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { DocumentUploader } from '@/components/document-uploader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import type { DocumentExpirySettings } from '../../../admin/document-dates/page';
import { ComponentForm } from './component-form';
import { MaintenanceLogForm } from './maintenance-log-form';
import Image from 'next/image';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const aircraftId = resolvedParams.id;
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [isLogActivityOpen, setIsLogActivityOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const maintenanceLogsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'maintenanceLogs'), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: maintenanceLogs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(maintenanceLogsQuery);
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  const getStatusColor = (expirationDate: string | null | undefined): string | null => {
    if (!expirationDate || !expirySettings) return null;
    const today = new Date();
    const expiry = new Date(expirationDate);
    const daysUntilExpiry = differenceInDays(expiry, today);
    if (daysUntilExpiry < 0) return expirySettings.expiredColor || '#ef4444';
    const sortedPeriods = (expirySettings.warningPeriods || []).sort((a, b) => a.period - b.period);
    for (const warning of sortedPeriods) {
      if (daysUntilExpiry <= warning.period) return warning.color;
    }
    return expirySettings.defaultColor || null;
  };

  const handleDocumentUpdate = (updatedDocuments: any[]) => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocuments });
  };

  const onDocumentUploaded = (docDetails: any) => {
    const currentDocs = aircraft?.documents || [];
    handleDocumentUpdate([...currentDocs, docDetails]);
  };

  const handleExpirationDateChange = (docName: string, date: Date | undefined) => {
    const currentDocs = aircraft?.documents || [];
    const updatedDocs = currentDocs.map(d => d.name === docName ? { ...d, expirationDate: date ? date.toISOString() : null } : d);
    handleDocumentUpdate(updatedDocs);
  };

  const handleDocumentDelete = (docName: string) => {
    const currentDocs = aircraft?.documents || [];
    handleDocumentUpdate(currentDocs.filter(d => d.name !== docName));
  };

  if (isLoadingAircraft) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  const next50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const next100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon"><Link href="/assets/aircraft"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
          <p className="text-muted-foreground">{aircraft.make} {aircraft.model}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Current Hobbs</CardDescription><CardTitle className="text-2xl font-mono">{(aircraft.currentHobbs || 0).toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Current Tacho</CardDescription><CardTitle className="text-2xl font-mono">{(aircraft.currentTacho || 0).toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 50hr Due</CardDescription><CardTitle className={cn("text-2xl font-mono", next50 < 5 ? "text-destructive" : "")}>{next50.toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 100hr Due</CardDescription><CardTitle className={cn("text-2xl font-mono", next100 < 10 ? "text-destructive" : "")}>{next100.toFixed(1)}</CardTitle></CardHeader></Card>
      </div>

      <Card className="overflow-hidden">
        <Tabs defaultValue="documents" className="w-full">
          <TabsList>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="components">Tracked Components</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="p-6 mt-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Required & Uploaded Documents</h3>
              <DocumentUploader
                onDocumentUploaded={onDocumentUploaded}
                trigger={(open) => <Button onClick={() => open()} size="sm"><PlusCircle className="mr-2 h-4 w-4" />Add Document</Button>}
              />
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Expiry</TableHead><TableHead className="text-center">Set Expiry</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {(aircraft.documents || []).map((doc) => (
                  <TableRow key={doc.name}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>
                      <span style={{ color: getStatusColor(doc.expirationDate) }} className="font-semibold">
                        {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Popover>
                        <PopoverTrigger asChild><Button variant="ghost" size="icon"><CalendarIcon className="h-4 w-4" /></Button></PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined} onDateSelect={(date) => handleExpirationDateChange(doc.name, date)} /></PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => { setViewingImageUrl(doc.url); setIsImageViewerOpen(true); }}><View className="mr-2 h-4 w-4" />View</Button>
                        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDocumentDelete(doc.name)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="components" className="p-6 mt-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Lifecycle Tracking</h3>
              <ComponentForm 
                tenantId={tenantId} aircraftId={aircraftId} 
                isOpen={isAddComponentOpen} setIsOpen={setIsAddComponentOpen}
                trigger={<Button size="sm"><PlusCircle className="mr-2 h-4 w-4" />Add Component</Button>}
              />
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Component</TableHead><TableHead>Manufacturer</TableHead><TableHead>Serial Number</TableHead><TableHead>Install Date</TableHead><TableHead>TSN</TableHead><TableHead>TSO</TableHead><TableHead>Total Time</TableHead></TableRow></TableHeader>
              <TableBody>
                {(aircraft.components || []).map((comp) => (
                  <TableRow key={comp.id}>
                    <TableCell className="font-medium">{comp.name}</TableCell>
                    <TableCell>{comp.manufacturer}</TableCell>
                    <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                    <TableCell>{format(new Date(comp.installDate), 'PP')}</TableCell>
                    <TableCell>{comp.tsn}h</TableCell>
                    <TableCell>{comp.tso}h</TableCell>
                    <TableCell className="font-bold">{comp.totalTime}h</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="maintenance" className="p-6 mt-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Technical History</h3>
              <MaintenanceLogForm 
                tenantId={tenantId} aircraftId={aircraftId}
                isOpen={isLogActivityOpen} setIsOpen={setIsLogActivityOpen}
                trigger={<Button size="sm"><FileUp className="mr-2 h-4 w-4" />Log Activity</Button>}
              />
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Details</TableHead><TableHead>Reference</TableHead><TableHead>AME No</TableHead><TableHead>AMO No</TableHead></TableRow></TableHeader>
              <TableBody>
                {maintenanceLogs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{format(new Date(log.date), 'PP')}</TableCell>
                    <TableCell><Badge variant="outline">{log.maintenanceType}</Badge></TableCell>
                    <TableCell className="max-w-md truncate">{log.details}</TableCell>
                    <TableCell className="font-mono text-xs">{log.reference}</TableCell>
                    <TableCell>{log.ameNo}</TableCell>
                    <TableCell>{log.amoNo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </Card>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          <div className="flex-1 relative bg-muted rounded-md overflow-hidden">
            {viewingImageUrl && <Image src={viewingImageUrl} alt="Document" fill className="object-contain" />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
