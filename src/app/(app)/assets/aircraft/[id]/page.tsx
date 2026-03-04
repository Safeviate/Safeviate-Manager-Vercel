
'use client';

import { use, useMemo, useState } from 'react';
import { doc, collection, query, where } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';
import { 
  Pencil, 
  PlusCircle, 
  Trash2, 
  Eye, 
  FileText, 
  CalendarIcon, 
  Upload,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';
import { DocumentUploader } from '@/components/document-uploader';
import { usePermissions } from '@/hooks/use-permissions';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const canEdit = hasPermission('assets-edit');

  // --- Data Fetching ---
  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`)) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  // --- Logic ---
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
      updatedDocs[existingDocIndex] = { ...docDetails, expirationDate: updatedDocs[existingDocIndex].expirationDate };
    } else {
      updatedDocs = [...currentDocs, docDetails];
    }
    handleDocumentUpdate(updatedDocs);
  };

  const handleExpirationDateChange = (docName: string, date: Date | undefined) => {
    const currentDocs = aircraft?.documents || [];
    const docIndex = currentDocs.findIndex(d => d.name === docName);
    if (docIndex > -1) {
      const updatedDocs = [...currentDocs];
      updatedDocs[docIndex].expirationDate = date ? date.toISOString() : null;
      handleDocumentUpdate(updatedDocs);
    }
  };

  const handleDocumentDelete = (docName: string) => {
    const currentDocs = aircraft?.documents || [];
    const updatedDocs = currentDocs.filter(d => d.name !== docName);
    handleDocumentUpdate(updatedDocs);
    toast({ title: 'Document Deleted' });
  };

  if (isLoadingAircraft) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  const next100hrRemaining = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="flex flex-col gap-6">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
          <p className="text-muted-foreground text-lg">
            {aircraft.make} {aircraft.model} • {aircraft.type}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="destructive" className="px-4 py-1 text-sm rounded-full">
            {next100hrRemaining.toFixed(1)} hrs to 100hr
          </Badge>
          <div className="flex gap-2 no-print">
            {canEdit && (
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" /> Edit Aircraft
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* METER DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">CURRENT HOBBS</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-mono font-bold">{(aircraft.currentHobbs || 0).toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">CURRENT TACHO</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-mono font-bold">{(aircraft.currentTacho || 0).toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-blue-600">NEXT 50HR DUE</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-mono font-bold text-blue-600">
              {aircraft.tachoAtNext50Inspection ? aircraft.tachoAtNext50Inspection.toFixed(1) : 'N/A'}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-orange-600">NEXT 100HR DUE</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-mono font-bold text-orange-600">
              {aircraft.tachoAtNext100Inspection ? aircraft.tachoAtNext100Inspection.toFixed(1) : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* TABBED WORKSPACE */}
      <Tabs defaultValue="components" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50 p-1 border rounded-lg">
          <TabsTrigger value="components" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Tracked Components</TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Documents</TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Maintenance Logs</TabsTrigger>
        </TabsList>

        {/* COMPONENTS TAB */}
        <TabsContent value="components" className="mt-6">
          <Card className="shadow-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl">Maintenance Components</CardTitle>
                <CardDescription>Lifed and trackable aircraft components.</CardDescription>
              </div>
              {canEdit && (
                <Button size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Component
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-transparent hover:bg-transparent border-none">
                    <TableHead className="font-semibold text-muted-foreground">Component</TableHead>
                    <TableHead className="font-semibold text-muted-foreground">Manufacturer</TableHead>
                    <TableHead className="font-semibold text-muted-foreground">Serial Number</TableHead>
                    <TableHead className="font-semibold text-muted-foreground">Install Date</TableHead>
                    <TableHead className="font-semibold text-muted-foreground">TSN</TableHead>
                    <TableHead className="font-semibold text-muted-foreground">TSO</TableHead>
                    <TableHead className="font-semibold text-muted-foreground">Total Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingComponents ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10">Loading components...</TableCell></TableRow>
                  ) : components && components.length > 0 ? (
                    components.map(comp => (
                      <TableRow key={comp.id}>
                        <TableCell className="font-medium">{comp.name}</TableCell>
                        <TableCell>{comp.manufacturer}</TableCell>
                        <TableCell>{comp.serialNumber}</TableCell>
                        <TableCell>{comp.installDate ? format(new Date(comp.installDate), 'PP') : 'N/A'}</TableCell>
                        <TableCell>{comp.tsn?.toFixed(1)}</TableCell>
                        <TableCell>{comp.tso?.toFixed(1)}</TableCell>
                        <TableCell>{comp.totalTime?.toFixed(1)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-20 text-muted-foreground">
                        No components tracked for this aircraft.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents" className="mt-6">
          <Card className="shadow-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl">Aircraft Documents</CardTitle>
                <CardDescription>Certificates, insurance, and registration documents.</CardDescription>
              </div>
              <DocumentUploader
                onDocumentUploaded={onDocumentUploaded}
                trigger={(open) => (
                  <Button size="sm" onClick={() => open()}>
                    <Upload className="mr-2 h-4 w-4" /> Add Document
                  </Button>
                )}
              />
            </CardHeader>
            <CardContent>
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
                  {aircraft.documents && aircraft.documents.length > 0 ? (
                    aircraft.documents.map((doc) => {
                      const statusColor = getStatusColor(doc.expirationDate);
                      return (
                        <TableRow key={doc.name}>
                          <TableCell className="font-medium">{doc.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {statusColor && (
                                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
                              )}
                              {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'No Expiry Set'}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8">
                                  <CalendarIcon className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="center">
                                <CustomCalendar
                                  selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined}
                                  onDateSelect={(date) => handleExpirationDateChange(doc.name, date)}
                                />
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" size="sm" onClick={() => { setViewingImageUrl(doc.url); setIsImageViewerOpen(true); }}>
                                <Eye className="mr-2 h-4 w-4" /> View
                              </Button>
                              {canEdit && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDocumentDelete(doc.name)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20 text-muted-foreground">
                        No documents uploaded.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOGS TAB */}
        <TabsContent value="logs" className="mt-6">
          <Card className="shadow-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl">Maintenance Logs</CardTitle>
                <CardDescription>Historical maintenance and repair logbook entries.</CardDescription>
              </div>
              {canEdit && (
                <Button size="sm" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" /> New Log Entry
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
                <FileText className="mx-auto h-10 w-10 opacity-20 mb-2" />
                <p>Maintenance logs will be listed here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DOCUMENT VIEWER DIALOG */}
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Viewer</DialogTitle>
          </DialogHeader>
          {viewingImageUrl && (
            <div className="relative h-[75vh] w-full mt-4">
              <Image src={viewingImageUrl} alt="Document" fill style={{ objectFit: 'contain' }} className="rounded-lg" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
