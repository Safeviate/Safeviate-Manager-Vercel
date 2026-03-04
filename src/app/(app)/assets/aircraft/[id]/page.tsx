
'use client';

import { use, useMemo, useState } from 'react';
import { doc, collection, query } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, differenceInDays } from 'date-fns';
import { ArrowLeft, Pencil, PlusCircle, View, CalendarIcon, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { AircraftForm } from '../aircraft-form';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { DocumentUploader } from '@/components/document-uploader';
import { ComponentForm } from '../component-form';
import { useToast } from '@/hooks/use-toast';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const MetricCard = ({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) => (
  <Card className="shadow-none">
    <CardHeader className="pb-2">
      <CardDescription className="text-xs font-bold uppercase tracking-wider">{title}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold tracking-tighter">{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
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

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`)) : null),
    [firestore, tenantId, aircraftId]
  );

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);
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

  const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    const currentDocs = aircraft?.documents || [];
    const existingDocIndex = currentDocs.findIndex(d => d.name === docDetails.name);
    let updatedDocs;
    if (existingDocIndex > -1) {
      updatedDocs = [...currentDocs];
      updatedDocs[existingDocIndex] = { ...docDetails, expirationDate: updatedDocs[existingDocIndex].expirationDate || null };
    } else {
      updatedDocs = [...currentDocs, docDetails];
    }
    handleDocumentUpdate(updatedDocs);
  };

  const handleExpirationDateChange = (docName: string, date: Date | undefined) => {
    const currentDocs = [...(aircraft?.documents || [])];
    const docIndex = currentDocs.findIndex(d => d.name === docName);
    if (docIndex > -1) {
      currentDocs[docIndex].expirationDate = date ? date.toISOString() : null;
      handleDocumentUpdate(currentDocs);
    }
  };

  const handleDocumentDelete = (docName: string) => {
    const updatedDocs = (aircraft?.documents || []).filter(d => d.name !== docName);
    handleDocumentUpdate(updatedDocs);
    toast({ title: 'Document Deleted' });
  };

  if (isLoadingAircraft || isLoadingComponents) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!aircraft) return <div className="text-center py-10">Aircraft not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/assets/aircraft"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
          </div>
        </div>
        <AircraftForm
          tenantId={tenantId}
          existingAircraft={aircraft}
          trigger={<Button variant="outline"><Pencil className="mr-2 h-4 w-4" /> Edit Aircraft</Button>}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1) || '0.0'} />
        <MetricCard title="Current Tacho" value={aircraft.currentTacho?.toFixed(1) || '0.0'} />
        <MetricCard 
          title="Next 50hr Due" 
          value={aircraft.tachoAtNext50Inspection?.toFixed(1) || 'N/A'} 
          subtitle={aircraft.tachoAtNext50Inspection ? `${(aircraft.tachoAtNext50Inspection - (aircraft.currentTacho || 0)).toFixed(1)} hrs rem.` : undefined}
        />
        <MetricCard 
          title="Next 100hr Due" 
          value={aircraft.tachoAtNext100Inspection?.toFixed(1) || 'N/A'} 
          subtitle={aircraft.tachoAtNext100Inspection ? `${(aircraft.tachoAtNext100Inspection - (aircraft.currentTacho || 0)).toFixed(1)} hrs rem.` : undefined}
        />
      </div>

      <Tabs defaultValue="components" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="components">Tracked Components</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="space-y-4">
          <div className="flex justify-between items-center py-4">
            <h2 className="text-xl font-semibold">Asset Components</h2>
            <ComponentForm tenantId={tenantId} aircraftId={aircraftId} />
          </div>
          <Card className="shadow-none">
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
                  {components?.length ? components.map(comp => (
                    <TableRow key={comp.id}>
                      <TableCell className="font-medium">{comp.name}</TableCell>
                      <TableCell>{comp.manufacturer || 'N/A'}</TableCell>
                      <TableCell>{comp.serialNumber || 'N/A'}</TableCell>
                      <TableCell>{comp.installDate ? format(new Date(comp.installDate), 'PPP') : 'N/A'}</TableCell>
                      <TableCell>{comp.tsn || 0} hrs</TableCell>
                      <TableCell>{comp.tso || 0} hrs</TableCell>
                      <TableCell>{comp.totalTime || 0} hrs</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No tracked components registered.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-between items-center py-4">
            <h2 className="text-xl font-semibold">Aircraft Document Vault</h2>
            <DocumentUploader
              onDocumentUploaded={onDocumentUploaded}
              trigger={(open) => <Button onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>}
            />
          </div>
          <Card className="shadow-none">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead className="text-center w-[80px]">Set Expiry</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aircraft.documents?.length ? aircraft.documents.map(doc => (
                    <TableRow key={doc.name}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>
                        <span style={{ color: getStatusColor(doc.expirationDate) || 'inherit' }} className="font-semibold">
                          {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><CalendarIcon className="h-4 w-4" /></Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CustomCalendar
                              selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined}
                              onDateSelect={(date) => handleExpirationDateChange(doc.name, date)}
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setViewingImageUrl(doc.url); setIsImageViewerOpen(true); }}><View className="mr-2 h-4 w-4" /> View</Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDocumentDelete(doc.name)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">No documents uploaded.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card className="shadow-none mt-4">
            <CardContent className="py-10 text-center text-muted-foreground">
              Maintenance logs are linked through the aircraft historical record.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          {viewingImageUrl && <div className="relative h-[70vh] w-full"><Image src={viewingImageUrl} alt="Document" fill className="object-contain" /></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
