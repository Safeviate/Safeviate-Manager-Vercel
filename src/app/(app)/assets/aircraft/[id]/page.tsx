'use client';

import { use, useMemo, useState } from 'react';
import { doc, collection, query, where } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { DocumentUploader } from '@/components/document-uploader';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { CalendarIcon, Eye, Pencil, PlusCircle, Trash2, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';
import { AircraftForm } from '../aircraft-form';
import { ComponentForm } from '../component-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`)) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);

  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

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
    return expirySettings.defaultColor || '#22c55e';
  };

  const handleDocumentUpdate = (updatedDocuments: any[]) => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocuments });
  };

  const onDocumentUploaded = (docDetails: any) => {
    const currentDocs = aircraft?.documents || [];
    const existingIndex = currentDocs.findIndex(d => d.name === docDetails.name);
    let updatedDocs;
    if (existingIndex > -1) {
      updatedDocs = [...currentDocs];
      updatedDocs[existingIndex] = { ...docDetails, expirationDate: currentDocs[existingIndex].expirationDate };
    } else {
      updatedDocs = [...currentDocs, docDetails];
    }
    handleDocumentUpdate(updatedDocs);
  };

  const handleExpirationDateChange = (docName: string, date: Date | undefined) => {
    const currentDocs = aircraft?.documents || [];
    const index = currentDocs.findIndex(d => d.name === docName);
    if (index > -1) {
      const updatedDocs = [...currentDocs];
      updatedDocs[index].expirationDate = date ? date.toISOString() : null;
      handleDocumentUpdate(updatedDocs);
    }
  };

  const handleDocumentDelete = (docName: string) => {
    const updatedDocs = (aircraft?.documents || []).filter(d => d.name !== docName);
    handleDocumentUpdate(updatedDocs);
    toast({ title: 'Document Deleted' });
  };

  if (isLoadingAircraft) return <Skeleton className="h-96 w-full" />;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Current Hobbs</CardDescription><CardTitle className="text-2xl font-mono">{(aircraft.currentHobbs || 0).toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Current Tacho</CardDescription><CardTitle className="text-2xl font-mono">{(aircraft.currentTacho || 0).toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 50hr Due</CardDescription><CardTitle className={cn("text-2xl font-mono", next50 < 5 ? "text-destructive" : "")}>{next50.toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 100hr Due</CardDescription><CardTitle className={cn("text-2xl font-mono", next100 < 10 ? "text-destructive" : "")}>{next100.toFixed(1)}</CardTitle></CardHeader></Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div><p className="text-sm font-medium text-muted-foreground">Type</p><p className="text-lg">{aircraft.type || 'N/A'}</p></div>
              <div><p className="text-sm font-medium text-muted-foreground">Frame Hours</p><p className="text-lg">{(aircraft.frameHours || 0).toFixed(1)}</p></div>
              <div><p className="text-sm font-medium text-muted-foreground">Engine Hours</p><p className="text-lg">{(aircraft.engineHours || 0).toFixed(1)}</p></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Aircraft Documents</CardTitle><CardDescription>Regulatory and maintenance documentation.</CardDescription></div>
              <DocumentUploader onDocumentUploaded={onDocumentUploaded} trigger={(open) => <Button onClick={() => open()} size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>} />
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50"><th className="h-10 px-4 text-left font-medium">Document</th><th className="h-10 px-4 text-left font-medium">Expiry</th><th className="h-10 px-4 text-center font-medium">Set Expiry</th><th className="h-10 px-4 text-right font-medium">Actions</th></tr></thead>
                  <tbody>
                    {(aircraft.documents || []).map((doc) => (
                      <tr key={doc.name} className="border-b">
                        <td className="p-4 font-medium">{doc.name}</td>
                        <td className="p-4" style={{ color: getStatusColor(doc.expirationDate) || 'inherit' }}>{doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}</td>
                        <td className="p-4 text-center">
                          <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><CalendarIcon className="h-4 w-4" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined} onDateSelect={(date) => handleExpirationDateChange(doc.name, date)} /></PopoverContent></Popover>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setViewingImageUrl(doc.url); setIsImageViewerOpen(true); }}><Eye className="mr-2 h-4 w-4" /> View</Button>
                            <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDocumentDelete(doc.name)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Tracked Components</CardTitle><CardDescription>Life-limited parts and assemblies.</CardDescription></div>
              <ComponentForm tenantId={tenantId} aircraftId={aircraftId} trigger={<Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>} />
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50"><th className="h-10 px-4 text-left font-medium">Component</th><th className="h-10 px-4 text-left font-medium">Manufacturer</th><th className="h-10 px-4 text-left font-medium">Serial No.</th><th className="h-10 px-4 text-left font-medium">Install Date</th><th className="h-10 px-4 text-right font-medium">TSN</th><th className="h-10 px-4 text-right font-medium">TSO</th><th className="h-10 px-4 text-right font-medium">Total Time</th></tr></thead>
                  <tbody>
                    {(components || []).map((comp) => (
                      <tr key={comp.id} className="border-b">
                        <td className="p-4 font-medium">{comp.name}</td>
                        <td className="p-4">{comp.manufacturer}</td>
                        <td className="p-4">{comp.serialNumber}</td>
                        <td className="p-4">{comp.installDate ? format(new Date(comp.installDate), 'PP') : 'N/A'}</td>
                        <td className="p-4 text-right">{comp.tsn?.toFixed(1)}</td>
                        <td className="p-4 text-right">{comp.tso?.toFixed(1)}</td>
                        <td className="p-4 text-right">{comp.totalTime?.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Maintenance Logs</CardTitle><CardDescription>Chronological record of maintenance activities.</CardDescription></div>
              <Button size="sm"><Wrench className="mr-2 h-4 w-4" /> Log Activity</Button>
            </CardHeader>
            <CardContent><p className="text-center text-muted-foreground py-8">Maintenance log implementation coming soon.</p></CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          {viewingImageUrl && <div className="relative h-[80vh]"><Image src={viewingImageUrl} alt="Document" fill style={{ objectFit: 'contain' }} /></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
