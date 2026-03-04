
'use client';

import { use, useMemo, useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { DocumentUploader } from '@/components/document-uploader';
import { format, differenceInDays } from 'date-fns';
import { Edit, PlusCircle, Trash2, View, CalendarIcon, FileText, Settings2, Clock } from 'lucide-react';
import { AircraftForm } from '../aircraft-form';
import { ComponentForm } from '../component-form';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { DocumentExpirySettings } from '../../../admin/document-dates/page';
import Image from 'next/image';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  // --- Data Fetching ---
  const aircraftRef = useMemoFirebase(() => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null), [firestore, tenantId, aircraftId]);
  const componentsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`)) : null), [firestore, tenantId, aircraftId]);
  const logsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`)) : null), [firestore, tenantId, aircraftId]);
  const expirySettingsRef = useMemoFirebase(() => (firestore ? doc(firestore, `tenants/${tenantId}/settings`, 'document-expiry') : null), [firestore, tenantId]);

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  // --- Modal States ---
  const [isEditAircraftOpen, setIsEditAircraftOpen] = useState(false);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

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

  const onDocumentUploaded = (docDetails: any) => {
    const currentDocs = aircraft?.documents || [];
    handleDocumentUpdate([...currentDocs, docDetails]);
  };

  const handleExpirationDateChange = (docName: string, date: Date | undefined) => {
    const currentDocs = aircraft?.documents || [];
    const updatedDocs = currentDocs.map(d => d.name === docName ? { ...d, expirationDate: date ? date.toISOString() : null } : d);
    handleDocumentUpdate(updatedDocs);
  };

  const handleDocumentDelete = (docName: string) => {
    const currentDocs = aircraft?.documents || [];
    handleDocumentUpdate(currentDocs.filter(d => d.name !== docName));
    toast({ title: 'Document Removed' });
  };

  const handleViewDocument = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };

  if (isLoadingAircraft) {
    return <div className="p-8 space-y-6"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-48 w-full" /></div>;
  }

  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
          <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
        </div>
        <Button onClick={() => setIsEditAircraftOpen(true)}>
          <Edit className="mr-2 h-4 w-4" /> Edit Aircraft
        </Button>
      </div>

      {/* Persistent Overview Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> Current Hobbs</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{aircraft.currentHobbs?.toFixed(1) || '0.0'}</p></CardContent>
        </Card>
        <Card className="bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> Current Tacho</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{aircraft.currentTacho?.toFixed(1) || '0.0'}</p></CardContent>
        </Card>
        <Card className="bg-secondary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Settings2 className="h-4 w-4" /> Next 50hr Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-baseline">
              <p className="text-2xl font-bold">{aircraft.tachoAtNext50Inspection?.toFixed(1) || '0.0'}</p>
              <Badge variant="outline">{(aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0)} hrs rem.</Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Settings2 className="h-4 w-4" /> Next 100hr Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-baseline">
              <p className="text-2xl font-bold">{aircraft.tachoAtNext100Inspection?.toFixed(1) || '0.0'}</p>
              <Badge variant="outline">{(aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0)} hrs rem.</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="components" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="components">Tracked Components</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="space-y-4 mt-6">
          <div className="flex justify-end">
            <Button onClick={() => setIsAddComponentOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Component
            </Button>
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
                  {isLoadingComponents ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">Loading components...</TableCell></TableRow>
                  ) : components?.length ? (
                    components.map(comp => (
                      <TableRow key={comp.id}>
                        <TableCell className="font-medium">{comp.name}</TableCell>
                        <TableCell>{comp.manufacturer || 'N/A'}</TableCell>
                        <TableCell>{comp.serialNumber}</TableCell>
                        <TableCell>{comp.installDate ? format(new Date(comp.installDate), 'PPP') : 'N/A'}</TableCell>
                        <TableCell>{comp.tsn || '0.0'}</TableCell>
                        <TableCell>{comp.tso || '0.0'}</TableCell>
                        <TableCell>{comp.totalTime || '0.0'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No components tracked for this aircraft.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4 mt-6">
          <div className="flex justify-end">
            <DocumentUploader
              onDocumentUploaded={onDocumentUploaded}
              trigger={(open) => (
                <Button onClick={() => open()}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Document
                </Button>
              )}
            />
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead className="text-center">Set Expiry</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aircraft.documents?.length ? (
                    aircraft.documents.map(doc => {
                      const color = getStatusColor(doc.expirationDate);
                      return (
                        <TableRow key={doc.name}>
                          <TableCell className="font-medium">{doc.name}</TableCell>
                          <TableCell>
                            <span style={{ color: color || 'inherit' }} className="font-semibold">
                              {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8">
                                  <CalendarIcon className="h-4 w-4" />
                                </Button>
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
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" size="sm" onClick={() => handleViewDocument(doc.url)}>
                                <View className="mr-2 h-4 w-4" /> View
                              </Button>
                              <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDocumentDelete(doc.name)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No documents uploaded.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Maintenance Log History</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">Maintenance logs will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Modals */}
      <Dialog open={isEditAircraftOpen} onOpenChange={setIsEditAircraftOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Aircraft</DialogTitle></DialogHeader>
          <AircraftForm tenantId={tenantId} existingAircraft={aircraft} onSuccess={() => setIsEditAircraftOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isAddComponentOpen} onOpenChange={setIsAddComponentOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Add Component</DialogTitle></DialogHeader>
          <ComponentForm tenantId={tenantId} aircraftId={aircraftId} onSuccess={() => setIsAddComponentOpen(false)} />
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
