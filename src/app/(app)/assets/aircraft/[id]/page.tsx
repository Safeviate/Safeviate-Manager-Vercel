'use client';

import { use, useMemo, useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Pencil, PlusCircle, CalendarIcon, View, Trash2, History, Settings2, FileText, Component } from 'lucide-react';
import Link from 'next/link';
import { format, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { DocumentUploader } from '@/components/document-uploader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';
import { updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{value || 'N/A'}</p>
    </div>
);

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [isComponentDialogOpen, setIsComponentDialogOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: aircraft, isLoading: isLoadingAircraft, error: aircraftError } = useDoc<Aircraft>(aircraftRef);

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`), orderBy('name', 'asc')) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  const isLoading = isLoadingAircraft || isLoadingLogs || isLoadingComponents;

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

  const handleUpdateDocuments = (updatedDocs: any[]) => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocs });
  };

  const handleLogMaintenance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;
    const formData = new FormData(e.currentTarget);
    const logData = {
        aircraftId,
        maintenanceType: formData.get('type') as string,
        date: formData.get('date') as string,
        details: formData.get('details') as string,
        reference: formData.get('reference') as string,
        ameNo: formData.get('ameNo') as string,
        amoNo: formData.get('amoNo') as string,
    };
    const colRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(colRef, logData);
    setIsLogDialogOpen(false);
    toast({ title: "Maintenance Logged" });
  };

  const handleAddComponent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;
    const formData = new FormData(e.currentTarget);
    const compData = {
        name: formData.get('name') as string,
        manufacturer: formData.get('manufacturer') as string,
        serialNumber: formData.get('serialNumber') as string,
        partNumber: formData.get('partNumber') as string,
        installDate: formData.get('installDate') as string,
        tsn: parseFloat(formData.get('tsn') as string) || 0,
        tso: parseFloat(formData.get('tso') as string) || 0,
        maxHours: parseFloat(formData.get('maxHours') as string) || 0,
    };
    const colRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`);
    addDocumentNonBlocking(colRef, compData);
    setIsComponentDialogOpen(false);
    toast({ title: "Component Added" });
  };

  if (isLoading) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  const next50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const next100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button asChild variant="outline" size="sm">
          <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link>
        </Button>
        <div className="flex gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <Button size="icon" variant="ghost" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Current Hobbs</CardDescription><CardTitle className="text-2xl font-mono">{(aircraft.currentHobbs || 0).toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Current Tacho</CardDescription><CardTitle className="text-2xl font-mono">{(aircraft.currentTacho || 0).toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 50hr Due</CardDescription><CardTitle className={cn("text-2xl font-mono", next50 < 5 ? "text-destructive" : "")}>{next50.toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 100hr Due</CardDescription><CardTitle className={cn("text-2xl font-mono", next100 < 10 ? "text-destructive" : "")}>{next100.toFixed(1)}</CardTitle></CardHeader></Card>
      </div>

      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="documents" className="flex-1"><FileText className="mr-2 h-4 w-4" /> Documents</TabsTrigger>
          <TabsTrigger value="components" className="flex-1"><Component className="mr-2 h-4 w-4" /> Components</TabsTrigger>
          <TabsTrigger value="maintenance" className="flex-1"><History className="mr-2 h-4 w-4" /> Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Regulatory Documents</CardTitle>
                <CardDescription>Manage C of A, Insurance, and other required items.</CardDescription>
              </div>
              <DocumentUploader
                onDocumentUploaded={(doc) => handleUpdateDocuments([...(aircraft.documents || []), doc])}
                trigger={(open) => <Button size="sm" onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>}
              />
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-10 px-4 text-left font-medium">Name</th>
                      <th className="h-10 px-4 text-left font-medium">Expiry</th>
                      <th className="h-10 px-4 text-center font-medium">Set Date</th>
                      <th className="h-10 px-4 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(aircraft.documents || []).map((doc, idx) => {
                      const statusColor = getStatusColor(doc.expirationDate);
                      return (
                        <tr key={idx} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4 font-medium">{doc.name}</td>
                          <td className="p-4" style={{ color: statusColor || 'inherit' }}>
                            {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'No date set'}
                          </td>
                          <td className="p-4 text-center">
                            <Popover>
                              <PopoverTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8"><CalendarIcon className="h-4 w-4" /></Button></PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <CustomCalendar
                                  selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined}
                                  onDateSelect={(date) => {
                                    const newDocs = [...(aircraft.documents || [])];
                                    newDocs[idx] = { ...doc, expirationDate: date.toISOString() };
                                    handleUpdateDocuments(newDocs);
                                  }}
                                />
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => { setViewingImageUrl(doc.url); setIsImageViewerOpen(true); }}><View className="mr-2 h-4 w-4" /> View</Button>
                              <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleUpdateDocuments(aircraft.documents!.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Tracked Components</CardTitle><CardDescription>Monitor life-limited parts and engines.</CardDescription></div>
              <Button size="sm" onClick={() => setIsComponentDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-10 px-4 text-left font-medium">Component</th>
                      <th className="h-10 px-4 text-left font-medium">Manufacturer</th>
                      <th className="h-10 px-4 text-left font-medium">Serial No.</th>
                      <th className="h-10 px-4 text-left font-medium">Install Date</th>
                      <th className="h-10 px-4 text-right font-medium">TSN</th>
                      <th className="h-10 px-4 text-right font-medium">TSO</th>
                      <th className="h-10 px-4 text-right font-medium">Total Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(components || []).map((comp) => (
                      <tr key={comp.id} className="border-b hover:bg-muted/50">
                        <td className="p-4 font-medium">{comp.name}</td>
                        <td className="p-4">{comp.manufacturer}</td>
                        <td className="p-4">{comp.serialNumber}</td>
                        <td className="p-4">{comp.installDate ? format(new Date(comp.installDate), 'PP') : 'N/A'}</td>
                        <td className="p-4 text-right">{comp.tsn?.toFixed(1)}</td>
                        <td className="p-4 text-right">{comp.tso?.toFixed(1)}</td>
                        <td className="p-4 text-right">{(comp.tsn || 0).toFixed(1)}</td>
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
              <div><CardTitle>Maintenance Logs</CardTitle><CardDescription>Full history of inspections and repairs.</CardDescription></div>
              <Button size="sm" onClick={() => setIsLogDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Log Activity</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-10 px-4 text-left font-medium">Type</th>
                      <th className="h-10 px-4 text-left font-medium">Date</th>
                      <th className="h-10 px-4 text-left font-medium">Details</th>
                      <th className="h-10 px-4 text-left font-medium">Reference</th>
                      <th className="h-10 px-4 text-left font-medium">AME</th>
                      <th className="h-10 px-4 text-left font-medium">AMO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(logs || []).map((log) => (
                      <tr key={log.id} className="border-b hover:bg-muted/50">
                        <td className="p-4 font-medium">{log.maintenanceType}</td>
                        <td className="p-4">{log.date ? format(new Date(log.date), 'PP') : 'N/A'}</td>
                        <td className="p-4 max-w-xs truncate">{log.details}</td>
                        <td className="p-4">{log.reference || 'N/A'}</td>
                        <td className="p-4">{log.ameNo || 'N/A'}</td>
                        <td className="p-4">{log.amoNo || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}><DialogContent className="max-w-4xl h-[80vh]"><DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>{viewingImageUrl && <div className="relative w-full h-full"><Image src={viewingImageUrl} alt="Document" fill className="object-contain" /></div>}</DialogContent></Dialog>

      <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Log Maintenance Activity</DialogTitle></DialogHeader>
          <form onSubmit={handleLogMaintenance} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Maintenance Type</Label><Input name="type" placeholder="e.g., 50hr Inspection" required /></div>
                <div className="space-y-2"><Label>Date</Label><Input name="date" type="date" required /></div>
            </div>
            <div className="space-y-2"><Label>Details</Label><Textarea name="details" required /></div>
            <div className="space-y-2"><Label>Reference</Label><Input name="reference" placeholder="e.g., Release to Service #" /></div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>AME No</Label><Input name="ameNo" /></div>
                <div className="space-y-2"><Label>AMO No</Label><Input name="amoNo" /></div>
            </div>
            <DialogFooter><Button type="submit">Save Log</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isComponentDialogOpen} onOpenChange={setIsComponentDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Add Tracked Component</DialogTitle></DialogHeader>
          <form onSubmit={handleAddComponent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Component Name</Label><Input name="name" required /></div>
                <div className="space-y-2"><Label>Manufacturer</Label><Input name="manufacturer" /></div>
                <div className="space-y-2"><Label>Part Number</Label><Input name="partNumber" /></div>
                <div className="space-y-2"><Label>Serial Number</Label><Input name="serialNumber" /></div>
                <div className="space-y-2"><Label>Install Date</Label><Input name="installDate" type="date" /></div>
                <div className="space-y-2"><Label>Max Hours (TBO)</Label><Input name="maxHours" type="number" step="0.1" /></div>
                <div className="space-y-2"><Label>TSN</Label><Input name="tsn" type="number" step="0.1" /></div>
                <div className="space-y-2"><Label>TSO</Label><Input name="tso" type="number" step="0.1" /></div>
            </div>
            <DialogFooter><Button type="submit">Add Component</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}