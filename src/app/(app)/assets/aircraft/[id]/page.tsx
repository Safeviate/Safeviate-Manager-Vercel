'use client';

import { use, useMemo, useState } from 'react';
import { doc, collection, query } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { CalendarIcon, Eye, Trash2, PlusCircle, Edit, View, ArrowLeft } from 'lucide-react';
import { AircraftForm } from '../aircraft-form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { DocumentUploader } from '@/components/document-uploader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Link from 'next/link';
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

    if (daysUntilExpiry < 0) {
      return expirySettings.expiredColor || '#ef4444';
    }

    const sortedPeriods = [...(expirySettings.warningPeriods || [])].sort((a, b) => a.period - b.period);
    for (const warning of sortedPeriods) {
      if (daysUntilExpiry <= warning.period) {
        return warning.color;
      }
    }

    return expirySettings.defaultColor || undefined;
  };

  const handleDocumentUpdate = (updatedDocuments: any[]) => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocuments });
  };

  const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    const currentDocs = aircraft?.documents || [];
    handleDocumentUpdate([...currentDocs, docDetails]);
    toast({ title: 'Document Uploaded' });
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
    toast({ title: 'Document Deleted' });
  };

  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };

  if (isLoadingAircraft) return <Skeleton className="h-96 w-full" />;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  const next50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const next100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Fleet</Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
          <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
        </div>
        <AircraftForm 
          tenantId={tenantId} 
          existingAircraft={aircraft} 
          trigger={<Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Edit Aircraft</Button>} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Current Hobbs</CardDescription><CardTitle className="text-2xl font-mono">{(aircraft.currentHobbs || 0).toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Current Tacho</CardDescription><CardTitle className="text-2xl font-mono">{(aircraft.currentTacho || 0).toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 50hr Due</CardDescription><CardTitle className={cn("text-2xl font-mono", next50 < 5 ? "text-destructive" : "")}>{next50.toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 100hr Due</CardDescription><CardTitle className={cn("text-2xl font-mono", next100 < 10 ? "text-destructive" : "")}>{next100.toFixed(1)}</CardTitle></CardHeader></Card>
      </div>

      <Tabs defaultValue="components" className="w-full">
        <TabsList>
          <TabsTrigger value="components">Tracked Components</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="logs">Maintenance Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
          </div>
          <Card>
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
                    <TableCell className="font-mono">{comp.serialNumber}</TableCell>
                    <TableCell>{comp.installDate ? format(new Date(comp.installDate), 'PPP') : 'N/A'}</TableCell>
                    <TableCell className="text-right font-mono">{comp.tsn.toFixed(1)}</TableCell>
                    <TableCell className="text-right font-mono">{comp.tso.toFixed(1)}</TableCell>
                    <TableCell className="text-right font-mono">{comp.totalTime?.toFixed(1) || '0.0'}</TableCell>
                  </TableRow>
                ))}
                {(!aircraft.components || aircraft.components.length === 0) && (
                  <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No components tracked.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-end">
            <DocumentUploader onDocumentUploaded={onDocumentUploaded} trigger={(open) => <Button size="sm" onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>} />
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead className="text-center w-[100px]">Set Expiry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(aircraft.documents || []).map((doc) => {
                  const textColor = getStatusColor(doc.expirationDate);
                  return (
                    <TableRow key={doc.name}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>{format(new Date(doc.uploadDate), 'PPP')}</TableCell>
                      <TableCell style={{ color: textColor }} className="font-semibold">
                        {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'No Expiry'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Popover>
                          <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><CalendarIcon className="h-4 w-4" /></Button></PopoverTrigger>
                          <PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined} onDateSelect={(date) => handleExpirationDateChange(doc.name, date)} /></PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewImage(doc.url)}><View className="mr-2 h-4 w-4" /> View</Button>
                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDocumentDelete(doc.name)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!aircraft.documents || aircraft.documents.length === 0) && (
                  <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No documents uploaded.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="flex items-center justify-center h-48 text-muted-foreground">Maintenance logs integration coming soon.</Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsOpen => !setIsOpen && setIsImageViewerOpen(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          {viewingImageUrl && <div className="relative h-[70vh] w-full"><img src={viewingImageUrl} alt="Document" className="h-full w-full object-contain" /></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
