
'use client';

import { use, useMemo, useState } from 'react';
import { doc, collection, query, where } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/aircraft';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, differenceInDays } from 'date-fns';
import { PlusCircle, FileText, Calendar, History, Wrench, Edit, View, CalendarIcon, Trash2 } from 'lucide-react';
import { AircraftForm } from '../aircraft-form';
import { AddComponentDialog } from '../add-component-dialog';
import { DocumentUploader } from '@/components/document-uploader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { useToast } from '@/hooks/use-toast';
import type { DocumentExpirySettings } from '../../../admin/document-dates/page';
import Image from 'next/image';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const aircraftId = resolvedParams.id;
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const aircraftRef = useMemoFirebase(() => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null), [firestore, tenantId, aircraftId]);
  const componentsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`)) : null), [firestore, tenantId, aircraftId]);
  const logsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`)) : null), [firestore, tenantId, aircraftId]);
  const expirySettingsRef = useMemoFirebase(() => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null), [firestore, tenantId]);

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

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

  const handleDocumentUploaded = (docDetails: any) => {
    if (!aircraft || !firestore) return;
    const currentDocs = aircraft.documents || [];
    updateDocumentNonBlocking(aircraftRef!, { documents: [...currentDocs, docDetails] });
    toast({ title: "Document Added" });
  };

  const handleExpirationDateChange = (docName: string, date: Date | undefined) => {
    if (!aircraft || !firestore) return;
    const currentDocs = aircraft.documents || [];
    const updatedDocs = currentDocs.map(d => d.name === docName ? { ...d, expirationDate: date ? date.toISOString() : null } : d);
    updateDocumentNonBlocking(aircraftRef!, { documents: updatedDocs });
  };

  const handleDocumentDelete = (docName: string) => {
    if (!aircraft || !firestore) return;
    const updatedDocs = (aircraft.documents || []).filter(d => d.name !== docName);
    updateDocumentNonBlocking(aircraftRef!, { documents: updatedDocs });
    toast({ title: "Document Deleted" });
  };

  if (isLoadingAircraft) {
    return <div className="space-y-6"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
          <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsEditOpen(true)} variant="outline">
            <Edit className="mr-2 h-4 w-4" /> Edit Aircraft
          </Button>
        </div>
      </div>

      {/* Persistent Overview Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Current Hobbs</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{aircraft.currentHobbs?.toFixed(1) || '0.0'}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Current Tacho</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{aircraft.currentTacho?.toFixed(1) || '0.0'}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Next 50hr Due</CardTitle></CardHeader>
          <CardContent>
            <div className="flex justify-between items-baseline">
              <div className="text-2xl font-bold">{aircraft.tachoAtNext50Inspection?.toFixed(1) || 'N/A'}</div>
              <Badge variant="outline" className="ml-2">{(aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0)} hrs rem.</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Next 100hr Due</CardTitle></CardHeader>
          <CardContent>
            <div className="flex justify-between items-baseline">
              <div className="text-2xl font-bold">{aircraft.tachoAtNext100Inspection?.toFixed(1) || 'N/A'}</div>
              <Badge variant="outline" className="ml-2">{(aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0)} hrs rem.</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="components" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="components"><Wrench className="mr-2 h-4 w-4" /> Components</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="mr-2 h-4 w-4" /> Documents</TabsTrigger>
          <TabsTrigger value="logs"><History className="mr-2 h-4 w-4" /> Maintenance Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tracked Components</CardTitle>
                <CardDescription>Management of life-limited and overhauled parts.</CardDescription>
              </div>
              <Button onClick={() => setIsAddComponentOpen(true)} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Component
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
                    <TableRow><TableCell colSpan={7} className="text-center">Loading components...</TableCell></TableRow>
                  ) : components && components.length > 0 ? (
                    components.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.manufacturer || 'N/A'}</TableCell>
                        <TableCell>{c.serialNumber || 'N/A'}</TableCell>
                        <TableCell>{c.installDate ? format(new Date(c.installDate), 'PPP') : 'N/A'}</TableCell>
                        <TableCell className="text-right">{c.tsn?.toFixed(1) || '0.0'}</TableCell>
                        <TableCell className="text-right">{c.tso?.toFixed(1) || '0.0'}</TableCell>
                        <TableCell className="text-right">{c.totalTime?.toFixed(1) || '0.0'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No components tracked yet.</TableCell></TableRow>
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
                <CardDescription>C of A, Registration, Insurance, and other certifications.</CardDescription>
              </div>
              <DocumentUploader
                onDocumentUploaded={handleDocumentUploaded}
                trigger={(open) => <Button onClick={() => open()} size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>}
              />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead className="text-center">Set Expiry</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aircraft.documents && aircraft.documents.length > 0 ? (
                    aircraft.documents.map((doc) => {
                      const color = getStatusColor(doc.expirationDate);
                      return (
                        <TableRow key={doc.name}>
                          <TableCell className="font-medium">{doc.name}</TableCell>
                          <TableCell>{format(new Date(doc.uploadDate), 'PPP')}</TableCell>
                          <TableCell style={{ color: color || 'inherit' }} className="font-semibold">
                            {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8"><CalendarIcon className="h-4 w-4" /></Button>
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
                              <Button variant="ghost" size="icon" onClick={() => handleDocumentDelete(doc.name)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No documents uploaded.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Maintenance Log History</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingLogs ? (
                    <TableRow><TableCell colSpan={3} className="text-center">Loading logs...</TableCell></TableRow>
                  ) : logs && logs.length > 0 ? (
                    logs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{format(new Date(log.date), 'PPP')}</TableCell>
                        <TableCell>{log.description}</TableCell>
                        <TableCell><Badge variant="secondary">Maintenance</Badge></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No logs found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AircraftForm aircraft={aircraft} isOpen={isEditOpen} setIsOpen={setIsEditOpen} />
      <AddComponentDialog aircraftId={aircraftId} isOpen={isAddComponentOpen} setIsOpen={setIsAddComponentOpen} />
      
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          {viewingImageUrl && <div className="relative h-[70vh] w-full"><Image src={viewingImageUrl} alt="Document" fill className="object-contain" /></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
