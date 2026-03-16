'use client';

import { use, useState, useMemo } from 'react';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, arrayUnion } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  PlusCircle, 
  Trash2, 
  ArrowLeft, 
  Wrench, 
  FileText, 
  Activity, 
  History, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  Settings2,
  CalendarDays,
  FilePlus,
  Upload
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { DocumentUploader } from '@/components/document-uploader';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import { updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const componentFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  serialNumber: z.string().min(1, "Serial number is required."),
  installHours: z.number({ coerce: true }).min(0),
  maxHours: z.number({ coerce: true }).min(1),
  notes: z.string().optional(),
});

type ComponentFormValues = z.infer<typeof componentFormSchema>;

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const aircraftId = resolvedParams.id;
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [isComponentDialogOpen, setIsComponentDialogOpen] = useState(false);

  // --- Maintenance Log Form ---
  const logForm = useForm({
    defaultValues: { maintenanceType: '', details: '', reference: '', date: format(new Date(), 'yyyy-MM-dd') }
  });

  const onAddLog = (values: any) => {
    if (!firestore) return;
    const logsCol = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(logsCol, { ...values, aircraftId, createdAt: new Date().toISOString() });
    toast({ title: "Log Added", description: "Maintenance log has been recorded." });
    setIsLogDialogOpen(false);
    logForm.reset();
  };

  // --- Component Form ---
  const componentForm = useForm<ComponentFormValues>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: { name: '', serialNumber: '', installHours: 0, maxHours: 1000, notes: '' }
  });

  const onAddComponent = (values: ComponentFormValues) => {
    if (!firestore || !aircraftRef) return;
    
    const newComponent: AircraftComponent = {
      ...values,
      id: uuidv4(),
      manufacturer: '',
      partNumber: '',
      installDate: new Date().toISOString(),
      tsn: values.installHours,
      tso: 0,
      totalTime: values.installHours,
      notes: values.notes || ''
    };

    updateDocumentNonBlocking(aircraftRef, {
      components: arrayUnion(newComponent)
    });

    toast({ title: "Component Added", description: `"${values.name}" is now being tracked.` });
    setIsComponentDialogOpen(false);
    componentForm.reset();
  };

  const onUploadDocument = (docDetails: any) => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, {
      documents: arrayUnion(docDetails)
    });
    toast({ title: "Document Saved" });
  };

  if (isLoadingAircraft) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!aircraft) return <div className="p-10 text-center">Aircraft not found.</div>;

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col h-full overflow-hidden gap-6">
      <div className="flex justify-between items-center px-1">
        <Button asChild variant="outline">
          <Link href="/assets/aircraft">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet
          </Link>
        </Button>
        <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-8 px-3 font-mono">
                Hobbs: {aircraft.currentHobbs?.toFixed(1) || '0.0'}
            </Badge>
            <Badge variant="outline" className="h-8 px-3 font-mono">
                Tacho: {aircraft.currentTacho?.toFixed(1) || '0.0'}
            </Badge>
        </div>
      </div>

      <Card className="shadow-none border bg-muted/5 shrink-0">
        <CardHeader className="py-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{aircraft.tailNumber}</CardTitle>
              <CardDescription>{aircraft.make} {aircraft.model} • {aircraft.type}</CardDescription>
            </div>
            <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Status</p>
                <div className="flex items-center gap-1.5 text-green-600 font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Airworthy</span>
                </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="maintenance" className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-1 shrink-0">
          <TabsList className="bg-transparent h-auto p-0 gap-2 mb-4 border-b-0 justify-start w-full flex overflow-x-auto no-scrollbar">
            <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Maintenance Logs</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Technical Documents</TabsTrigger>
            <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Component Tracker</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden px-1">
          {/* --- Maintenance Content --- */}
          <TabsContent value="maintenance" className="m-0 h-full">
            <Card className="h-full flex flex-col overflow-hidden shadow-none border">
              <CardHeader className="border-b py-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm uppercase font-black tracking-widest text-primary">Technical Log History</CardTitle>
                <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-8 gap-2"><PlusCircle className="h-3.5 w-3.5" /> Add Log Entry</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Record Maintenance</DialogTitle>
                      <DialogDescription>Add a new entry to the aircraft's technical maintenance log.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={logForm.handleSubmit(onAddLog)} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Maintenance Type</Label>
                        <Input placeholder="e.g., 50 Hour Inspection, Oil Change" {...logForm.register('maintenanceType')} />
                      </div>
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input type="date" {...logForm.register('date')} />
                      </div>
                      <div className="space-y-2">
                        <Label>Details</Label>
                        <Textarea placeholder="Describe work performed..." {...logForm.register('details')} className="min-h-32" />
                      </div>
                      <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button type="submit">Save Entry</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-32">Date</TableHead>
                      <TableHead>Work Performed</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs?.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium whitespace-nowrap">{log.date}</TableCell>
                        <TableCell className="max-w-md truncate" title={log.details}>{log.details}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">{log.maintenanceType}</Badge></TableCell>
                        <TableCell className="text-right font-mono text-xs">{log.reference || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                    {(!logs || logs.length === 0) && !isLoadingLogs && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">No logs recorded.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Documents Content --- */}
          <TabsContent value="documents" className="m-0 h-full">
            <Card className="h-full flex flex-col overflow-hidden shadow-none border">
              <CardHeader className="border-b py-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm uppercase font-black tracking-widest text-primary">Compliance Documents</CardTitle>
                <DocumentUploader
                  onDocumentUploaded={onUploadDocument}
                  trigger={(open) => <Button size="sm" onClick={() => open()} variant="outline" className="h-8 gap-2"><Upload className="h-3.5 w-3.5" /> Upload File</Button>}
                />
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Document Name</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aircraft.documents?.map((doc, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold">{doc.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{doc.uploadDate ? format(new Date(doc.uploadDate), 'PPP') : 'N/A'}</TableCell>
                        <TableCell><Badge className="bg-green-500">Active</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild><a href={doc.url} target="_blank" rel="noopener noreferrer">View</a></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!aircraft.documents || aircraft.documents.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">No documents uploaded.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Components Content --- */}
          <TabsContent value="components" className="m-0 h-full">
            <Card className="h-full flex flex-col overflow-hidden shadow-none border">
              <CardHeader className="border-b py-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm uppercase font-black tracking-widest text-primary">Serialized Item Tracker</CardTitle>
                <Dialog open={isComponentDialogOpen} onOpenChange={setIsComponentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-8 gap-2"><PlusCircle className="h-3.5 w-3.5" /> Track Component</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Serialized Item</DialogTitle>
                      <DialogDescription>Begin lifecycle tracking for a new aircraft component.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={componentForm.handleSubmit(onAddComponent)} className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Component Name</Label>
                          <Input placeholder="e.g., Engine, Propeller" {...componentForm.register('name')} />
                        </div>
                        <div className="space-y-2">
                          <Label>Serial Number</Label>
                          <Input placeholder="S/N..." {...componentForm.register('serialNumber')} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Current Time (Hours)</Label>
                          <Input type="number" step="0.1" {...componentForm.register('installHours', { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Life Limit (Hours)</Label>
                          <Input type="number" step="0.1" {...componentForm.register('maxHours', { valueAsNumber: true })} />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button type="submit">Start Tracking</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead>Serial No.</TableHead>
                      <TableHead className="text-right">Current TSN</TableHead>
                      <TableHead className="text-right">Limit</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aircraft.components?.map(comp => {
                      const remaining = Math.max(0, comp.maxHours - comp.tsn);
                      const isCritical = remaining < 50;
                      return (
                        <TableRow key={comp.id}>
                          <TableCell className="font-bold">{comp.name}</TableCell>
                          <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                          <TableCell className="text-right font-mono">{comp.tsn.toFixed(1)}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">{comp.maxHours.toFixed(1)}</TableCell>
                          <TableCell className={cn("text-right font-black font-mono", isCritical ? "text-red-600" : "text-primary")}>
                            {remaining.toFixed(1)}h
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {(!aircraft.components || aircraft.components.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">No components registered for tracking.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
