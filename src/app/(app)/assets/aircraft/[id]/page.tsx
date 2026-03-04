'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { DocumentUploader } from '@/components/document-uploader';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { CalendarIcon, Eye, History, Trash2, PlusCircle, Pencil } from 'lucide-react';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import type { DocumentExpirySettings } from '../../../admin/document-dates/page';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Image from 'next/image';
import { AircraftForm } from '../aircraft-form';
import { ComponentForm } from '../component-form';
import { MaintenanceForm } from '../maintenance-form';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`)) : null),
    [firestore, tenantId, aircraftId]
  );

  const maintenanceQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`)) : null),
    [firestore, tenantId, aircraftId]
  );

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/settings/document-expiry`) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(maintenanceQuery);
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  const getExpiryColor = (dateString?: string | null) => {
    if (!dateString || !expirySettings) return undefined;
    const today = new Date();
    const expiry = new Date(dateString);
    const daysUntil = differenceInDays(expiry, today);

    if (daysUntil < 0) return expirySettings.expiredColor;
    const sorted = [...(expirySettings.warningPeriods || [])].sort((a, b) => a.period - b.period);
    for (const p of sorted) {
      if (daysUntil <= p.period) return p.color;
    }
    return expirySettings.defaultColor;
  };

  const handleUpdateDocs = (updated: any[]) => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, { documents: updated });
  };

  if (isLoadingAircraft) return <Skeleton className="h-96 w-full" />;
  if (!aircraft) return <p>Aircraft not found.</p>;

  const next50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const next100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
          <p className="text-muted-foreground">{aircraft.make} {aircraft.model}</p>
        </div>
        <AircraftForm tenantId={tenantId} existingAircraft={aircraft} trigger={<Button variant="outline"><Pencil className="mr-2 h-4 w-4" /> Edit Aircraft</Button>} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Current Hobbs</CardDescription><CardTitle className="text-2xl font-mono">{(aircraft.currentHobbs || 0).toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Current Tacho</CardDescription><CardTitle className="text-2xl font-mono">{(aircraft.currentTacho || 0).toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 50hr Due</CardDescription><CardTitle className={cn("text-2xl font-mono", next50 < 5 ? "text-destructive" : "")}>{next50.toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 100hr Due</CardDescription><CardTitle className={cn("text-2xl font-mono", next100 < 10 ? "text-destructive" : "")}>{next100.toFixed(1)}</CardTitle></CardHeader></Card>
      </div>

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">Regulatory Documents</TabsTrigger>
          <TabsTrigger value="components">Tracked Components</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Certificates & Permits</CardTitle>
                <CardDescription>Track expiration dates for critical aircraft documentation.</CardDescription>
              </div>
              <DocumentUploader
                onDocumentUploaded={(doc) => handleUpdateDocs([...(aircraft.documents || []), doc])}
                trigger={(open) => <Button onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>}
              />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Expiration Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aircraft.documents?.map((doc, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(doc.uploadDate), 'PPP')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span style={{ color: getExpiryColor(doc.expirationDate) }} className="font-semibold">
                            {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}
                          </span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6"><CalendarIcon className="h-3 w-3" /></Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <CustomCalendar
                                selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined}
                                onDateSelect={(date) => {
                                  const updated = [...(aircraft.documents || [])];
                                  updated[idx] = { ...updated[idx], expirationDate: date.toISOString() };
                                  handleUpdateDocs(updated);
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setViewingUrl(doc.url); setIsViewerOpen(true); }}><Eye className="h-4 w-4 mr-1" /> View</Button>
                          <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => {
                            const updated = aircraft.documents?.filter((_, i) => i !== idx) || [];
                            handleUpdateDocs(updated);
                          }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tracked Components</CardTitle>
                <CardDescription>Monitor life-limited parts and equipment totals.</CardDescription>
              </div>
              <ComponentForm tenantId={tenantId} aircraftId={aircraftId} trigger={<Button><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>} />
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
                      <TableCell className="font-mono text-xs">{c.serialNumber}</TableCell>
                      <TableCell>{c.installDate ? format(new Date(c.installDate), 'PP') : 'N/A'}</TableCell>
                      <TableCell className="text-right font-mono">{c.tsn.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono">{c.tso.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono">{c.totalTime?.toFixed(1) || '0.0'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Maintenance Logs</CardTitle>
                <CardDescription>A comprehensive history of engineering activities.</CardDescription>
              </div>
              <MaintenanceForm tenantId={tenantId} aircraftId={aircraftId} trigger={<Button><History className="mr-2 h-4 w-4" /> Log Activity</Button>} />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>AME</TableHead>
                    <TableHead>AMO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(log.date), 'PPP')}</TableCell>
                      <TableCell className="font-semibold">{log.maintenanceType}</TableCell>
                      <TableCell className="text-muted-foreground text-xs uppercase">{log.reference}</TableCell>
                      <TableCell className="max-w-md text-sm">{log.details}</TableCell>
                      <TableCell className="font-medium">{log.ameNo}</TableCell>
                      <TableCell className="font-medium">{log.amoNo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          {viewingUrl && (
            <div className="relative h-[70vh] w-full">
              <Image src={viewingUrl} alt="Document" fill className="object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
