'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy, arrayUnion } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { ResponsiveTabRow } from '@/components/responsive-tab-row';
import { 
  Plane, 
  History, 
  FileText, 
  Settings2, 
  ArrowLeft, 
  PlusCircle, 
  Trash2, 
  Clock, 
  Gauge, 
  AlertCircle,
  Eye,
  Pencil,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter, 
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DocumentUploader } from '@/components/document-uploader';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { getDocumentExpiryBadgeStyle, getInspectionWarningStyle } from '@/lib/document-expiry';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const isMobile = useIsMobile();
  const { tenantId } = useUserProfile();
  const [activeTab, setActiveTab] = useState('overview');
  const aircraftId = resolvedParams.id;

  const aircraftRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const logsQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );
  const inspectionSettingsRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, 'tenants', tenantId, 'settings', 'inspection-warnings') : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);
  const { data: inspectionSettings } = useDoc<AircraftInspectionWarningSettings>(inspectionSettingsRef);

  if (isLoadingAircraft) {
    return (
      <div className="max-w-[1400px] mx-auto w-full space-y-6 pt-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!aircraft) {
    return (
      <div className="max-w-[1400px] mx-auto w-full text-center py-20">
        <p className="text-muted-foreground">Aircraft not found.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/assets/aircraft">Back to All Aircraft to fleet</Link>
        </Button>
      </div>
    );
  }

  const timeTo50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const timeTo100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className={cn("max-w-[1400px] mx-auto w-full flex flex-col pt-2", isMobile ? "min-h-0 overflow-y-auto" : "h-full overflow-hidden")}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className={cn("w-full flex-1 flex flex-col", isMobile ? "overflow-visible" : "overflow-hidden")}>
        
        {/* --- RETURN BUTTON --- */}

        {/* --- MAIN CONTENT AREA --- */}
        <div className={cn("flex-1 px-1 pb-10", isMobile ? "overflow-visible" : "overflow-y-auto no-scrollbar")}>
          <Card className="shadow-none border rounded-xl overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 shrink-0">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2 font-black">
                  <Plane className="h-6 w-6 text-primary" />
                  {aircraft.tailNumber}
                </CardTitle>
                <CardDescription className="text-sm font-medium">{aircraft.make} {aircraft.model}</CardDescription>
              </div>
              <EditAircraftDialog aircraft={aircraft} tenantId={tenantId || ''} />
            </CardHeader>

            {/* --- TAB BAR INSIDE CARD WITH HORIZONTAL SCROLL --- */}
            <div className="border-b bg-muted/5 px-6 py-2 shrink-0 overflow-hidden">
              {isMobile ? (
                <ResponsiveTabRow
                  value={activeTab}
                  onValueChange={setActiveTab}
                  placeholder="Select Section"
                  className="shrink-0"
                  options={[
                    { value: 'overview', label: 'Overview' },
                    { value: 'maintenance', label: 'Maintenance' },
                    { value: 'components', label: 'Components' },
                    { value: 'documents', label: 'Documents' },
                  ]}
                />
              ) : (
                <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex items-center">
                  <TabsTrigger 
                    value="overview" 
                    className="rounded-sm px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="maintenance" 
                    className="rounded-sm px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0"
                  >
                    Maintenance
                  </TabsTrigger>
                  <TabsTrigger 
                    value="components" 
                    className="rounded-sm px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0"
                  >
                    Components
                  </TabsTrigger>
                  <TabsTrigger 
                    value="documents" 
                    className="rounded-sm px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0"
                  >
                    Documents
                  </TabsTrigger>
                </TabsList>
              )}
            </div>

            <div className="flex-1 min-h-0">
              <TabsContent value="overview" className={cn("mt-0 outline-none", isMobile ? "min-h-0" : "h-full overflow-y-auto no-scrollbar")}>
                <CardContent className="p-8 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="space-y-6">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-primary border-b pb-2">Specifications</h3>
                      <div className="grid grid-cols-1 gap-6">
                        <DetailItem label="Manufacturer" value={aircraft.make} />
                        <DetailItem label="Model" value={aircraft.model} />
                        <DetailItem label="Engine Type" value={aircraft.type} />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-primary border-b pb-2">Hobbs Meter</h3>
                      <div className="grid grid-cols-1 gap-6">
                        <DetailItem label="Initial Hobbs" value={(aircraft.initialHobbs || 0).toFixed(1)} />
                        <DetailItem label="Current Hobbs" value={(aircraft.currentHobbs || 0).toFixed(1)} />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-primary border-b pb-2">Tacho Meter</h3>
                      <div className="grid grid-cols-1 gap-6">
                        <DetailItem label="Initial Tacho" value={(aircraft.initialTacho || 0).toFixed(1)} />
                        <DetailItem label="Current Tacho" value={(aircraft.currentTacho || 0).toFixed(1)} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-primary border-b pb-2">Inspection Targets</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                      <DetailItem label="Next 50h Tacho" value={(aircraft.tachoAtNext50Inspection || 0).toFixed(1)} />
                      <DetailItem label="Next 100h Tacho" value={(aircraft.tachoAtNext100Inspection || 0).toFixed(1)} />
                      <div className="pt-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">To 50h</p>
                        <Badge
                          variant="outline"
                          style={getInspectionWarningStyle(timeTo50, '50', inspectionSettings) || undefined}
                          className="font-mono font-black text-xs h-8 px-4"
                        >
                          {timeTo50.toFixed(1)}h
                        </Badge>
                      </div>
                      <div className="pt-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">To 100h</p>
                        <Badge
                          variant="outline"
                          style={getInspectionWarningStyle(timeTo100, '100', inspectionSettings) || undefined}
                          className="font-mono font-black text-xs h-8 px-4"
                        >
                          {timeTo100.toFixed(1)}h
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </TabsContent>

              <TabsContent value="maintenance" className={cn("mt-0 outline-none", isMobile ? "min-h-0" : "h-full overflow-y-auto no-scrollbar")}>
                <MaintenanceTab aircraftId={aircraftId} tenantId={tenantId || ''} logs={logs || []} isLoading={isLoadingLogs} />
              </TabsContent>

              <TabsContent value="components" className={cn("mt-0 outline-none", isMobile ? "min-h-0" : "h-full overflow-y-auto no-scrollbar")}>
                <ComponentsTab aircraft={aircraft} tenantId={tenantId || ''} />
              </TabsContent>

              <TabsContent value="documents" className={cn("mt-0 outline-none", isMobile ? "min-h-0" : "h-full overflow-y-auto no-scrollbar")}>
                <DocumentsTab aircraft={aircraft} tenantId={tenantId || ''} />
              </TabsContent>
            </div>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{label}</p>
      <p className="text-sm font-black text-foreground">{value}</p>
    </div>
  );
}

