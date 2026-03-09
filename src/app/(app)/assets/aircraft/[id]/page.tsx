
'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ArrowLeft, Clock, Settings2, PlusCircle, Trash2, FileUp, Camera, FileText } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import { Textarea } from '@/components/ui/textarea';
import { DocumentUploader } from '@/components/document-uploader';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const [tacho50, setTacho50] = useState('');
  const [tacho100, setTacho100] = useState('');
  const [hobbsInput, setHobbsInput] = useState('');
  const [tachoInput, setTachoInput] = useState('');

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`) : null),
    [firestore, tenantId, aircraftId]
  );

  const logsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: loadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: loadingComponents } = useCollection<AircraftComponent>(componentsQuery);
  const { data: logs, isLoading: loadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  const handleUpdateService = () => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, {
      tachoAtNext50Inspection: parseFloat(tacho50) || aircraft?.tachoAtNext50Inspection,
      tachoAtNext100Inspection: parseFloat(tacho100) || aircraft?.tachoAtNext100Inspection,
    });
    toast({ title: 'Service Targets Updated' });
  };

  const handleUpdateHours = () => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, {
      currentHobbs: parseFloat(hobbsInput) || aircraft?.currentHobbs,
      currentTacho: parseFloat(tachoInput) || aircraft?.currentTacho,
    });
    toast({ title: 'Flight Hours Updated' });
  };

  const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    if (!aircraftRef || !aircraft) return;
    const currentDocs = aircraft.documents || [];
    updateDocumentNonBlocking(aircraftRef, {
      documents: [...currentDocs, docDetails]
    });
    toast({ title: 'Document Added' });
  };

  if (loadingAircraft) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  const tacho = aircraft.currentTacho || 0;
  const rem50 = (aircraft.tachoAtNext50Inspection || 0) - tacho;
  const rem100 = (aircraft.tachoAtNext100Inspection || 0) - tacho;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 px-2 text-muted-foreground">
            <Link href="/assets/aircraft">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
          <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline"><Settings2 className="mr-2 h-4 w-4" /> Edit Service</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Service Targets</DialogTitle>
                <DialogDescription>Set next Tachometer readings for inspection intervals.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Next 50hr Inspection (Tacho)</Label>
                  <Input type="number" step="0.1" value={tacho50} onChange={(e) => setTacho50(e.target.value)} placeholder={aircraft.tachoAtNext50Inspection?.toString()} />
                </div>
                <div className="grid gap-2">
                  <Label>Next 100hr Inspection (Tacho)</Label>
                  <Input type="number" step="0.1" value={tacho100} onChange={(e) => setTacho100(e.target.value)} placeholder={aircraft.tachoAtNext100Inspection?.toString()} />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button onClick={handleUpdateService}>Save Targets</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline"><Clock className="mr-2 h-4 w-4" /> Edit Flight Hours</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Current Hours</DialogTitle>
                <DialogDescription>Manually override the current Hobbs and Tachometer readings.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Current Hobbs</Label>
                  <Input type="number" step="0.1" value={hobbsInput} onChange={(e) => setHobbsInput(e.target.value)} placeholder={aircraft.currentHobbs?.toString()} />
                </div>
                <div className="grid gap-2">
                  <Label>Current Tachometer</Label>
                  <Input type="number" step="0.1" value={tachoInput} onChange={(e) => setTachoInput(e.target.value)} placeholder={aircraft.currentTacho?.toString()} />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button onClick={handleUpdateHours}>Update Hours</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Visual Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border bg-card flex flex-col justify-center">
          <p className="text-sm font-medium text-muted-foreground mb-4">Current Tachometer</p>
          <p className="text-5xl font-mono font-bold">{(aircraft.currentTacho || 0).toFixed(1)}</p>
        </div>

        <div className="p-6 rounded-xl border bg-blue-50/50 border-blue-100 flex flex-col justify-center">
          <p className="text-sm font-medium text-blue-600 mb-4">Next 50hr Inspection</p>
          <p className="text-5xl font-mono font-bold text-blue-900">{(aircraft.tachoAtNext50Inspection || 0).toFixed(1)}</p>
          <p className="text-sm font-medium text-blue-500 mt-2">{rem50.toFixed(1)} hrs remaining</p>
        </div>

        <div className="p-6 rounded-xl border bg-orange-50/50 border-orange-100 flex flex-col justify-center">
          <p className="text-sm font-medium text-orange-600 mb-4">Next 100hr Inspection</p>
          <p className="text-5xl font-mono font-bold text-orange-900">{(aircraft.tachoAtNext100Inspection || 0).toFixed(1)}</p>
          <p className="text-sm font-medium text-orange-500 mt-2">{rem100.toFixed(1)} hrs remaining</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Status & Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-xs uppercase">Initial Hobbs</Label>
              <p className="text-lg font-mono font-bold">{(aircraft.initialHobbs || 0).toFixed(1)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs uppercase">Initial Tacho</Label>
              <p className="text-lg font-mono font-bold">{(aircraft.initialTacho || 0).toFixed(1)}</p>
            </div>
            <Separator />
            <div>
              <Label className="text-muted-foreground text-xs uppercase">Current Hobbs</Label>
              <p className="text-lg font-mono font-bold">{(aircraft.currentHobbs || 0).toFixed(1)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs uppercase">Current Tacho</Label>
              <p className="text-lg font-mono font-bold">{(aircraft.currentTacho || 0).toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          <Tabs defaultValue="components" className="w-full">
            <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0">
              <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Tracked Components</TabsTrigger>
              <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Maintenance History</TabsTrigger>
              <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Documents</TabsTrigger>
            </TabsList>

            <div className="border rounded-xl bg-card overflow-hidden">
              <TabsContent value="components" className="m-0">
                <div className="p-6 flex justify-between items-center border-b">
                  <h3 className="font-bold">Life-Limited Components</h3>
                  <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableHead>Component Name</TableHead>
                      <TableHead>Serial No.</TableHead>
                      <TableHead className="text-right">TSN</TableHead>
                      <TableHead className="text-right">Limit</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {components?.map((comp) => {
                      const remaining = (comp.maxHours || 0) - (comp.tsn || 0);
                      return (
                        <TableRow key={comp.id}>
                          <TableCell className="font-medium">{comp.name}</TableCell>
                          <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                          <TableCell className="text-right font-mono">{(comp.tsn || 0).toFixed(1)}</TableCell>
                          <TableCell className="text-right font-mono">{(comp.maxHours || 0).toFixed(1)}</TableCell>
                          <TableCell className={cn("text-right font-bold font-mono", remaining < 50 ? "text-destructive" : "text-green-600")}>
                            {remaining.toFixed(1)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(!components || components.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No components tracked.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="maintenance" className="m-0">
                <div className="p-6 flex justify-between items-center border-b">
                  <h3 className="font-bold">Technical Log</h3>
                  <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Entry</Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>AME No.</TableHead>
                      <TableHead>AMO No.</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="font-medium">{log.maintenanceType}</TableCell>
                        <TableCell className="max-w-xs truncate" title={log.details}>{log.details}</TableCell>
                        <TableCell className="font-mono text-xs">{log.ameNo || 'N/A'}</TableCell>
                        <TableCell className="font-mono text-xs">{log.amoNo || 'N/A'}</TableCell>
                        <TableCell className="font-mono text-xs">{log.reference || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                    {(!logs || logs.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No maintenance records.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="documents" className="m-0">
                <div className="p-6 flex justify-between items-center border-b">
                  <h3 className="font-bold">Aircraft Certificates</h3>
                  <DocumentUploader
                    onDocumentUploaded={onDocumentUploaded}
                    trigger={(open) => (
                      <Button size="sm" onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>
                    )}
                  />
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aircraft.documents?.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 border rounded-lg bg-muted/10">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-bold">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">Uploaded {format(new Date(doc.uploadDate), 'PPP')}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">View</a>
                      </Button>
                    </div>
                  ))}
                  {(!aircraft.documents || aircraft.documents.length === 0) && (
                    <p className="col-span-2 text-center py-12 text-muted-foreground">No aircraft documents uploaded.</p>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function Separator() {
  return <div className="h-px bg-border w-full my-2" />;
}
