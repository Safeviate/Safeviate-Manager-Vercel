
'use client';

import { use, useMemo, useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileUp, Eye, Calendar, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { format, differenceInDays } from 'date-fns';
import { DocumentUploader } from '@/components/document-uploader';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AircraftForm } from '../aircraft-form';
import { ComponentForm } from './component-form';
import { MaintenanceLogForm } from './maintenance-log-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import type { DocumentExpirySettings } from '../../../admin/document-dates/page';
import { Separator } from '@/components/ui/separator';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  
  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components')) : null),
    [firestore, tenantId, aircraftId]
  );

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'maintenanceLogs'), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewingDocUrl, setViewingDocUrl] = useState<string | null>(null);

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

  const handleDocumentUpdate = (updatedDocs: any[]) => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocs });
  };

  if (isLoadingAircraft) return <Skeleton className="h-96 w-full" />;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  const next50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const next100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button asChild variant="ghost" size="sm">
          <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link>
        </Button>
        <AircraftForm 
            tenantId={tenantId} 
            existingAircraft={aircraft} 
            trigger={<Button variant="outline"><Pencil className="mr-2 h-4 w-4" /> Edit Aircraft</Button>} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Current Hobbs</CardDescription><CardTitle className="text-2xl font-mono">{(aircraft.currentHobbs || 0).toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Current Tacho</CardDescription><CardTitle className="text-2xl font-mono">{(aircraft.currentTacho || 0).toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 50hr Due</CardDescription><CardTitle className={cn("text-2xl font-mono", next50 < 5 ? "text-destructive" : "")}>{next50.toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 100hr Due</CardDescription><CardTitle className={cn("text-2xl font-mono", next100 < 10 ? "text-destructive" : "")}>{next100.toFixed(1)}</CardTitle></CardHeader></Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader><CardTitle>{aircraft.tailNumber}</CardTitle><CardDescription>{aircraft.make} {aircraft.model} • {aircraft.type}</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><p className="text-sm font-medium text-muted-foreground">Empty Weight</p><p className="text-lg font-semibold">{aircraft.emptyWeight || 'N/A'} lbs</p></div>
                <div><p className="text-sm font-medium text-muted-foreground">Max Takeoff Weight</p><p className="text-lg font-semibold">{aircraft.maxTakeoffWeight || 'N/A'} lbs</p></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Aircraft Documents</CardTitle><CardDescription>Regulatory certificates and insurance.</CardDescription></div>
              <DocumentUploader
                onDocumentUploaded={(newDoc) => handleDocumentUpdate([...(aircraft.documents || []), newDoc])}
                trigger={(open) => <Button onClick={() => open()}><FileUp className="mr-2 h-4 w-4" /> Add Document</Button>}
              />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Expiry Date</TableHead><TableHead className="text-center">Set Expiry</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(aircraft.documents || []).map((doc, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell style={{ color: getStatusColor(doc.expirationDate) || 'inherit' }} className="font-semibold">
                        {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'No Expiry'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Popover>
                          <PopoverTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8"><Calendar className="h-4 w-4" /></Button></PopoverTrigger>
                          <PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined} onDateSelect={(date) => {
                            const newDocs = [...(aircraft.documents || [])];
                            newDocs[idx].expirationDate = date.toISOString();
                            handleDocumentUpdate(newDocs);
                          }} /></PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setViewingDocUrl(doc.url); setIsViewerOpen(true); }}><Eye className="mr-2 h-4 w-4" /> View</Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDocumentUpdate((aircraft.documents || []).filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Tracked Components</CardTitle><CardDescription>Life-limited parts and assemblies.</CardDescription></div>
              <ComponentForm tenantId={tenantId} aircraftId={aircraftId} />
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
                  {components?.map((comp) => (
                    <TableRow key={comp.id}>
                      <TableCell className="font-medium">{comp.name}</TableCell>
                      <TableCell>{comp.manufacturer}</TableCell>
                      <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                      <TableCell>{format(new Date(comp.installDate), 'PP')}</TableCell>
                      <TableCell className="text-right font-mono">{(comp.tsn || 0).toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono">{(comp.tso || 0).toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono">{(comp.totalTime || 0).toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Maintenance Logs</CardTitle><CardDescription>Work history and service records.</CardDescription></div>
              <MaintenanceLogForm tenantId={tenantId} aircraftId={aircraftId} />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>AME No.</TableHead>
                    <TableHead>AMO No.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell><Badge variant="secondary">{log.maintenanceType}</Badge></TableCell>
                      <TableCell className="whitespace-nowrap">{format(new Date(log.date), 'PP')}</TableCell>
                      <TableCell className="max-w-md truncate" title={log.details}>{log.details}</TableCell>
                      <TableCell className="font-mono text-xs">{log.ameNo}</TableCell>
                      <TableCell className="font-mono text-xs">{log.amoNo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]"><DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          <div className="relative aspect-auto min-h-[60vh] flex items-center justify-center">
            {viewingDocUrl ? <img src={viewingDocUrl} alt="Document" className="max-h-[70vh] object-contain" /> : <Skeleton className="h-full w-full" />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
