'use client';

import { use, useMemo, useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, PlusCircle, Pencil, CalendarIcon, View, Trash2, FileText } from 'lucide-react';
import Link from 'next/link';
import { format, differenceInDays } from 'date-fns';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { DocumentUploader } from '@/components/document-uploader';
import { AircraftForm } from '../aircraft-form';
import { ComponentForm } from '../component-form';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const MetricCard = ({ title, value, subValue, highlight = false }: { title: string; value: string; subValue?: string; highlight?: boolean }) => (
    <Card className={cn(highlight && "border-primary shadow-md")}>
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
        </CardContent>
    </Card>
);

import { cn } from '@/lib/utils';

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
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
  const { data: logs, isLoading: isLoadingLogs } = useCollection<any>(logsQuery);
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  const getStatusColor = (expirationDateText?: string | null): string => {
    if (!expirationDateText || !expirySettings) return 'inherit';

    const today = new Date();
    const expiry = new Date(expirationDateText);
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

    return expirySettings.defaultColor || 'inherit';
  };

  const handleDocumentUploaded = (docDetails: any) => {
    if (!aircraftRef) return;
    const currentDocs = aircraft?.documents || [];
    updateDocumentNonBlocking(aircraftRef, {
        documents: [...currentDocs, docDetails]
    });
    toast({ title: 'Document Added' });
  };

  const updateDocumentExpiry = (docName: string, date?: Date) => {
    if (!aircraftRef || !aircraft?.documents) return;
    const newDocs = aircraft.documents.map(d => 
        d.name === docName ? { ...d, expirationDate: date ? date.toISOString() : null } : d
    );
    updateDocumentNonBlocking(aircraftRef, { documents: newDocs });
    toast({ title: 'Expiry Updated' });
  };

  const deleteDocument = (docName: string) => {
    if (!aircraftRef || !aircraft?.documents) return;
    const newDocs = aircraft.documents.filter(d => d.name !== docName);
    updateDocumentNonBlocking(aircraftRef, { documents: newDocs });
    toast({ title: 'Document Deleted' });
  }

  const isLoading = isLoadingAircraft || isLoadingComponents || isLoadingLogs;

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!aircraft) return <div className="text-center py-10"><p>Aircraft not found.</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
            <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
                <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link>
            </Button>
            <h1 className="text-4xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <p className="text-xl text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
        </div>
        <div className="flex items-center gap-2">
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <Button onClick={() => setIsEditOpen(true)} variant="outline"><Pencil className="mr-2 h-4 w-4" /> Edit Aircraft</Button>
                <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Edit Aircraft Details</DialogTitle></DialogHeader>
                    <AircraftForm tenantId={tenantId} existingAircraft={aircraft} onComplete={() => setIsEditOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1) || '0.0'} subValue={`Start: ${aircraft.initialHobbs?.toFixed(1) || '0.0'}`} />
          <MetricCard title="Current Tacho" value={aircraft.currentTacho?.toFixed(1) || '0.0'} subValue={`Start: ${aircraft.initialTacho?.toFixed(1) || '0.0'}`} />
          <MetricCard 
            title="Next 50hr Due" 
            value={aircraft.tachoAtNext50Inspection?.toFixed(1) || 'N/A'} 
            highlight={!!aircraft.tachoAtNext50Inspection && (aircraft.tachoAtNext50Inspection - (aircraft.currentTacho || 0)) <= 5}
            subValue={aircraft.tachoAtNext50Inspection ? `${(aircraft.tachoAtNext50Inspection - (aircraft.currentTacho || 0)).toFixed(1)} hrs rem.` : undefined}
          />
          <MetricCard 
            title="Next 100hr Due" 
            value={aircraft.tachoAtNext100Inspection?.toFixed(1) || 'N/A'} 
            highlight={!!aircraft.tachoAtNext100Inspection && (aircraft.tachoAtNext100Inspection - (aircraft.currentTacho || 0)) <= 10}
            subValue={aircraft.tachoAtNext100Inspection ? `${(aircraft.tachoAtNext100Inspection - (aircraft.currentTacho || 0)).toFixed(1)} hrs rem.` : undefined}
          />
      </div>

      <Tabs defaultValue="components" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="components">Tracked Components</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="logs">Maintenance Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="mt-6 space-y-4">
            <div className="flex justify-end">
                <Dialog open={isAddComponentOpen} onOpenChange={setIsAddComponentOpen}>
                    <Button onClick={() => setIsAddComponentOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Add Tracked Component</DialogTitle></DialogHeader>
                        <ComponentForm tenantId={tenantId} aircraftId={aircraftId} onComplete={() => setIsAddComponentOpen(false)} />
                    </DialogContent>
                </Dialog>
            </div>
            <Card>
                <CardContent className="p-0">
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
                            {components?.length ? components.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-medium">{c.name}</TableCell>
                                    <TableCell>{c.manufacturer}</TableCell>
                                    <TableCell>{c.serialNumber}</TableCell>
                                    <TableCell>{c.installDate ? format(new Date(c.installDate), 'PP') : 'N/A'}</TableCell>
                                    <TableCell>{c.tsn?.toFixed(1) || '0.0'}</TableCell>
                                    <TableCell>{c.tso?.toFixed(1) || '0.0'}</TableCell>
                                    <TableCell>{c.totalTime?.toFixed(1) || '0.0'}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No tracked components.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6 space-y-4">
            <div className="flex justify-end">
                <DocumentUploader 
                    onDocumentUploaded={handleDocumentUploaded}
                    trigger={(open) => <Button onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>}
                />
            </div>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Uploaded</TableHead>
                                <TableHead>Expiry Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {aircraft.documents?.length ? aircraft.documents.map(doc => (
                                <TableRow key={doc.name}>
                                    <TableCell className="font-medium">{doc.name}</TableCell>
                                    <TableCell>{format(new Date(doc.uploadDate), 'PP')}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span style={{ color: getStatusColor(doc.expirationDate) }} className="font-semibold">
                                                {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'No Expiry'}
                                            </span>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8"><CalendarIcon className="h-4 w-4" /></Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <CustomCalendar 
                                                        selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined}
                                                        onDateSelect={(date) => updateDocumentExpiry(doc.name, date)}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => { setViewingImageUrl(doc.url); setIsImageViewerOpen(true); }}><View className="mr-2 h-4 w-4" /> View</Button>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDocument(doc.name)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No documents uploaded.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
            <Card><CardContent className="p-8 text-center text-muted-foreground"><FileText className="mx-auto h-12 w-12 opacity-20 mb-4" /><p>Maintenance log integration coming soon.</p></CardContent></Card>
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