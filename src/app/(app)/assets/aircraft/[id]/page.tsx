
'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, where } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, Eye, Trash2, CalendarIcon, Clock, AlertTriangle, FileUp, Camera } from 'lucide-react';
import Link from 'next/link';
import { format, differenceInDays } from 'date-fns';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import { DocumentUploader } from '@/components/document-uploader';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const StatCard = ({ label, value, subValue, color }: { label: string; value: string; subValue?: string; color?: string }) => (
  <Card className="flex-1 min-w-[140px] shadow-none">
    <CardContent className="p-3">
      <p className="text-[10px] uppercase font-bold text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-1">
        <p className={cn("text-lg font-bold font-mono", color)}>{value}</p>
        {subValue && <span className="text-[10px] text-muted-foreground">{subValue}</span>}
      </div>
    </CardContent>
  </Card>
);

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const maintenanceQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), where('aircraftId', '==', aircraftId)) : null),
    [firestore, tenantId, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`) : null),
    [firestore, tenantId, aircraftId]
  );

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(maintenanceQuery);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  const sortedLogs = useMemo(() => {
    if (!logs) return [];
    return [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs]);

  const getDocStatusColor = (expirationDate: string | null | undefined): string | null => {
    if (!expirationDate || !expirySettings) return null;
    const daysUntil = differenceInDays(new Date(expirationDate), new Date());
    if (daysUntil < 0) return expirySettings.expiredColor || '#ef4444';
    const sortedPeriods = [...(expirySettings.warningPeriods || [])].sort((a, b) => a.period - b.period);
    for (const warning of sortedPeriods) {
      if (daysUntil <= warning.period) return warning.color;
    }
    return expirySettings.defaultColor || '#22c55e';
  };

  const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    if (!aircraft || !aircraftRef) return;
    const currentDocs = aircraft.documents || [];
    const updatedDocs = [...currentDocs, docDetails];
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocs });
    toast({ title: 'Document Added', description: `"${docDetails.name}" has been saved.` });
  };

  const handleExpirationChange = (docName: string, date: Date | undefined) => {
    if (!aircraft || !aircraftRef) return;
    const updatedDocs = (aircraft.documents || []).map(d => 
      d.name === docName ? { ...d, expirationDate: date ? date.toISOString() : null } : d
    );
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocs });
  };

  const handleDeleteDocument = (docName: string) => {
    if (!aircraft || !aircraftRef) return;
    const updatedDocs = (aircraft.documents || []).filter(d => d.name !== docName);
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocs });
    toast({ title: 'Document Removed' });
  };

  if (isLoadingAircraft) {
    return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  }

  if (!aircraft) {
    return <div className="p-8 text-center text-muted-foreground">Aircraft not found.</div>;
  }

  const hoursToNext50 = aircraft.tachoAtNext50Inspection && aircraft.currentTacho 
    ? (aircraft.tachoAtNext50Inspection - aircraft.currentTacho).toFixed(1) 
    : 'N/A';
  const hoursToNext100 = aircraft.tachoAtNext100Inspection && aircraft.currentTacho 
    ? (aircraft.tachoAtNext100Inspection - aircraft.currentTacho).toFixed(1) 
    : 'N/A';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <Button asChild variant="ghost">
          <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link>
        </Button>
        <h1 className="text-2xl font-bold font-mono">{aircraft.tailNumber} Dashboard</h1>
      </div>

      {/* Reordered Status Row */}
      <div className="flex flex-wrap gap-3">
        <StatCard label="Initial Hobbs" value={aircraft.initialHobbs?.toFixed(1) || '0.0'} />
        <StatCard label="Initial Tacho" value={aircraft.initialTacho?.toFixed(1) || '0.0'} />
        <StatCard label="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1) || '0.0'} />
        <StatCard label="Current Tacho" value={aircraft.currentTacho?.toFixed(1) || '0.0'} />
        <StatCard label="Next 50hr" value={aircraft.tachoAtNext50Inspection?.toFixed(1) || 'N/A'} subValue={`${hoursToNext50} rem`} color="text-blue-600" />
        <StatCard label="Next 100hr" value={aircraft.tachoAtNext100Inspection?.toFixed(1) || 'N/A'} subValue={`${hoursToNext100} rem`} color="text-orange-600" />
      </div>

      <Tabs defaultValue="components" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0">
          <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Tracked Components</TabsTrigger>
          <TabsTrigger value="history" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Maintenance History</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Technical Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="mt-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tracked Components</CardTitle>
                <CardDescription>Life-limited parts and recurring inspection items.</CardDescription>
              </div>
              <Button size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Serial No.</TableHead>
                    <TableHead className="text-right">TSN</TableHead>
                    <TableHead className="text-right">TSO</TableHead>
                    <TableHead className="text-right">Max Hours</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(components || []).map(comp => {
                    const remaining = comp.maxHours - (comp.tso || comp.tsn || 0);
                    return (
                      <TableRow key={comp.id}>
                        <TableCell className="font-medium">{comp.name}</TableCell>
                        <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                        <TableCell className="text-right font-mono">{comp.tsn?.toFixed(1) || '0.0'}</TableCell>
                        <TableCell className="text-right font-mono">{comp.tso?.toFixed(1) || '0.0'}</TableCell>
                        <TableCell className="text-right font-mono">{comp.maxHours?.toFixed(1) || 'N/A'}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary">{remaining.toFixed(1)}</TableCell>
                      </TableRow>
                    )
                  })}
                  {(!components || components.length === 0) && (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No life-limited components tracked.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance History</CardTitle>
              <CardDescription>Certification of work performed.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
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
                  {sortedLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{log.maintenanceType}</TableCell>
                      <TableCell className="max-w-md truncate">{log.details}</TableCell>
                      <TableCell className="font-mono text-xs">{log.ameNo || 'N/A'}</TableCell>
                      <TableCell className="font-mono text-xs">{log.amoNo || 'N/A'}</TableCell>
                      <TableCell className="font-mono text-xs">{log.reference || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                  {sortedLogs.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No maintenance logs found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Technical Documents</CardTitle>
                <CardDescription>Certificates, manuals, and compliance documentation.</CardDescription>
              </div>
              <DocumentUploader
                onDocumentUploaded={onDocumentUploaded}
                trigger={(open) => (
                  <Button size="sm" variant="outline" onClick={() => open()}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Document
                  </Button>
                )}
              />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-center">Set Expiry</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(aircraft.documents || []).map((doc) => {
                    const statusColor = getDocStatusColor(doc.expirationDate);
                    return (
                      <TableRow key={doc.name}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {statusColor && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} />}
                            {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'No Expiry Set'}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <CalendarIcon className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <CustomCalendar
                                selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined}
                                onDateSelect={(date) => handleExpirationChange(doc.name, date)}
                              />
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="default" size="sm" onClick={() => { setViewingImageUrl(doc.url); setIsImageViewerOpen(true); }}>
                              <Eye className="mr-2 h-4 w-4" /> View
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteDocument(doc.name)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {(!aircraft.documents || aircraft.documents.length === 0) && (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No technical documents uploaded.</TableCell></TableRow>
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
            <div className="relative h-[80vh] w-full">
              <Image src={viewingImageUrl} alt="Document" fill className="object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
