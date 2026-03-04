'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Plus, Eye, Calendar as CalendarIcon, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { format, differenceInDays } from 'date-fns';
import { DocumentUploader } from '@/components/document-uploader';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/quality';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import Image from 'next/image';
import { AircraftForm } from '../aircraft-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`)) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  const getStatusColor = (expirationDate: string | null | undefined): string | null => {
    if (!expirationDate || !expirySettings) return null;
    const today = new Date();
    const expiry = new Date(expirationDate);
    const daysUntilExpiry = differenceInDays(expiry, today);
    if (daysUntilExpiry < 0) return expirySettings.expiredColor || '#ef4444';
    const sortedPeriods = [...(expirySettings.warningPeriods || [])].sort((a, b) => a.period - b.period);
    for (const warning of sortedPeriods) {
      if (daysUntilExpiry <= warning.period) return warning.color;
    }
    return expirySettings.defaultColor || null;
  };

  const handleDocumentUploaded = (docDetails: any) => {
    if (!aircraft) return;
    const currentDocs = aircraft.documents || [];
    const updatedDocs = [...currentDocs, docDetails];
    updateDocumentNonBlocking(aircraftRef!, { documents: updatedDocs });
  };

  const handleExpirationDateChange = (docName: string, date: Date | undefined) => {
    if (!aircraft) return;
    const updatedDocs = (aircraft.documents || []).map(d => 
      d.name === docName ? { ...d, expirationDate: date ? date.toISOString() : null } : d
    );
    updateDocumentNonBlocking(aircraftRef!, { documents: updatedDocs });
  };

  const next50 = aircraft ? (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0) : 0;
  const next100 = aircraft ? (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0) : 0;

  if (isLoadingAircraft) return <Skeleton className="h-96 w-full" />;
  if (!aircraft) return <div>Aircraft not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link>
          </Button>
          <h1 className="text-4xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
          <p className="text-lg text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
        </div>
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline"><Pencil className="mr-2 h-4 w-4" /> Edit Aircraft</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Edit Aircraft Details</DialogTitle></DialogHeader>
            <AircraftForm tenantId={tenantId} existingAircraft={aircraft} onSuccess={() => setIsEditOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Current Hobbs</CardDescription><CardTitle className="text-2xl font-mono">{(aircraft.currentHobbs || 0).toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Current Tacho</CardDescription><CardTitle className="text-2xl font-mono">{(aircraft.currentTacho || 0).toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 50hr Due</CardDescription><CardTitle className={cn("text-2xl font-mono", next50 < 5 ? "text-destructive" : "")}>{next50.toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 100hr Due</CardDescription><CardTitle className={cn("text-2xl font-mono", next100 < 10 ? "text-destructive" : "")}>{next100.toFixed(1)}</CardTitle></CardHeader></Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-header text-header-foreground">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <Card>
            <CardHeader><CardTitle>General Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div><p className="text-sm font-medium text-muted-foreground">Make</p><p>{aircraft.make}</p></div>
              <div><p className="text-sm font-medium text-muted-foreground">Model</p><p>{aircraft.model}</p></div>
              <div><p className="text-sm font-medium text-muted-foreground">Type</p><p>{aircraft.type}</p></div>
              <div><p className="text-sm font-medium text-muted-foreground">Frame Hours</p><p>{aircraft.frameHours || 'N/A'}</p></div>
              <div><p className="text-sm font-medium text-muted-foreground">Engine Hours</p><p>{aircraft.engineHours || 'N/A'}</p></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Aircraft Documents</CardTitle>
                <CardDescription>Regulatory compliance and certification files.</CardDescription>
              </div>
              <DocumentUploader
                onDocumentUploaded={handleDocumentUploaded}
                trigger={(open) => (
                  <Button onClick={() => open()}>
                    <Plus className="mr-2 h-4 w-4" /> Add Document
                  </Button>
                )}
              />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Expiration Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(aircraft.documents || []).map((doc) => {
                    const statusColor = getStatusColor(doc.expirationDate);
                    return (
                      <TableRow key={doc.name}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold" style={{ color: statusColor || 'inherit' }}>
                              {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}
                            </span>
                            <Popover>
                              <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><CalendarIcon className="h-3 w-3" /></Button></PopoverTrigger>
                              <PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined} onDateSelect={(date) => handleExpirationDateChange(doc.name, date)} /></PopoverContent>
                            </Popover>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => { setViewingImageUrl(doc.url); setIsImageViewerOpen(true); }}><Eye className="mr-2 h-4 w-4" /> View</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(aircraft.documents || []).length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No documents uploaded.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tracked Components</CardTitle>
                <CardDescription>Life-limited parts and major assemblies.</CardDescription>
              </div>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Component</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Install Date</TableHead>
                    <TableHead>TSN</TableHead>
                    <TableHead>TSO</TableHead>
                    <TableHead>Total Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components?.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.manufacturer}</TableCell>
                      <TableCell>{c.serialNumber}</TableCell>
                      <TableCell>{c.installDate ? format(new Date(c.installDate), 'PP') : 'N/A'}</TableCell>
                      <TableCell>{c.tsn || 0}</TableCell>
                      <TableCell>{c.tso || 0}</TableCell>
                      <TableCell>{c.totalTime || 0}</TableCell>
                    </TableRow>
                  ))}
                  {components?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No components being tracked.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Maintenance Logs</CardTitle>
                <CardDescription>Historical record of maintenance activities.</CardDescription>
              </div>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Log</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Procedure</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{format(new Date(log.date), 'PP')}</TableCell>
                      <TableCell>{log.description}</TableCell>
                      <TableCell>{log.procedure}</TableCell>
                    </TableRow>
                  ))}
                  {logs?.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No maintenance logs found.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          {viewingImageUrl && <div className="relative w-full h-full"><Image src={viewingImageUrl} alt="Document" fill className="object-contain" /></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