function MaintenanceTab({ aircraftId, tenantId, logs, isLoading }: { aircraftId: string; tenantId: string; logs: MaintenanceLog[]; isLoading: boolean }) {
  return (
    <div className="flex flex-col h-full">
      <div className="bg-muted/5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 shrink-0">
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight">Maintenance History</h3>
          <p className="text-xs font-medium text-muted-foreground">All recorded maintenance events and inspections.</p>
        </div>
        <AddMaintenanceLogDialog aircraftId={aircraftId} tenantId={tenantId} />
      </div>
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-muted/30 sticky top-0 z-10">
            <TableRow>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider">Date</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider">Type</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider">Reference</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider">Details</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider">AME/AMO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length > 0 ? (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap font-medium text-sm">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px] font-bold uppercase">{log.maintenanceType}</Badge></TableCell>
                  <TableCell className="font-mono text-xs font-bold">{log.reference || 'N/A'}</TableCell>
                  <TableCell className="max-w-md truncate text-sm italic">"{log.details}"</TableCell>
                  <TableCell className="text-[10px] font-bold">
                    {log.ameNo && <div className="text-primary">AME: {log.ameNo}</div>}
                    {log.amoNo && <div className="text-muted-foreground">AMO: {log.amoNo}</div>}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic">
                  {isLoading ? 'Loading logs...' : 'No maintenance logs recorded.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ComponentsTab({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="bg-muted/5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 shrink-0">
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight">Component Tracker</h3>
          <p className="text-xs font-medium text-muted-foreground">Track lifecycle and remaining hours for critical serialized parts.</p>
        </div>
        <AddComponentDialog aircraftId={aircraft.id} tenantId={tenantId} />
      </div>
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-muted/30 sticky top-0 z-10">
            <TableRow>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider">Component</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider">Serial No.</TableHead>
              <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider">TSN</TableHead>
              <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider">TSO</TableHead>
              <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider">Remaining</TableHead>
              <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider">Limit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aircraft.components && aircraft.components.length > 0 ? (
              aircraft.components.map((comp) => {
                const remaining = comp.maxHours - comp.totalTime;
                return (
                  <TableRow key={comp.id}>
                    <TableCell className="font-bold text-sm">{comp.name}</TableCell>
                    <TableCell className="font-mono text-xs font-bold text-muted-foreground">{comp.serialNumber}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{(comp.tsn || 0).toFixed(1)}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{(comp.tso || 0).toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={remaining < 50 ? "destructive" : "outline"} className="font-mono font-black text-xs">
                        {remaining.toFixed(1)}h
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-medium text-muted-foreground">{comp.maxHours.toFixed(1)}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground italic">
                  No serialized components tracked for this aircraft.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DocumentsTab({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [viewingDoc, setViewingDoc] = useState<{ name: string; url: string } | null>(null);
  const expirySettingsRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  const handleDocUpload = (newDoc: any) => {
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, {
      documents: arrayUnion(newDoc)
    });
    toast({ title: 'Document Added', description: `"${newDoc.name}" has been uploaded.` });
  };

  const handleDeleteDoc = (docName: string) => {
    const updatedDocs = (aircraft.documents || []).filter(d => d.name !== docName);
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocs });
    toast({ title: 'Document Removed' });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-muted/5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 shrink-0">
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight">Technical Documents</h3>
          <p className="text-xs font-medium text-muted-foreground">Aircraft certifications, insurance, and manuals.</p>
        </div>
        <DocumentUploader
          onDocumentUploaded={handleDocUpload}
          trigger={(open) => (
            <Button size="sm" onClick={() => open()} variant="outline" className="gap-2 h-9 px-6 text-xs font-black uppercase border-slate-300">
              <PlusCircle className="h-4 w-4" /> Add Document
            </Button>
          )}
        />
      </div>
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-muted/30 sticky top-0 z-10">
            <TableRow>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider">Document Name</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider">Upload Date</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider">Expiry</TableHead>
              <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aircraft.documents && aircraft.documents.length > 0 ? (
              aircraft.documents.map((doc) => {
                const expiryStyle = getDocumentExpiryBadgeStyle(doc.expirationDate, expirySettings);
                return (
                <TableRow key={doc.name}>
                  <TableCell className="font-bold text-sm">{doc.name}</TableCell>
                  <TableCell className="text-xs font-medium">{format(new Date(doc.uploadDate), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="text-xs">
                    {doc.expirationDate ? (
                      <Badge variant="outline" className="font-bold" style={expiryStyle || undefined}>
                        {format(new Date(doc.expirationDate), 'dd MMM yyyy')}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground opacity-50 font-medium">No Expiry</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => setViewingDoc({ name: doc.name, url: doc.url })}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteDoc(doc.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )})
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-48 text-center text-muted-foreground italic">
                  No technical documents uploaded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{viewingDoc?.name}</DialogTitle>
          </DialogHeader>
          <div className="relative aspect-[4/3] w-full bg-muted rounded-md overflow-hidden border">
            {viewingDoc && <img src={viewingDoc.url} alt={viewingDoc.name} className="object-contain w-full h-full" />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingDoc(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Modals ---

function EditAircraftDialog({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(z.object({
      make: z.string().min(1),
      model: z.string().min(1),
      type: z.string().min(1),
      initialHobbs: z.coerce.number(),
      currentHobbs: z.coerce.number(),
      initialTacho: z.coerce.number(),
      currentTacho: z.coerce.number(),
      tachoAtNext50Inspection: z.coerce.number(),
      tachoAtNext100Inspection: z.coerce.number(),
    })),
    defaultValues: {
      make: aircraft.make || '',
      model: aircraft.model || '',
      type: aircraft.type || 'Single-Engine',
      initialHobbs: aircraft.initialHobbs || 0,
      currentHobbs: aircraft.currentHobbs || 0,
      initialTacho: aircraft.initialTacho || 0,
      currentTacho: aircraft.currentTacho || 0,
      tachoAtNext50Inspection: aircraft.tachoAtNext50Inspection || 0,
      tachoAtNext100Inspection: aircraft.tachoAtNext100Inspection || 0,
    }
  });

  const onSubmit = (values: any) => {
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, values);
    toast({ title: 'Aircraft Updated' });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9 px-6 text-xs font-black uppercase border-slate-300">
          <Pencil className="h-3.5 w-3.5" /> Edit Specifications
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Aircraft Details</DialogTitle>
          <DialogDescription>Update physical specs and meter offsets for {aircraft.tailNumber}.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="type" render={({ field }) => ( 
                <FormItem className="col-span-2">
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Single-Engine">Single-Engine</SelectItem>
                      <SelectItem value="Multi-Engine">Multi-Engine</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem> 
              )}/>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <FormField control={form.control} name="initialHobbs" render={({ field }) => ( <FormItem><FormLabel>Initial Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel>Current Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="initialTacho" render={({ field }) => ( <FormItem><FormLabel>Initial Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel>Current Tacho</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )}/>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 50h Tacho Target</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => ( <FormItem><FormLabel>Next 100h Tacho Target</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )}/>
            </div>

            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function AddMaintenanceLogDialog({ aircraftId, tenantId }: { aircraftId: string; tenantId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(z.object({
      date: z.string(),
      maintenanceType: z.string().min(1),
      details: z.string().min(1),
      reference: z.string().optional(),
      ameNo: z.string().optional(),
      amoNo: z.string().optional(),
    })),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      maintenanceType: 'Scheduled Inspection',
      details: '',
      reference: '',
      ameNo: '',
      amoNo: '',
    }
  });

  const onSubmit = (values: any) => {
    const colRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(colRef, values);
    toast({ title: 'Log Added' });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 h-9 px-6 text-xs font-black uppercase bg-emerald-700 hover:bg-emerald-800 text-white shadow-md">
          <PlusCircle className="h-3.5 w-3.5" /> Add Log Entry
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Maintenance Entry</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField control={form.control} name="date" render={({ field }) => ( <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem> )}/>
            <FormField control={form.control} name="maintenanceType" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Scheduled Inspection">Scheduled Inspection</SelectItem><SelectItem value="Defect Rectification">Defect Rectification</SelectItem><SelectItem value="Component Change">Component Change</SelectItem><SelectItem value="Service Bulletin">Service Bulletin</SelectItem></SelectContent></Select></FormItem> )}/>
            <FormField control={form.control} name="reference" render={({ field }) => ( <FormItem><FormLabel>Reference #</FormLabel><FormControl><Input placeholder="Internal or Release #..." {...field} /></FormControl></FormItem> )}/>
            <FormField control={form.control} name="details" render={({ field }) => ( <FormItem><FormLabel>Work Details</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem> )}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="ameNo" render={({ field }) => ( <FormItem><FormLabel>AME License</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="amoNo" render={({ field }) => ( <FormItem><FormLabel>AMO #</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Log</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function AddComponentDialog({ aircraftId, tenantId }: { aircraftId: string; tenantId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(z.object({
      name: z.string().min(1),
      serialNumber: z.string().min(1),
      tsn: z.coerce.number(),
      tso: z.coerce.number(),
      totalTime: z.coerce.number(),
      maxHours: z.coerce.number(),
    })),
    defaultValues: {
      name: '',
      serialNumber: '',
      tsn: 0,
      tso: 0,
      totalTime: 0,
      maxHours: 2000,
    }
  });

  const onSubmit = (values: any) => {
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId);
    const newComponent = { ...values, id: uuidv4(), installDate: new Date().toISOString() };
    
    updateDocumentNonBlocking(aircraftRef, {
      components: arrayUnion(newComponent)
    });
    
    toast({ title: 'Component Added' });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 h-9 px-6 text-xs font-black uppercase bg-emerald-700 hover:bg-emerald-800 text-white shadow-md">
          <PlusCircle className="h-3.5 w-3.5" /> Track Component
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Serialized Component</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Engine, Propeller, Magneto" {...field} /></FormControl></FormItem> )}/>
            <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel>TSN (Time Since New)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel>TSO (Time Since OH)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="totalTime" render={({ field }) => ( <FormItem><FormLabel>Current Total Time</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel>Service Life (Limit)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem> )}/>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Add Component</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
