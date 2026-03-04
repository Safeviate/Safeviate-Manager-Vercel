'use client';

import { use, useMemo, useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Eye, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { format, differenceInDays } from 'date-fns';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/aircraft';
import { AircraftForm } from '../aircraft-form';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
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

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  
  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`)) : null),
    [firestore, tenantId, aircraftId]
  );

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);
  const { data: expirySettings } = useDoc<any>(expirySettingsRef);

  const getStatusColor = (expirationDate: string | null | undefined): string | null => {
    if (!expirationDate || !expirySettings) return null;

    const today = new Date();
    const expiry = new Date(expirationDate);
    const daysUntilExpiry = differenceInDays(expiry, today);

    if (daysUntilExpiry < 0) {
      return expirySettings.expiredColor || '#ef4444'; 
    }

    const sortedPeriods = [...(expirySettings.warningPeriods || [])].sort((a, b) => a.period - b.period);
    for (const warning of sortedPeriods) {
      if (daysUntilExpiry <= warning.period) {
        return warning.color;
      }
    }

    return expirySettings.defaultColor || null; 
  };

  const handleDocumentExpiryChange = (docName: string, date: Date | undefined) => {
    if (!aircraft || !aircraftRef) return;
    const currentDocs = aircraft.documents || [];
    const updatedDocs = currentDocs.map(d => 
      d.name === docName ? { ...d, expirationDate: date ? date.toISOString() : null } : d
    );
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocs });
    toast({ title: 'Expiry Updated', description: `Expiration for ${docName} has been updated.` });
  };

  const handleViewDocument = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };

  const handleAddDocument = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    if (!aircraft || !aircraftRef) return;
    const currentDocs = aircraft.documents || [];
    updateDocumentNonBlocking(aircraftRef, { documents: [...currentDocs, docDetails] });
  };

  const handleRemoveDocument = (docName: string) => {
    if (!aircraft || !aircraftRef) return;
    const updatedDocs = (aircraft.documents || []).filter(d => d.name !== docName);
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocs });
    toast({ title: 'Document Removed' });
  };

  const isLoading = isLoadingAircraft || isLoadingComponents || isLoadingLogs;

  if (isLoading) return <div className="p-8 space-y-6"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64 w-full" /></div>;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-8">
            <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
          <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
        </div>
        <Button onClick={() => setIsEditDialogOpen(true)}>Edit Aircraft</Button>
      </div>

      {/* Meter Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Current Hobbs</CardDescription><CardTitle className="text-2xl">{aircraft.currentHobbs?.toFixed(1) || '0.0'}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Current Tacho</CardDescription><CardTitle className="text-2xl">{aircraft.currentTacho?.toFixed(1) || '0.0'}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 50hr Due</CardDescription><CardTitle className="text-2xl">{aircraft.tachoAtNext50Inspection?.toFixed(1) || 'N/A'}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 100hr Due</CardDescription><CardTitle className="text-2xl">{aircraft.tachoAtNext100Inspection?.toFixed(1) || 'N/A'}</CardTitle></CardHeader></Card>
      </div>

      <Tabs defaultValue="components" className="w-full">
        <TabsList>
          <TabsTrigger value="components">Tracked Components</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="logs">Maintenance Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Life-Limited Components</CardTitle>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Component</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Install Date</TableHead>
                    <TableHead className="text-right">TSN</TableHead>
                    <TableHead className="text-right">TSO</TableHead>
                    <TableHead className="text-right">Total Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components?.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.manufacturer}</TableCell>
                      <TableCell>{c.serialNumber}</TableCell>
                      <TableCell>{c.installDate ? format(new Date(c.installDate), 'PP') : 'N/A'}</TableCell>
                      <TableCell className="text-right font-mono">{c.tsn?.toFixed(1) || '0.0'}</TableCell>
                      <TableCell className="text-right font-mono">{c.tso?.toFixed(1) || '0.0'}</TableCell>
                      <TableCell className="text-right font-mono">{c.totalTime?.toFixed(1) || '0.0'}</TableCell>
                    </TableRow>
                  ))}
                  {components?.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No tracked components recorded.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Aircraft Documents</CardTitle>
              <DocumentUploader 
                onDocumentUploaded={handleAddDocument}
                trigger={(open) => <Button size="sm" onClick={() => open()}><Plus className="mr-2 h-4 w-4" /> Add Document</Button>}
              />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead className="text-center w-[100px]">Set Expiry</TableHead>
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
                          <span style={{ color: statusColor || 'inherit' }} className="font-semibold">
                            {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'No Expiry Set'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><CalendarIcon className="h-4 w-4" /></Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="center">
                              <CustomCalendar 
                                selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined}
                                onDateSelect={(date) => handleDocumentExpiryChange(doc.name, date)}
                              />
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleViewDocument(doc.url)}><Eye className="mr-2 h-4 w-4" /> View</Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveDocument(doc.name)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(aircraft.documents || []).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No documents uploaded.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Maintenance Log History</CardTitle>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Log Activity</Button>
            </CardHeader>
            <CardContent>
              {logs?.map((log) => (
                <div key={log.id} className="mb-4 last:mb-0 border-b last:border-0 pb-4">
                  <div className="flex justify-between items-baseline mb-1">
                    <p className="font-semibold">{format(new Date(log.date), 'PPP')}</p>
                    <Badge variant="outline">Maintenance</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{log.description}</p>
                </div>
              ))}
              {logs?.length === 0 && <p className="text-center py-8 text-muted-foreground">No logs found.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Aircraft</DialogTitle></DialogHeader>
          <AircraftForm existingAircraft={aircraft} tenantId={tenantId} onCancel={() => setIsEditDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          {viewingImageUrl && (
            <div className="relative h-[70vh] w-full">
              <Image src={viewingImageUrl} alt="Document" fill className="object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
