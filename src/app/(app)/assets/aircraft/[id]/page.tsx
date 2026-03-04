
'use client';

import { use, useMemo, useState } from 'react';
import { doc, collection, query } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, PlusCircle, CalendarIcon, Trash2, Eye, View, Upload } from 'lucide-react';
import { AircraftForm } from '../aircraft-form';
import { ComponentForm } from '../component-form';
import { DocumentUploader } from '@/components/document-uploader';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { format, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const DetailCard = ({ title, value, subValue }: { title: string; value: string; subValue?: string }) => (
  <Card className="shadow-none">
    <CardHeader className="pb-2">
      <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-mono font-bold">{value}</div>
      {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
    </CardContent>
  </Card>
);

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const [isEditAircraftOpen, setIsEditAircraftOpen] = useState(false);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const aircraftRef = useMemoFirebase(() => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null), [firestore, aircraftId]);
  const componentsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components')) : null), [firestore, aircraftId]);
  const expirySettingsRef = useMemoFirebase(() => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null), [firestore, tenantId]);

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  const getStatusColor = (expirationDate: string | null | undefined): string | null => {
    if (!expirationDate || !expirySettings) return null;

    const today = new Date();
    const expiry = new Date(expirationDate);
    const daysUntilExpiry = differenceInDays(expiry, today);

    if (daysUntilExpiry < 0) {
      return expirySettings.expiredColor || '#ef4444';
    }

    // Sort periods ascending: 30, 60, 90...
    const sortedPeriods = [...(expirySettings.warningPeriods || [])].sort((a, b) => a.period - b.period);
    for (const warning of sortedPeriods) {
      if (daysUntilExpiry <= warning.period) {
        return warning.color;
      }
    }

    return expirySettings.defaultColor || null;
  };

  const handleDocumentDelete = (docNameToDelete: string) => {
    if (!aircraft || !firestore) return;
    const updatedDocs = (aircraft.documents || []).filter(d => d.name !== docNameToDelete);
    updateDocumentNonBlocking(aircraftRef!, { documents: updatedDocs });
    toast({ title: 'Document Removed' });
  };

  const handleExpirationDateChange = (docName: string, date: Date | undefined) => {
    if (!aircraft || !firestore) return;
    const updatedDocs = (aircraft.documents || []).map(d => 
      d.name === docName ? { ...d, expirationDate: date ? date.toISOString() : null } : d
    );
    updateDocumentNonBlocking(aircraftRef!, { documents: updatedDocs });
  };

  const handleDocumentUploaded = (docDetails: any) => {
    if (!aircraft || !firestore) return;
    const currentDocs = aircraft.documents || [];
    updateDocumentNonBlocking(aircraftRef!, { documents: [...currentDocs, docDetails] });
  };

  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };

  if (isLoadingAircraft) return <Skeleton className="h-96 w-full" />;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  return (
    <div className="space-y-6">
      {/* High-Fidelity Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
          <p className="text-lg text-muted-foreground font-medium">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
        </div>
        <Button onClick={() => setIsEditAircraftOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit Aircraft
        </Button>
      </div>

      {/* Persistent Overview Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DetailCard title="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1) || '0.0'} />
        <DetailCard title="Current Tacho" value={aircraft.currentTacho?.toFixed(1) || '0.0'} />
        <DetailCard 
          title="Next 50hr Due" 
          value={aircraft.tachoAtNext50Inspection?.toFixed(1) || 'N/A'} 
          subValue={aircraft.tachoAtNext50Inspection ? `${(aircraft.tachoAtNext50Inspection - (aircraft.currentTacho || 0)).toFixed(1)} hrs rem.` : undefined}
        />
        <DetailCard 
          title="Next 100hr Due" 
          value={aircraft.tachoAtNext100Inspection?.toFixed(1) || 'N/A'} 
          subValue={aircraft.tachoAtNext100Inspection ? `${(aircraft.tachoAtNext100Inspection - (aircraft.currentTacho || 0)).toFixed(1)} hrs rem.` : undefined}
        />
      </div>

      {/* Tabbed Workspace */}
      <Tabs defaultValue="components" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="components" className="text-base font-semibold">Tracked Components</TabsTrigger>
          <TabsTrigger value="documents" className="text-base font-semibold">Documents</TabsTrigger>
          <TabsTrigger value="maintenance" className="text-base font-semibold">Maintenance Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingComponent(null); setIsAddComponentOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Component
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
                    <TableHead className="text-right">TSN</TableHead>
                    <TableHead className="text-right">TSO</TableHead>
                    <TableHead className="text-right">Total Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingComponents ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8"><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                  ) : (components || []).length > 0 ? (
                    components!.map(comp => (
                      <TableRow key={comp.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setEditingComponent(comp); setIsAddComponentOpen(true); }}>
                        <TableCell className="font-semibold">{comp.name}</TableCell>
                        <TableCell>{comp.manufacturer}</TableCell>
                        <TableCell className="font-mono">{comp.serialNumber}</TableCell>
                        <TableCell>{comp.installDate ? format(new Date(comp.installDate), 'PPP') : 'N/A'}</TableCell>
                        <TableCell className="text-right font-mono">{comp.tsn?.toFixed(1) || '0.0'}</TableCell>
                        <TableCell className="text-right font-mono">{comp.tso?.toFixed(1) || '0.0'}</TableCell>
                        <TableCell className="text-right font-mono">{comp.totalTime?.toFixed(1) || '0.0'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No tracked components recorded.</TableCell></TableRow>
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
              trigger={(open) => (
                <Button onClick={() => open()}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Document
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
                    <TableHead className="text-center w-24">Set Expiry</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(aircraft.documents || []).length > 0 ? (
                    aircraft.documents!.map(doc => {
                      const statusColor = getStatusColor(doc.expirationDate);
                      return (
                        <TableRow key={doc.name}>
                          <TableCell className="font-medium">{doc.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {statusColor && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColor }} />}
                              <span style={{ color: statusColor || 'inherit' }} className="font-semibold">
                                {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'No Expiry Set'}
                              </span>
                            </div>
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
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleViewImage(doc.url)}>
                                <View className="mr-2 h-4 w-4" />
                                View
                              </Button>
                              <Button variant="destructive" size="icon" onClick={() => handleDocumentDelete(doc.name)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No documents uploaded.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Maintenance Logs</CardTitle></CardHeader>
            <CardContent className="text-center py-12 text-muted-foreground">
              Maintenance logging is currently managed via flight records.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals & Forms */}
      <AircraftForm isOpen={isEditAircraftOpen} setIsOpen={setIsEditAircraftOpen} tenantId={tenantId} existingAircraft={aircraft} />
      <ComponentForm isOpen={isAddComponentOpen} setIsOpen={setIsAddComponentOpen} tenantId={tenantId} aircraftId={aircraftId} existingComponent={editingComponent} />
      
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          {viewingImageUrl && (
            <div className="relative h-[70vh] w-full mt-4">
              <Image src={viewingImageUrl} alt="Aircraft Document" fill style={{ objectFit: 'contain' }} className="rounded-lg" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
