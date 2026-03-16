
'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy, arrayUnion } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  History, 
  FileText, 
  Settings2, 
  PlusCircle, 
  Clock, 
  Activity, 
  AlertCircle,
  FileUp,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DocumentUploader } from '@/components/document-uploader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const componentFormSchema = z.object({
  name: z.string().min(1, 'Component name is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  tsn: z.number({ coerce: true }).min(0),
  maxHours: z.number({ coerce: true }).min(1),
});

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const aircraftId = resolvedParams.id;
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const { toast } = useToast();

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

  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);

  const componentForm = useForm<z.infer<typeof componentFormSchema>>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: {
      name: '',
      serialNumber: '',
      tsn: 0,
      maxHours: 0,
    }
  });

  const handleAddComponent = (values: z.infer<typeof componentFormSchema>) => {
    if (!aircraftRef) return;

    const newComponent: AircraftComponent = {
      id: crypto.randomUUID(),
      name: values.name,
      serialNumber: values.serialNumber,
      tsn: values.tsn,
      maxHours: values.maxHours,
      installDate: new Date().toISOString(),
      installHours: aircraft?.currentHobbs || 0,
      manufacturer: 'Unknown',
      partNumber: 'N/A',
      notes: '',
      tso: 0,
      totalTime: values.tsn
    };

    updateDocumentNonBlocking(aircraftRef, {
      components: arrayUnion(newComponent)
    });

    toast({ title: 'Component Added', description: `${values.name} is now being tracked.` });
    setIsAddComponentOpen(false);
    componentForm.reset();
  };

  const handleAddDocument = (docDetails: any) => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, {
      documents: arrayUnion(docDetails)
    });
    toast({ title: 'Document Added' });
  };

  const timeTo50 = useMemo(() => {
    if (!aircraft?.currentTacho || !aircraft?.tachoAtNext50Inspection) return 'N/A';
    return (aircraft.tachoAtNext50Inspection - aircraft.currentTacho).toFixed(1);
  }, [aircraft]);

  const timeTo100 = useMemo(() => {
    if (!aircraft?.currentTacho || !aircraft?.tachoAtNext100Inspection) return 'N/A';
    return (aircraft.tachoAtNext100Inspection - aircraft.currentTacho).toFixed(1);
  }, [aircraft]);

  if (isLoadingAircraft) {
    return <div className="max-w-[1200px] mx-auto w-full p-6"><Skeleton className="h-96 w-full" /></div>;
  }

  if (!aircraft) {
    return <div className="max-w-[1200px] mx-auto w-full p-6 text-center">Aircraft not found.</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 px-1">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link href="/assets/aircraft"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">Hobbs:</span>
            <span className="font-mono font-bold text-primary">{aircraft.currentHobbs?.toFixed(1) || '0.0'}</span>
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">Tacho:</span>
            <span className="font-mono font-bold text-primary">{aircraft.currentTacho?.toFixed(1) || '0.0'}</span>
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">To 50h:</span>
            <span className={cn("font-mono font-bold", Number(timeTo50) < 10 ? "text-destructive" : "text-green-600")}>
              {timeTo50}h
            </span>
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">To 100h:</span>
            <span className={cn("font-mono font-bold", Number(timeTo100) < 10 ? "text-destructive" : "text-green-600")}>
              {timeTo100}h
            </span>
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="maintenance" className="flex-1 flex flex-col min-h-0">
        <div className="px-1 shrink-0">
          <TabsList className="bg-transparent h-auto p-0 gap-2 mb-4 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex">
            <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">
              <History className="h-4 w-4 mr-2" /> Maintenance Logs
            </TabsTrigger>
            <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">
              <FileText className="h-4 w-4 mr-2" /> Technical Documents
            </TabsTrigger>
            <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">
              <Settings2 className="h-4 w-4 mr-2" /> Component Tracker
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 px-1 overflow-hidden">
          {/* MAINTENANCE TAB */}
          <TabsContent value="maintenance" className="m-0 h-full">
            <Card className="h-full flex flex-col shadow-none border overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between bg-muted/5 shrink-0">
                <CardTitle className="text-lg">Maintenance History</CardTitle>
                <Button size="sm" className="gap-2">
                  <PlusCircle className="h-4 w-4" /> Add Maintenance Log
                </Button>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-auto custom-scrollbar">
                <Table>
                  <TableHeader className="bg-muted/30 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-[10px] uppercase font-bold">Date</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold">Type</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold">Reference</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap font-medium text-xs">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">{log.maintenanceType}</Badge></TableCell>
                        <TableCell className="text-xs font-mono">{log.reference || 'N/A'}</TableCell>
                        <TableCell className="text-xs max-w-md truncate">{log.details}</TableCell>
                      </TableRow>
                    ))}
                    {(!logs || logs.length === 0) && (
                      <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">No maintenance logs recorded.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DOCUMENTS TAB */}
          <TabsContent value="documents" className="m-0 h-full">
            <Card className="h-full flex flex-col shadow-none border overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between bg-muted/5 shrink-0">
                <CardTitle className="text-lg">Technical Documents</CardTitle>
                <DocumentUploader
                  onDocumentUploaded={handleAddDocument}
                  trigger={(open) => (
                    <Button size="sm" variant="outline" onClick={() => open()} className="gap-2">
                      <FileUp className="h-4 w-4" /> Add Document
                    </Button>
                  )}
                />
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-auto custom-scrollbar">
                <Table>
                  <TableHeader className="bg-muted/30 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-[10px] uppercase font-bold">Document Name</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold">Upload Date</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold">Expiry</TableHead>
                      <TableHead className="text-right text-[10px] uppercase font-bold">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aircraft.documents?.map((doc, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold text-xs">{doc.name}</TableCell>
                        <TableCell className="text-xs">{format(new Date(doc.uploadDate), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-xs">{doc.expirationDate ? format(new Date(doc.expirationDate), 'dd MMM yyyy') : 'Permanent'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={doc.url} target="_blank">View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!aircraft.documents || aircraft.documents.length === 0) && (
                      <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">No documents uploaded.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* COMPONENTS TAB */}
          <TabsContent value="components" className="m-0 h-full">
            <Card className="h-full flex flex-col shadow-none border overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between bg-muted/5 shrink-0">
                <CardTitle className="text-lg">Component Lifecycle Tracker</CardTitle>
                <Dialog open={isAddComponentOpen} onOpenChange={setIsAddComponentOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2"><PlusCircle className="h-4 w-4" /> Add Component</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Serialized Component</DialogTitle>
                      <DialogDescription>Track hours since new and lifecycle limits for critical parts.</DialogDescription>
                    </DialogHeader>
                    <Form {...componentForm}>
                      <form onSubmit={componentForm.handleSubmit(handleAddComponent)} className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={componentForm.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g. Engine" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={componentForm.control} name="serialNumber" render={({ field }) => (
                            <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input placeholder="S/N" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={componentForm.control} name="tsn" render={({ field }) => (
                            <FormItem><FormLabel>Time Since New (TSN)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={componentForm.control} name="maxHours" render={({ field }) => (
                            <FormItem><FormLabel>Life Limit (Hours)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                        <DialogFooter className="pt-4">
                          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                          <Button type="submit">Save Component</Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-auto custom-scrollbar">
                <Table>
                  <TableHeader className="bg-muted/30 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-[10px] uppercase font-bold">Component</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold">Serial No.</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-right">TSN</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-right">Life Limit</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-right">Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aircraft.components?.map((comp) => {
                      const currentTsn = (comp.tsn || 0) + ((aircraft.currentHobbs || 0) - (comp.installHours || 0));
                      const remaining = Math.max(0, (comp.maxHours || 0) - currentTsn);
                      return (
                        <TableRow key={comp.id}>
                          <TableCell className="font-semibold text-xs">{comp.name}</TableCell>
                          <TableCell className="text-xs font-mono">{comp.serialNumber}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{currentTsn.toFixed(1)}h</TableCell>
                          <TableCell className="text-right text-xs font-mono">{comp.maxHours?.toFixed(1)}h</TableCell>
                          <TableCell className={cn("text-right text-xs font-bold font-mono", remaining < 50 ? "text-destructive" : "text-green-600")}>
                            {remaining.toFixed(1)}h
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(!aircraft.components || aircraft.components.length === 0) && (
                      <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">No lifecycle components tracked.</TableCell></TableRow>
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

const Table = ({ children, className }: any) => <table className={cn("w-full text-left border-collapse", className)}>{children}</table>;
const TableHeader = ({ children, className }: any) => <thead className={className}>{children}</thead>;
const TableBody = ({ children, className }: any) => <tbody className={className}>{children}</tbody>;
const TableRow = ({ children, className }: any) => <tr className={cn("border-b hover:bg-muted/20 transition-colors", className)}>{children}tr>;
const TableHead = ({ children, className }: any) => <th className={cn("px-4 py-3 text-muted-foreground", className)}>{children}</th>;
const TableCell = ({ children, className }: any) => <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
