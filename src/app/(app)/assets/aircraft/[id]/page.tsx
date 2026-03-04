'use client';

import { use, useMemo, useState } from 'react';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInDays } from 'date-fns';
import { CalendarIcon, Eye, PlusCircle, Pencil, History, FileText, Settings2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/aircraft';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';
import { AircraftForm } from '../aircraft-form';
import { ComponentForm } from '../component-form';
import { DocumentUploader } from '@/components/document-uploader';
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

  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const aircraftRef = useMemoFirebase(() => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null), [firestore, tenantId, aircraftId]);
  const componentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`) : null), [firestore, tenantId, aircraftId]);
  const logsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null), [firestore, tenantId, aircraftId]);
  const expirySettingsRef = useMemoFirebase(() => (firestore ? doc(firestore, `tenants/${tenantId}/settings/document-expiry`) : null), [firestore, tenantId]);

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);
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

  const handleUpdateExpiry = (docName: string, date: Date | undefined) => {
    if (!aircraft || !firestore) return;
    const updatedDocs = (aircraft.documents || []).map(d => 
      d.name === docName ? { ...d, expirationDate: date ? date.toISOString() : null } : d
    );
    updateDocumentNonBlocking(aircraftRef!, { documents: updatedDocs });
    toast({ title: 'Expiry Date Updated' });
  };

  const handleDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string }) => {
    if (!aircraft || !firestore) return;
    const updatedDocs = [...(aircraft.documents || []), { ...docDetails, expirationDate: null }];
    updateDocumentNonBlocking(aircraftRef!, { documents: updatedDocs });
    toast({ title: 'Document Added' });
  };

  const handleViewDocument = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };

  if (isLoadingAircraft) return <Skeleton className="h-96 w-full" />;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
          <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
        </div>
        <AircraftForm tenantId={tenantId} existingAircraft={aircraft} trigger={<Button variant="outline"><Pencil className="mr-2 h-4 w-4" /> Edit Aircraft</Button>} />
      </div>

      {/* Persistent Meter Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Current Hobbs</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{aircraft.currentHobbs?.toFixed(1) || '0.0'}</div></CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Current Tacho</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{aircraft.currentTacho?.toFixed(1) || '0.0'}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Next 50hr Due</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{aircraft.tachoAtNext50Inspection?.toFixed(1) || 'N/A'}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Next 100hr Due</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{aircraft.tachoAtNext100Inspection?.toFixed(1) || 'N/A'}</div></CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="components" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="components"><Settings2 className="mr-2 h-4 w-4" /> Tracked Components</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="mr-2 h-4 w-4" /> Documents</TabsTrigger>
          <TabsTrigger value="logs"><History className="mr-2 h-4 w-4" /> Maintenance Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="components">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Fleet Lifecycle Tracking</CardTitle>
                <CardDescription>Detailed status of serialised and life-limited components.</CardDescription>
              </div>
              <ComponentForm tenantId={tenantId} aircraftId={aircraftId} trigger={<Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>} />
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
                  {components?.map(comp => (
                    <TableRow key={comp.id}>
                      <TableCell className="font-medium">{comp.name}</TableCell>
                      <TableCell>{comp.manufacturer}</TableCell>
                      <TableCell>{comp.serialNumber}</TableCell>
                      <TableCell>{comp.installDate ? format(new Date(comp.installDate), 'PP') : 'N/A'}</TableCell>
                      <TableCell className="text-right font-mono">{comp.tsn?.toFixed(1) || '0.0'}</TableCell>
                      <TableCell className="text-right font-mono">{comp.tso?.toFixed(1) || '0.0'}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{comp.totalTime?.toFixed(1) || '0.0'}</TableCell>
                    </TableRow>
                  ))}
                  {(!components || components.length === 0) && (
                    <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No components tracked.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Aircraft Documents</CardTitle>
                <CardDescription>C of A, C of R, Insurance, and other regulatory certificates.</CardDescription>
              </div>
              <DocumentUploader onDocumentUploaded={handleDocumentUploaded} trigger={(open) => <Button size="sm" onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>} />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead className="text-center">Update Expiry</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aircraft.documents?.map(doc => {
                    const statusColor = getStatusColor(doc.expirationDate);
                    return (
                      <TableRow key={doc.name}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell style={{ color: statusColor || 'inherit' }} className="font-semibold">
                          {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'No Expiry Set'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Popover>
                            <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><CalendarIcon className="h-4 w-4" /></Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined} onDateSelect={(date) => handleUpdateExpiry(doc.name, date)} /></PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleViewDocument(doc.url)}><Eye className="mr-2 h-4 w-4" /> View</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!aircraft.documents || aircraft.documents.length === 0) && (
                    <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No documents uploaded.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader><CardTitle>Maintenance Logs</CardTitle><CardDescription>Historical record of inspections and repairs.</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.map(log => (
                    <TableRow key={log.id}><TableCell className="whitespace-nowrap">{format(new Date(log.date), 'PP')}</TableCell><TableCell className="line-clamp-2">{log.description}</TableCell></TableRow>
                  ))}
                  {(!logs || logs.length === 0) && (
                    <TableRow><TableCell colSpan={2} className="text-center h-24 text-muted-foreground">No logs found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          {viewingImageUrl && (
            <div className="relative h-[70vh] w-full mt-4">
              <Image src={viewingImageUrl} alt="Document" fill className="object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
