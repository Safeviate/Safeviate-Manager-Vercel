'use client';

import { use, useMemo, useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Pencil, PlusCircle, CalendarIcon, View, Trash2, History } from 'lucide-react';
import Link from 'next/link';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { DocumentUploader } from '@/components/document-uploader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

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
  
  const maintenanceQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: maintenanceLogs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(maintenanceQuery);
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

  const handleUpdateDocument = (docName: string, updates: Partial<NonNullable<Aircraft['documents']>[0]>) => {
    if (!aircraft || !aircraftRef) return;
    const currentDocs = aircraft.documents || [];
    const updatedDocs = currentDocs.map(d => d.name === docName ? { ...d, ...updates } : d);
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocs });
  };

  const handleAddDocument = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    if (!aircraft || !aircraftRef) return;
    const currentDocs = aircraft.documents || [];
    updateDocumentNonBlocking(aircraftRef, { documents: [...currentDocs, docDetails] });
  };

  const handleDeleteDocument = (docName: string) => {
    if (!aircraft || !aircraftRef) return;
    const updatedDocs = (aircraft.documents || []).filter(d => d.name !== docName);
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocs });
  };

  const handleAddComponent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!aircraft || !aircraftRef) return;
    const formData = new FormData(e.currentTarget);
    const newComponent = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.get('name') as string,
      manufacturer: formData.get('manufacturer') as string,
      serialNumber: formData.get('serialNumber') as string,
      partNumber: formData.get('partNumber') as string,
      installDate: formData.get('installDate') as string,
      installHours: parseFloat(formData.get('installHours') as string) || 0,
      maxHours: parseFloat(formData.get('maxHours') as string) || 0,
      tsn: parseFloat(formData.get('tsn') as string) || 0,
      tso: parseFloat(formData.get('tso') as string) || 0,
      totalTime: parseFloat(formData.get('totalTime') as string) || 0,
    };
    const currentComponents = aircraft.components || [];
    updateDocumentNonBlocking(aircraftRef, { components: [...currentComponents, newComponent] });
    toast({ title: 'Component Added' });
  };

  const handleAddMaintenance = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;
    const formData = new FormData(e.currentTarget);
    const logData = {
      maintenanceType: formData.get('type') as string,
      date: formData.get('date') as string,
      details: formData.get('details') as string,
      reference: formData.get('reference') as string,
      ameNo: formData.get('ameNo') as string,
      amoNo: formData.get('amoNo') as string,
      aircraftId: aircraftId,
    };
    const logsCol = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(logsCol, logData);
    toast({ title: 'Activity Logged' });
  };

  if (isLoadingAircraft) return <div className="p-8 space-y-6"><Skeleton className="h-48 w-full" /><Skeleton className="h-96 w-full" /></div>;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  const next50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const next100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button asChild variant="outline"><Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link></Button>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold font-mono">{aircraft.tailNumber}</h1>
          <Button variant="outline" size="sm"><Pencil className="mr-2 h-4 w-4" /> Edit Aircraft</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Current Hobbs</CardDescription><CardTitle className="text-2xl font-mono">{(aircraft.currentHobbs || 0).toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Current Tacho</CardDescription><CardTitle className="text-2xl font-mono">{(aircraft.currentTacho || 0).toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 50hr Due</CardDescription><CardTitle className={cn("text-2xl font-mono", next50 < 5 ? "text-destructive" : "")}>{next50.toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 100hr Due</CardDescription><CardTitle className={cn("text-2xl font-mono", next100 < 10 ? "text-destructive" : "")}>{next100.toFixed(1)}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <Tabs defaultValue="overview">
          <CardHeader className="p-0">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="components">Tracked Components</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance Logs</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-6">
            <TabsContent value="overview" className="m-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div><Label className="text-muted-foreground text-xs uppercase font-bold">Make</Label><p className="text-lg">{aircraft.make}</p></div>
                <div><Label className="text-muted-foreground text-xs uppercase font-bold">Model</Label><p className="text-lg">{aircraft.model}</p></div>
                <div><Label className="text-muted-foreground text-xs uppercase font-bold">Type</Label><p className="text-lg">{aircraft.type || 'Single-Engine'}</p></div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><Label className="text-muted-foreground text-xs uppercase font-bold">Frame Total Hours</Label><p className="text-lg font-mono">{(aircraft.frameHours || 0).toFixed(1)}</p></div>
                <div><Label className="text-muted-foreground text-xs uppercase font-bold">Engine Total Hours</Label><p className="text-lg font-mono">{(aircraft.engineHours || 0).toFixed(1)}</p></div>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="m-0 space-y-4">
              <div className="flex justify-end">
                <DocumentUploader
                  onDocumentUploaded={handleAddDocument}
                  trigger={(open) => <Button size="sm" onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>}
                />
              </div>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50"><th className="p-3 text-left">Document Name</th><th className="p-3 text-left">Expiry Date</th><th className="p-3 text-right">Actions</th></tr></thead>
                  <tbody>
                    {(aircraft.documents || []).map(doc => {
                      const color = getStatusColor(doc.expirationDate);
                      return (
                        <tr key={doc.name} className="border-b last:border-0">
                          <td className="p-3 font-medium">{doc.name}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span style={{ color: color || 'inherit' }} className="font-semibold">
                                {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'No Expiry'}
                              </span>
                              <Popover>
                                <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><CalendarIcon className="h-3 w-3" /></Button></PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined} onDateSelect={(date) => handleUpdateDocument(doc.name, { expirationDate: date.toISOString() })} /></PopoverContent>
                              </Popover>
                            </div>
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <Button variant="outline" size="sm" onClick={() => { setViewingImageUrl(doc.url); setIsImageViewerOpen(true); }}><View className="mr-2 h-4 w-4" /> View</Button>
                            <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteDocument(doc.name)}><Trash2 className="h-4 w-4" /></Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="components" className="m-0 space-y-4">
              <div className="flex justify-end">
                <Dialog>
                  <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button></DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Register New Component</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddComponent} className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Component Name</Label><Input name="name" required /></div>
                      <div className="space-y-2"><Label>Manufacturer</Label><Input name="manufacturer" /></div>
                      <div className="space-y-2"><Label>Serial Number</Label><Input name="serialNumber" /></div>
                      <div className="space-y-2"><Label>Part Number</Label><Input name="partNumber" /></div>
                      <div className="space-y-2"><Label>Install Date</Label><Input name="installDate" type="date" /></div>
                      <div className="space-y-2"><Label>Install Hours</Label><Input name="installHours" type="number" step="0.1" /></div>
                      <div className="space-y-2"><Label>Max Hours (Life)</Label><Input name="maxHours" type="number" /></div>
                      <div className="space-y-2"><Label>TSN (Time Since New)</Label><Input name="tsn" type="number" step="0.1" /></div>
                      <div className="space-y-2"><Label>TSO (Time Since Overhaul)</Label><Input name="tso" type="number" step="0.1" /></div>
                      <div className="space-y-2"><Label>Total Time</Label><Input name="totalTime" type="number" step="0.1" /></div>
                      <DialogFooter className="col-span-2"><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button type="submit">Save Component</Button></DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50"><th className="p-3 text-left">Component</th><th className="p-3 text-left">Manufacturer</th><th className="p-3 text-left">Serial No.</th><th className="p-3 text-left">Install Date</th><th className="p-3 text-right">TSN</th><th className="p-3 text-right">TSO</th><th className="p-3 text-right">Total Time</th></tr></thead>
                  <tbody>
                    {(aircraft.components || []).map(comp => (
                      <tr key={comp.id} className="border-b last:border-0">
                        <td className="p-3 font-medium">{comp.name}</td>
                        <td className="p-3">{comp.manufacturer}</td>
                        <td className="p-3 font-mono">{comp.serialNumber}</td>
                        <td className="p-3">{comp.installDate ? format(new Date(comp.installDate), 'PP') : 'N/A'}</td>
                        <td className="p-3 text-right font-mono">{comp.tsn?.toFixed(1) || '0.0'}</td>
                        <td className="p-3 text-right font-mono">{comp.tso?.toFixed(1) || '0.0'}</td>
                        <td className="p-3 text-right font-mono">{comp.totalTime?.toFixed(1) || '0.0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="maintenance" className="m-0 space-y-4">
              <div className="flex justify-end">
                <Dialog>
                  <DialogTrigger asChild><Button size="sm"><History className="mr-2 h-4 w-4" /> Log Activity</Button></DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Log Maintenance Activity</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddMaintenance} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Maintenance Type</Label><Input name="type" placeholder="e.g., 50hr Inspection" required /></div>
                        <div className="space-y-2"><Label>Date</Label><Input name="date" type="date" required /></div>
                        <div className="space-y-2"><Label>Reference</Label><Input name="reference" placeholder="e.g., WO-12345" /></div>
                        <div className="space-y-2"><Label>AME License No.</Label><Input name="ameNo" /></div>
                        <div className="space-y-2 col-span-2"><Label>AMO Number</Label><Input name="amoNo" /></div>
                        <div className="space-y-2 col-span-2"><Label>Details</Label><Textarea name="details" className="min-h-32" /></div>
                      </div>
                      <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button type="submit">Submit Log</Button></DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50"><th className="p-3 text-left">Date</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">Reference</th><th className="p-3 text-left">Details</th><th className="p-3 text-right">AME/AMO</th></tr></thead>
                  <tbody>
                    {(maintenanceLogs || []).map(log => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-3 whitespace-nowrap">{format(new Date(log.date), 'PP')}</td>
                        <td className="p-3 font-semibold">{log.maintenanceType}</td>
                        <td className="p-3 font-mono text-xs">{log.reference || '-'}</td>
                        <td className="p-3"><p className="line-clamp-2 text-muted-foreground">{log.details}</p></td>
                        <td className="p-3 text-right text-xs"><div>{log.ameNo}</div><div className="text-muted-foreground">{log.amoNo}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          {viewingImageUrl && <div className="relative w-full h-full"><Image src={viewingImageUrl} alt="Document" fill style={{ objectFit: 'contain' }} /></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
