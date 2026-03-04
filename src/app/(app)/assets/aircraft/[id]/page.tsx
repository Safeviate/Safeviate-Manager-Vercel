
'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Plus, FileText, Calendar as CalendarIcon, Eye, Trash2, Camera, FileUp, View, Upload } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { AircraftForm } from '../aircraft-form';
import { ComponentForm } from './component-form';
import { DocumentUploader } from '@/components/document-uploader';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
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

  const [isEditAircraftOpen, setIsEditAircraftOpen] = useState(false);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components')) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);

  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };

  const handleDocumentUploaded = (docDetails: any) => {
    if (!firestore || !aircraft) return;
    const currentDocs = aircraft.documents || [];
    const updatedDocs = [...currentDocs, docDetails];
    updateDocumentNonBlocking(aircraftRef!, { documents: updatedDocs });
  };

  const handleDocumentDelete = (docName: string) => {
    if (!firestore || !aircraft) return;
    const updatedDocs = (aircraft.documents || []).filter(d => d.name !== docName);
    updateDocumentNonBlocking(aircraftRef!, { documents: updatedDocs });
    toast({ title: "Document Deleted" });
  };

  const handleExpirationDateChange = (docName: string, date: Date | undefined) => {
    if (!firestore || !aircraft) return;
    const updatedDocs = (aircraft.documents || []).map(d => 
      d.name === docName ? { ...d, expirationDate: date ? date.toISOString() : null } : d
    );
    updateDocumentNonBlocking(aircraftRef!, { documents: updatedDocs });
  };

  if (isLoadingAircraft) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!aircraft) {
    return <div className="text-center py-20">Aircraft not found.</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
          <p className="text-xl text-muted-foreground mt-1">
            {aircraft.make} {aircraft.model} • {aircraft.type}
          </p>
        </div>
        <Button variant="outline" onClick={() => setIsEditAircraftOpen(true)}>
          <Edit className="mr-2 h-4 w-4" /> Edit Aircraft
        </Button>
      </div>

      {/* Meter Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-[10px] font-bold tracking-widest">Current Hobbs</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tabular-nums">{(aircraft.currentHobbs || 0).toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-[10px] font-bold tracking-widest">Current Tacho</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tabular-nums">{(aircraft.currentTacho || 0).toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-[10px] font-bold tracking-widest text-blue-600">Next 50hr Due</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-blue-600 tabular-nums">
              {aircraft.tachoAtNext50Inspection ? aircraft.tachoAtNext50Inspection.toFixed(1) : 'N/A'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-[10px] font-bold tracking-widest text-orange-600">Next 100hr Due</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-orange-600 tabular-nums">
              {aircraft.tachoAtNext100Inspection ? aircraft.tachoAtNext100Inspection.toFixed(1) : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Workspace */}
      <Tabs defaultValue="components" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-12 bg-muted/50 p-1">
          <TabsTrigger value="components" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Tracked Components</TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Documents</TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Maintenance Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Maintenance Components</CardTitle>
                <CardDescription>Lifed and trackable aircraft components.</CardDescription>
              </div>
              <Button onClick={() => setIsAddComponentOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Component
              </Button>
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
                  {isLoadingComponents ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10">Loading components...</TableCell></TableRow>
                  ) : components?.length ? (
                    components.map(comp => (
                      <TableRow key={comp.id}>
                        <TableCell className="font-medium">{comp.name}</TableCell>
                        <TableCell>{comp.manufacturer}</TableCell>
                        <TableCell>{comp.serialNumber}</TableCell>
                        <TableCell>{comp.installDate ? format(new Date(comp.installDate), 'PP') : 'N/A'}</TableCell>
                        <TableCell className="text-right tabular-nums">{comp.tsn || 0}</TableCell>
                        <TableCell className="text-right tabular-nums">{comp.tso || 0}</TableCell>
                        <TableCell className="text-right tabular-nums">{comp.totalTime || 0}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={7} className="text-center py-20 text-muted-foreground">No components tracked for this aircraft.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Aircraft Documents</CardTitle>
                <CardDescription>Certificates of Airworthiness, Registration, and Insurance.</CardDescription>
              </div>
              <DocumentUploader
                onDocumentUploaded={handleDocumentUploaded}
                trigger={(open) => (
                  <Button onClick={() => open()}>
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
                  {aircraft.documents?.length ? (
                    aircraft.documents.map((doc) => (
                      <TableRow key={doc.name}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell>
                          {doc.expirationDate ? format(new Date(doc.expirationDate), 'PP') : 'No Expiry Set'}
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
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleViewImage(doc.url)}>
                              <Eye className="mr-2 h-4 w-4" /> View
                            </Button>
                            <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDocumentDelete(doc.name)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground">No documents uploaded yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Logs</CardTitle>
              <CardDescription>A chronological record of maintenance actions.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-20 text-muted-foreground">Maintenance log entries will appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AircraftForm
        isOpen={isEditAircraftOpen}
        setIsOpen={setIsEditAircraftOpen}
        existingAircraft={aircraft}
        tenantId={tenantId}
      />

      <ComponentForm
        isOpen={isAddComponentOpen}
        setIsOpen={setIsAddComponentOpen}
        aircraftId={aircraftId}
        tenantId={tenantId}
      />

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
