
'use client';

import { use, useState, useMemo } from 'react';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Plus, Trash2, CalendarIcon, View, Edit, Wrench } from 'lucide-react';
import Link from 'next/link';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { AircraftForm } from '../aircraft-form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { DocumentUploader } from '@/components/document-uploader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`)) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);

  const maintenanceQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: maintenanceLogs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(maintenanceQuery);

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/settings/document-expiry`) : null),
    [firestore, tenantId]
  );
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [isLogActivityOpen, setIsLogActivityOpen] = useState(false);
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

  const handleUpdateDocuments = (updatedDocs: any[]) => {
    if (aircraftRef) updateDocumentNonBlocking(aircraftRef, { documents: updatedDocs });
  };

  const onDocumentUploaded = (docDetails: any) => {
    const currentDocs = aircraft?.documents || [];
    const existingIndex = currentDocs.findIndex(d => d.name === docDetails.name);
    let updatedDocs;
    if (existingIndex > -1) {
      updatedDocs = [...currentDocs];
      updatedDocs[existingIndex] = { ...docDetails, expirationDate: updatedDocs[existingIndex].expirationDate };
    } else {
      updatedDocs = [...currentDocs, docDetails];
    }
    handleUpdateDocuments(updatedDocs);
  };

  const handleAddComponent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newComponent = {
      name: formData.get('name') as string,
      manufacturer: formData.get('manufacturer') as string,
      serialNumber: formData.get('serialNumber') as string,
      installDate: formData.get('installDate') as string,
      tsn: parseFloat(formData.get('tsn') as string) || 0,
      tso: parseFloat(formData.get('tso') as string) || 0,
      totalTime: parseFloat(formData.get('totalTime') as string) || 0,
    };
    if (firestore) {
      const colRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`);
      addDocumentNonBlocking(colRef, newComponent);
      setIsAddComponentOpen(false);
    }
  };

  const handleLogActivity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newLog = {
      maintenanceType: formData.get('type') as string,
      date: formData.get('date') as string,
      details: formData.get('details') as string,
      reference: formData.get('reference') as string,
      ameNo: formData.get('ameNo') as string,
      amoNo: formData.get('amoNo') as string,
    };
    if (firestore) {
      const colRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
      addDocumentNonBlocking(colRef, newLog);
      setIsLogActivityOpen(false);
    }
  };

  if (isLoadingAircraft) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  const next50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const next100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button asChild variant="outline" size="sm">
          <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link>
        </Button>
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
          <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}><Edit className="mr-2 h-4 w-4" /> Edit Aircraft</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Current Hobbs</CardDescription><CardTitle className="text-2xl font-mono">{(aircraft.currentHobbs || 0).toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Current Tacho</CardDescription><CardTitle className="text-2xl font-mono">{(aircraft.currentTacho || 0).toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 50hr Due</CardDescription><CardTitle className={cn("text-2xl font-mono", next50 < 5 ? "text-destructive" : "")}>{next50.toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 100hr Due</CardDescription><CardTitle className={cn("text-2xl font-mono", next100 < 10 ? "text-destructive" : "")}>{next100.toFixed(1)}</CardTitle></CardHeader></Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full bg-header text-header-foreground p-1">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="components" className="flex-1">Tracked Components</TabsTrigger>
          <TabsTrigger value="maintenance" className="flex-1">Maintenance Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Documents</CardTitle><CardDescription>Regulatory compliance and certificates.</CardDescription></div>
                <DocumentUploader onDocumentUploaded={onDocumentUploaded} trigger={(open) => <Button size="sm" onClick={() => open()}><Plus className="mr-2 h-4 w-4" /> Add Document</Button>} />
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/50"><th className="p-2 text-left">Name</th><th className="p-2 text-left">Expiry</th><th className="p-2 text-center">Set</th><th className="p-2 text-right">Action</th></tr></thead>
                    <tbody>
                      {(aircraft.documents || []).map((doc) => {
                        const statusColor = getStatusColor(doc.expirationDate);
                        return (
                          <tr key={doc.name} className="border-b">
                            <td className="p-2 font-medium">{doc.name}</td>
                            <td className="p-2 font-mono" style={{ color: statusColor || 'inherit' }}>{doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}</td>
                            <td className="p-2 text-center">
                              <Popover>
                                <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><CalendarIcon className="h-4 w-4" /></Button></PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined} onDateSelect={(date) => {
                                  const updated = aircraft.documents!.map(d => d.name === doc.name ? { ...d, expirationDate: date.toISOString() } : d);
                                  handleUpdateDocuments(updated);
                                }} /></PopoverContent>
                              </Popover>
                            </td>
                            <td className="p-2 text-right flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => { setViewingImageUrl(doc.url); setIsImageViewerOpen(true); }}><View className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
                                const updated = aircraft.documents!.filter(d => d.name !== doc.name);
                                handleUpdateDocuments(updated);
                              }}><Trash2 className="h-4 w-4" /></Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Aircraft Specs</CardTitle><CardDescription>Manufacturer and model details.</CardDescription></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground uppercase font-semibold">Make</p><p className="font-medium">{aircraft.make}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase font-semibold">Model</p><p className="font-medium">{aircraft.model}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase font-semibold">Type</p><p className="font-medium">{aircraft.type || 'N/A'}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase font-semibold">Registration</p><Badge variant="outline" className="font-mono">{aircraft.tailNumber}</Badge></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="components" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Tracked Components</CardTitle><CardDescription>Manage life-limited aircraft parts and components.</CardDescription></div>
              <Button size="sm" onClick={() => setIsAddComponentOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Component</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="p-2 text-left">Component</th>
                    <th className="p-2 text-left">Manufacturer</th>
                    <th className="p-2 text-left">Serial Number</th>
                    <th className="p-2 text-left">Install Date</th>
                    <th className="p-2 text-right">TSN</th>
                    <th className="p-2 text-right">TSO</th>
                    <th className="p-2 text-right">Total Time</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr></thead>
                  <tbody>
                    {(components || []).map((comp) => (
                      <tr key={comp.id} className="border-b">
                        <td className="p-2 font-medium">{comp.name}</td>
                        <td className="p-2">{comp.manufacturer}</td>
                        <td className="p-2 font-mono">{comp.serialNumber}</td>
                        <td className="p-2">{comp.installDate ? format(new Date(comp.installDate), 'PP') : 'N/A'}</td>
                        <td className="p-2 text-right">{(comp.tsn || 0).toFixed(1)}</td>
                        <td className="p-2 text-right">{(comp.tso || 0).toFixed(1)}</td>
                        <td className="p-2 text-right">{(comp.totalTime || 0).toFixed(1)}</td>
                        <td className="p-2 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(firestore!, `tenants/${tenantId}/aircrafts/${aircraftId}/components`, comp.id))}><Trash2 className="h-4 w-4" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Maintenance Logs</CardTitle><CardDescription>History of all maintenance work performed.</CardDescription></div>
              <Button size="sm" onClick={() => setIsLogActivityOpen(true)}><Wrench className="mr-2 h-4 w-4" /> Log Activity</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Reference</th>
                    <th className="p-2 text-left">Details</th>
                    <th className="p-2 text-left">AME</th>
                    <th className="p-2 text-left">AMO</th>
                  </tr></thead>
                  <tbody>
                    {(maintenanceLogs || []).map((log) => (
                      <tr key={log.id} className="border-b">
                        <td className="p-2 font-medium">{log.maintenanceType}</td>
                        <td className="p-2">{format(new Date(log.date), 'PP')}</td>
                        <td className="p-2 font-mono text-xs">{log.reference || '-'}</td>
                        <td className="p-2 max-w-xs truncate">{log.details}</td>
                        <td className="p-2 text-xs">{log.ameNo}</td>
                        <td className="p-2 text-xs">{log.amoNo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Edit Aircraft Details</DialogTitle></DialogHeader>
          <AircraftForm existingAircraft={aircraft} tenantId={tenantId} onSaved={() => setIsEditModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isAddComponentOpen} onOpenChange={setIsAddComponentOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Tracked Component</DialogTitle><DialogDescription>Add a new life-limited part to this aircraft.</DialogDescription></DialogHeader>
          <form onSubmit={handleAddComponent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Component Name</Label><Input name="name" required placeholder="e.g., Engine, Propeller" /></div>
              <div className="space-y-2"><Label>Manufacturer</Label><Input name="manufacturer" required placeholder="e.g., Lycoming" /></div>
              <div className="space-y-2"><Label>Serial Number</Label><Input name="serialNumber" required placeholder="SN-12345" /></div>
              <div className="space-y-2"><Label>Install Date</Label><Input name="installDate" type="date" required /></div>
              <div className="space-y-2"><Label>TSN (Time Since New)</Label><Input name="tsn" type="number" step="0.1" required /></div>
              <div className="space-y-2"><Label>TSO (Time Since Overhaul)</Label><Input name="tso" type="number" step="0.1" required /></div>
              <div className="space-y-2 col-span-2"><Label>Total Time</Label><Input name="totalTime" type="number" step="0.1" required /></div>
            </div>
            <DialogFooter><Button type="submit">Save Component</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isLogActivityOpen} onOpenChange={setIsLogActivityOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Maintenance Activity</DialogTitle><DialogDescription>Record maintenance work performed on this aircraft.</DialogDescription></DialogHeader>
          <form onSubmit={handleLogActivity} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Maintenance Type</Label><Input name="type" required placeholder="e.g., 50hr Inspection" /></div>
              <div className="space-y-2"><Label>Date</Label><Input name="date" type="date" required /></div>
              <div className="space-y-2 col-span-2"><Label>Reference</Label><Input name="reference" placeholder="Job card, invoice or certificate number" /></div>
              <div className="space-y-2 col-span-2"><Label>Work Details</Label><Textarea name="details" required placeholder="Describe the work performed..." /></div>
              <div className="space-y-2"><Label>AME License No.</Label><Input name="ameNo" placeholder="e.g., 1234567" /></div>
              <div className="space-y-2"><Label>AMO Number</Label><Input name="amoNo" placeholder="e.g., AMO 123" /></div>
            </div>
            <DialogFooter><Button type="submit">Log Activity</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]"><DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          {viewingImageUrl && <div className="relative h-[70vh]"><img src={viewingImageUrl} alt="Document" className="h-full w-full object-contain" /></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
