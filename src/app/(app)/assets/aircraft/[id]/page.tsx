'use client';

import { use, useMemo, useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, PlusCircle, Pencil, View, Trash2, CalendarIcon, Upload, Camera, FileUp } from 'lucide-react';
import Link from 'next/link';
import { format, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { AircraftForm } from '../aircraft-form';
import { DocumentUploader } from '@/components/document-uploader';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import Image from 'next/image';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';

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
  
  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  const getStatusColor = (expirationDate: string | null | undefined): string | undefined => {
    if (!expirationDate || !expirySettings) return undefined;
    const today = new Date();
    const expiry = new Date(expirationDate);
    const daysUntilExpiry = differenceInDays(expiry, today);
    if (daysUntilExpiry < 0) return expirySettings.expiredColor;
    const sortedPeriods = [...(expirySettings.warningPeriods || [])].sort((a, b) => a.period - b.period);
    for (const wp of sortedPeriods) {
      if (daysUntilExpiry <= wp.period) return wp.color;
    }
    return expirySettings.defaultColor;
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
    const updatedDocs = currentDocs.map(d => 
      d.name === docName ? { ...d, expirationDate: date ? date.toISOString() : null } : d
    );
    handleDocumentUpdate(updatedDocs);
  };

  const handleDocumentDelete = (docName: string) => {
    const currentDocs = aircraft?.documents || [];
    handleDocumentUpdate(currentDocs.filter(d => d.name !== docName));
  };

  if (isLoadingAircraft || !aircraft) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  const next50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const next100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/assets/aircraft"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
          </div>
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

      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">General Details</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance & Components</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader><CardTitle>Aircraft Overview</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div><p className="text-sm font-medium text-muted-foreground">Manufacturer</p><p className="text-lg">{aircraft.make}</p></div>
                <div><p className="text-sm font-medium text-muted-foreground">Model</p><p className="text-lg">{aircraft.model}</p></div>
                <div><p className="text-sm font-medium text-muted-foreground">Type</p><p className="text-lg">{aircraft.type}</p></div>
              </div>
              <div className="space-y-4">
                <div><p className="text-sm font-medium text-muted-foreground">Empty Weight</p><p className="text-lg">{aircraft.emptyWeight || 'N/A'} lbs</p></div>
                <div><p className="text-sm font-medium text-muted-foreground">Max Takeoff Weight</p><p className="text-lg">{aircraft.maxTakeoffWeight || 'N/A'} lbs</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Aircraft Documents</CardTitle><CardDescription>Regulatory and airworthiness documentation.</CardDescription></div>
              <DocumentUploader
                trigger={(open) => <Button onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>}
                onDocumentUploaded={onDocumentUploaded}
              />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead className="text-center">Set Expiry</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(aircraft.documents || []).map((doc) => {
                    const statusColor = getStatusColor(doc.expirationDate);
                    return (
                      <TableRow key={doc.name}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell><Badge variant="outline">Yes</Badge></TableCell>
                        <TableCell>
                          <span style={{ color: statusColor }}>
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
                            <Button variant="outline" size="sm" onClick={() => { setViewingImageUrl(doc.url); setIsImageViewerOpen(true); }}><View className="mr-2 h-4 w-4" /> View</Button>
                            <Button variant="destructive" size="icon" onClick={() => handleDocumentDelete(doc.name)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Tracked Components</CardTitle><CardDescription>Life-limited parts and maintenance tracking.</CardDescription></div>
              <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
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
                  {(aircraft.components || []).map((comp) => (
                    <TableRow key={comp.id}>
                      <TableCell className="font-medium">{comp.name}</TableCell>
                      <TableCell>{comp.manufacturer}</TableCell>
                      <TableCell>{comp.serialNumber}</TableCell>
                      <TableCell>{comp.installDate ? format(new Date(comp.installDate), 'PP') : 'N/A'}</TableCell>
                      <TableCell className="text-right">{comp.tsn?.toFixed(1) || '0.0'}</TableCell>
                      <TableCell className="text-right">{comp.tso?.toFixed(1) || '0.0'}</TableCell>
                      <TableCell className="text-right">{comp.totalTime?.toFixed(1) || '0.0'}</TableCell>
                    </TableRow>
                  ))}
                  {(!aircraft.components || aircraft.components.length === 0) && (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No tracked components.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          {viewingImageUrl && <div className="relative w-full h-full"><Image src={viewingImageUrl} alt="Document" fill style={{ objectFit: 'contain' }} /></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
