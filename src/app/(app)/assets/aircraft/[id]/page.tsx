
'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, FileText, Pencil, CalendarIcon, View, Trash2, Camera, FileUp } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { AircraftForm } from '../aircraft-form';
import { ComponentForm } from './component-form';
import { DocumentUploader } from '@/components/document-uploader';
import { usePermissions } from '@/hooks/use-permissions';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';

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

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const canEdit = hasPermission('assets-edit');

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`)) : null),
    [firestore, tenantId, aircraftId]
  );

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/settings`, 'document-expiry') : null),
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

    const sortedPeriods = [...(expirySettings.warningPeriods || [])].sort((a, b) => a.period - b.period);
    for (const warning of sortedPeriods) {
      if (daysUntilExpiry <= warning.period) return warning.color;
    }
    return expirySettings.defaultColor || null;
  };

  const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    if (!aircraft) return;
    const currentDocs = aircraft.documents || [];
    const updatedDocs = [...currentDocs, docDetails];
    if (aircraftRef) {
      updateDocumentNonBlocking(aircraftRef, { documents: updatedDocs });
      toast({ title: 'Document Added' });
    }
  };

  const handleExpirationDateChange = (docName: string, date: Date | undefined) => {
    if (!aircraft || !aircraftRef) return;
    const updatedDocs = (aircraft.documents || []).map(d => 
      d.name === docName ? { ...d, expirationDate: date ? date.toISOString() : null } : d
    );
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocs });
  };

  const handleDocumentDelete = (docName: string) => {
    if (!aircraft || !aircraftRef) return;
    const updatedDocs = (aircraft.documents || []).filter(d => d.name !== docName);
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocs });
    toast({ title: 'Document Removed' });
  };

  if (isLoadingAircraft) return <Skeleton className="h-96 w-full" />;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  return (
    <div className="flex flex-col gap-6">
      {/* High-Fidelity Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
          <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
        </div>
        {canEdit && (
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Pencil className="mr-2 h-4 w-4" /> Edit Aircraft</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Aircraft</DialogTitle>
                <DialogDescription>Update registration and meter details.</DialogDescription>
              </DialogHeader>
              <AircraftForm tenantId={tenantId} existingAircraft={aircraft} onSuccess={() => setIsEditOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Meter Dashboard - Always Visible */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Current Hobbs', value: aircraft.currentHobbs?.toFixed(1) || '0.0', sub: 'Total Time' },
          { label: 'Current Tacho', value: aircraft.currentTacho?.toFixed(1) || '0.0', sub: 'Engine Time' },
          { label: 'Next 50hr Due', value: aircraft.tachoAtNext50Inspection?.toFixed(1) || '0.0', sub: `${((aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0)).toFixed(1)} hrs rem.` },
          { label: 'Next 100hr Due', value: aircraft.tachoAtNext100Inspection?.toFixed(1) || '0.0', sub: `${((aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0)).toFixed(1)} hrs rem.` },
        ].map((stat, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest">{stat.label}</CardDescription>
              <CardTitle className="text-2xl font-mono">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="components" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="components">Tracked Components</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="logs">Maintenance Logs</TabsTrigger>
        </TabsList>

        {/* Components Tab */}
        <TabsContent value="components" className="space-y-4">
          <div className="flex justify-between items-center pt-4">
            <h3 className="text-lg font-semibold">Lifecycle Components</h3>
            <Dialog open={isAddComponentOpen} onOpenChange={setIsAddComponentOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Component</DialogTitle>
                  <DialogDescription>Track a new component or part.</DialogDescription>
                </DialogHeader>
                <ComponentForm aircraftId={aircraftId} tenantId={tenantId} onSuccess={() => setIsAddComponentOpen(false)} />
              </DialogContent>
            </Dialog>
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
                {components?.map(comp => (
                  <TableRow key={comp.id}>
                    <TableCell className="font-medium">{comp.name}</TableCell>
                    <TableCell>{comp.manufacturer}</TableCell>
                    <TableCell className="font-mono">{comp.serialNumber}</TableCell>
                    <TableCell>{comp.installDate ? format(new Date(comp.installDate), 'PP') : 'N/A'}</TableCell>
                    <TableCell className="text-right font-mono">{comp.tsn?.toFixed(1) || '0.0'}</TableCell>
                    <TableCell className="text-right font-mono">{comp.tso?.toFixed(1) || '0.0'}</TableCell>
                    <TableCell className="text-right font-mono">{comp.totalTime?.toFixed(1) || '0.0'}</TableCell>
                  </TableRow>
                ))}
                {(!components || components.length === 0) && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No tracked components found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-between items-center pt-4">
            <h3 className="text-lg font-semibold">Aircraft Document Vault</h3>
            <DocumentUploader
              onDocumentUploaded={onDocumentUploaded}
              trigger={(open) => <Button size="sm" onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>}
            />
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead className="text-center">Update Expiry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(aircraft.documents || []).map((doc) => {
                  const statusColor = getStatusColor(doc.expirationDate);
                  return (
                    <TableRow key={doc.name}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell style={{ color: statusColor || 'inherit' }} className="font-semibold">
                        {doc.expirationDate ? format(new Date(doc.expirationDate), 'PP') : 'No Expiry Set'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8"><CalendarIcon className="h-4 w-4" /></Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CustomCalendar selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined} onDateSelect={(date) => handleExpirationDateChange(doc.name, date)} />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setViewingImageUrl(doc.url); setIsImageViewerOpen(true); }}><View className="mr-2 h-4 w-4" /> View</Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDocumentDelete(doc.name)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Maintenance Logs Placeholder */}
        <TabsContent value="logs">
          <Card className="mt-4"><CardContent className="p-12 text-center text-muted-foreground">Maintenance logs module under construction.</CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          {viewingImageUrl && <div className="relative h-[70vh]"><Image src={viewingImageUrl} alt="Document" fill className="object-contain" /></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
