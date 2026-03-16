
'use client';

import { use, useMemo, useState, useEffect } from 'react';
import { doc, collection, query, orderBy, arrayUnion } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ArrowLeft, Clock, FileText, Settings, History, PlusCircle, Trash2, Gauge, AlertCircle, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { DocumentUploader } from '@/components/document-uploader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const componentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  serialNumber: z.string().min(1, "Serial number is required"),
  installHours: z.number({ coerce: true }).min(0),
  maxHours: z.number({ coerce: true }).min(1),
  notes: z.string().optional(),
});

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
  const { data: maintenanceLogs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);

  const form = useForm<z.infer<typeof componentSchema>>({
    resolver: zodResolver(componentSchema),
    defaultValues: {
      name: '',
      serialNumber: '',
      installHours: 0,
      maxHours: 2000,
      notes: '',
    }
  });

  const handleAddComponent = async (values: z.infer<typeof componentSchema>) => {
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
      notes: values.notes || '',
    };

    try {
      updateDocumentNonBlocking(aircraftRef, {
        components: arrayUnion(newComponent)
      });
      toast({ title: "Component Added", description: "The new component has been added to the tracker." });
      setIsAddComponentOpen(false);
      form.reset();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string }) => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, {
      documents: arrayUnion(docDetails)
    });
    toast({ title: "Document Uploaded" });
  };

  if (isLoadingAircraft) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!aircraft) {
    return <div className="p-8 text-center">Aircraft not found.</div>;
  }

  // --- Technical Status Calculations ---
  const timeTo50 = aircraft.tachoAtNext50Inspection && aircraft.currentTacho 
    ? (aircraft.tachoAtNext50Inspection - aircraft.currentTacho).toFixed(1) 
    : 'N/A';
  
  const timeTo100 = aircraft.tachoAtNext100Inspection && aircraft.currentTacho 
    ? (aircraft.tachoAtNext100Inspection - aircraft.currentTacho).toFixed(1) 
    : 'N/A';

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden">
      <div className="flex justify-between items-center px-1">
        <Button asChild variant="ghost" className="gap-2">
          <Link href="/assets/aircraft"><ArrowLeft className="h-4 w-4" /> Back to Fleet</Link>
        </Button>
        <div className="flex gap-2">
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">Hobbs:</span>
            <span className="font-mono font-bold text-primary">{(aircraft.currentHobbs || 0).toFixed(1)}</span>
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">Tacho:</span>
            <span className="font-mono font-bold text-primary">{(aircraft.currentTacho || 0).toFixed(1)}</span>
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">To 50h:</span>
            <span className={cn("font-mono font-bold", Number(timeTo50) < 10 ? "text-destructive" : "text-green-600")}>
              {timeTo50}h
            </span>
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">To 100h:</span>
            <span className={cn("font-mono font-bold", Number(timeTo100) < 20 ? "text-destructive" : "text-green-600")}>
              {timeTo100}h
            </span>
          </Badge>
        </div>
      </div>

      <Card className="shadow-none border bg-muted/5 shrink-0">
        <CardHeader className="py-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{aircraft.tailNumber}</CardTitle>
              <CardDescription>{aircraft.make} {aircraft.model} • {aircraft.type}</CardDescription>
            </div>
            <Badge variant={aircraft.organizationId ? 'outline' : 'secondary'}>
              {aircraft.organizationId ? 'External Asset' : 'Internal Fleet'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="maintenance" className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-4 border-b-0 justify-start overflow-x-auto no-scrollbar px-1">
          <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Maintenance Logs</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Technical Documents</TabsTrigger>
          <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Component Tracker</TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 px-1 pb-10">
          <TabsContent value="maintenance" className="m-0 h-full">
            <Card className="h-full flex flex-col shadow-none border">
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <CardTitle className="text-lg">Maintenance History</CardTitle>
                <Button size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Log</Button>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar">
                {isLoadingLogs ? <div className="p-8 text-center">Loading logs...</div> : (
                  <div className="divide-y">
                    {(maintenanceLogs || []).map(log => (
                      <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-bold text-sm">{log.maintenanceType}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">{format(new Date(log.date), 'dd MMM yyyy')}</p>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{log.details}</p>
                      </div>
                    ))}
                    {(maintenanceLogs || []).length === 0 && <div className="p-12 text-center text-muted-foreground italic text-sm">No maintenance logs recorded.</div>}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="m-0 h-full">
            <Card className="h-full flex flex-col shadow-none border">
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <CardTitle className="text-lg">Compliance Documents</CardTitle>
                <DocumentUploader
                  onDocumentUploaded={onDocumentUploaded}
                  trigger={(open) => <Button size="sm" variant="outline" onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>}
                />
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar">
                <div className="divide-y">
                  {(aircraft.documents || []).map((doc, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-muted/30">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-bold text-sm">{doc.name}</p>
                          <p className="text-[10px] text-muted-foreground">Uploaded {format(new Date(doc.uploadDate), 'PPP')}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild><Link href={doc.url} target="_blank">View</Link></Button>
                    </div>
                  ))}
                  {(aircraft.documents || []).length === 0 && <div className="p-12 text-center text-muted-foreground italic text-sm">No documents uploaded.</div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="components" className="m-0 h-full">
            <Card className="h-full flex flex-col shadow-none border">
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <CardTitle className="text-lg">Component Lifecycle</CardTitle>
                <Dialog open={isAddComponentOpen} onOpenChange={setIsAddComponentOpen}>
                  <DialogTrigger asChild><Button size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Track New Component</DialogTitle>
                      <DialogDescription>Add a serialized part to the lifecycle tracker.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleAddComponent)} className="space-y-4 pt-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g., Engine No. 1" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="serialNumber" render={({ field }) => (
                          <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input placeholder="S/N..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="installHours" render={({ field }) => (
                            <FormItem><FormLabel>Install Hours (TSN)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="maxHours" render={({ field }) => (
                            <FormItem><FormLabel>Life Limit (Hours)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                        <DialogFooter><Button type="submit">Track Component</Button></DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar">
                <div className="divide-y">
                  {(aircraft.components || []).map(comp => {
                    const remaining = comp.maxHours - (aircraft.currentHobbs || 0);
                    return (
                      <div key={comp.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="space-y-1">
                          <p className="font-bold text-sm">{comp.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-mono">S/N: {comp.serialNumber}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn("text-sm font-bold", remaining < 50 ? "text-destructive" : "text-primary")}>{remaining.toFixed(1)}h Remaining</p>
                          <p className="text-[10px] text-muted-foreground">Limit: {comp.maxHours}h</p>
                        </div>
                      </div>
                    )
                  })}
                  {(aircraft.components || []).length === 0 && <div className="p-12 text-center text-muted-foreground italic text-sm">No components being tracked.</div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
