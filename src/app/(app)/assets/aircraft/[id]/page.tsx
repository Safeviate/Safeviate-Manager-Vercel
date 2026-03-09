'use client';

import { use, useState, useMemo, useEffect } from 'react';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Pencil, PlusCircle, Settings2, FileText, Wrench, ShieldCheck, Clock } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import { Textarea } from '@/components/ui/textarea';
import { DocumentUploader } from '@/components/document-uploader';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`)) : null),
    [firestore, tenantId, aircraftId]
  );

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  const [isHoursDialogOpen, setIsHoursDialogOpen] = useState(false);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isLogDialogOpen, setIsLogsDialogOpen] = useState(false);

  // Form states
  const [hours, setHours] = useState({ hobbs: 0, tacho: 0 });
  const [serviceTargets, setServiceTargets] = useState({ next50: 0, next100: 0 });

  useEffect(() => {
    if (aircraft) {
      setHours({ hobbs: aircraft.currentHobbs || 0, tacho: aircraft.currentTacho || 0 });
      setServiceTargets({ next50: aircraft.tachoAtNext50Inspection || 0, next100: aircraft.tachoAtNext100Inspection || 0 });
    }
  }, [aircraft]);

  if (isLoadingAircraft) return <Skeleton className="h-96 w-full" />;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  const handleUpdateHours = () => {
    updateDocumentNonBlocking(aircraftRef!, { currentHobbs: hours.hobbs, currentTacho: hours.tacho });
    toast({ title: "Hours Updated" });
    setIsHoursDialogOpen(false);
  };

  const handleUpdateService = () => {
    updateDocumentNonBlocking(aircraftRef!, { tachoAtNext50Inspection: serviceTargets.next50, tachoAtNext100Inspection: serviceTargets.next100 });
    toast({ title: "Service Intervals Updated" });
    setIsServiceDialogOpen(false);
  };

  const onDocumentUploaded = (docDetails: any) => {
    const currentDocs = aircraft.documents || [];
    updateDocumentNonBlocking(aircraftRef!, { documents: [...currentDocs, docDetails] });
    toast({ title: "Document Uploaded" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/assets/aircraft"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <p className="text-muted-foreground">{aircraft.make} {aircraft.model}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isHoursDialogOpen} onOpenChange={setIsHoursDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Clock className="mr-2 h-4 w-4" /> Edit Hours</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Current Hours</DialogTitle>
                <DialogDescription>Manually set current Hobbs and Tachometer readings.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Current Hobbs</Label>
                  <Input type="number" step="0.1" value={hours.hobbs} onChange={(e) => setHours({ ...hours, hobbs: parseFloat(e.target.value) })} />
                </div>
                <div className="grid gap-2">
                  <Label>Current Tacho</Label>
                  <Input type="number" step="0.1" value={hours.tacho} onChange={(e) => setHours({ ...hours, tacho: parseFloat(e.target.value) })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleUpdateHours}>Save Readings</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
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
                  <Label>Next 50 Hour (Tacho)</Label>
                  <Input type="number" step="0.1" value={serviceTargets.next50} onChange={(e) => setServiceTargets({ ...serviceTargets, next50: parseFloat(e.target.value) })} />
                </div>
                <div className="grid gap-2">
                  <Label>Next 100 Hour (Tacho)</Label>
                  <Input type="number" step="0.1" value={serviceTargets.next100} onChange={(e) => setServiceTargets({ ...serviceTargets, next100: parseFloat(e.target.value) })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleUpdateService}>Update Targets</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-muted/30 border-none shadow-none">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase text-muted-foreground">Current Hobbs</p>
            <p className="text-2xl font-bold">{aircraft.currentHobbs?.toFixed(1) || '0.0'}h</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 border-none shadow-none">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase text-muted-foreground">Current Tacho</p>
            <p className="text-2xl font-bold">{aircraft.currentTacho?.toFixed(1) || '0.0'}h</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 border-none shadow-none">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase text-muted-foreground">Next 50h Service</p>
            <p className="text-2xl font-bold">{(aircraft.tachoAtNext50Inspection || 0).toFixed(1)}h</p>
            <Badge variant={(aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0) < 10 ? 'destructive' : 'secondary'} className="mt-1">
              {((aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0)).toFixed(1)}h remaining
            </Badge>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 border-none shadow-none">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase text-muted-foreground">Next 100h Service</p>
            <p className="text-2xl font-bold">{(aircraft.tachoAtNext100Inspection || 0).toFixed(1)}h</p>
            <Badge variant={(aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0) < 15 ? 'destructive' : 'secondary'} className="mt-1">
              {((aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0)).toFixed(1)}h remaining
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="maintenance" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0">
          <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Tracked Components</TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Maintenance History</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="mt-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Time-Limited Components</CardTitle>
                <CardDescription>Tracking structural and engine components by Tachometer hours.</CardDescription>
              </div>
              <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Serial No.</TableHead>
                    <TableHead className="text-right">TSN</TableHead>
                    <TableHead className="text-right">Life Limit</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components?.map(comp => {
                    const remaining = (comp.maxHours || 0) - (comp.tsn || 0);
                    return (
                      <TableRow key={comp.id}>
                        <TableCell className="font-semibold">{comp.name}</TableCell>
                        <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                        <TableCell className="text-right">{comp.tsn?.toFixed(1) || '0.0'}h</TableCell>
                        <TableCell className="text-right text-muted-foreground">{comp.maxHours?.toFixed(1) || 'N/A'}h</TableCell>
                        <TableCell className="text-right font-bold">
                          <Badge variant={remaining < 50 ? 'destructive' : 'secondary'}>{remaining.toFixed(1)}h</Badge>
                        </TableCell>
                        <TableCell className="text-right"><Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Technical History</CardTitle>
                <CardDescription>Certified maintenance and inspection log.</CardDescription>
              </div>
              <Dialog open={isLogDialogOpen} onOpenChange={setIsLogsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> New Entry</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>New Maintenance Entry</DialogTitle>
                    <DialogDescription>Record technical work and inspections for certification.</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2 col-span-2"><Label>Maintenance Type</Label><Input placeholder="e.g., 100 Hour Inspection" /></div>
                    <div className="space-y-2 col-span-2"><Label>Details of Work</Label><Textarea placeholder="Describe the work performed..." /></div>
                    <div className="space-y-2"><Label>Engineer License No. (AME)</Label><Input placeholder="AME-XXXX" /></div>
                    <div className="space-y-2"><Label>AMO Number</Label><Input placeholder="AMO-XXXX" /></div>
                    <div className="space-y-2"><Label>Reference</Label><Input placeholder="Job Card / Invoice #" /></div>
                    <div className="space-y-2"><Label>Date</Label><Input type="date" /></div>
                  </div>
                  <DialogFooter>
                    <Button className="w-full">Certify & Save Entry</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>AME No.</TableHead>
                    <TableHead>AMO No.</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap font-medium">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{log.maintenanceType}</TableCell>
                      <TableCell className="max-w-xs truncate">{log.details}</TableCell>
                      <TableCell>{log.ameNo || 'N/A'}</TableCell>
                      <TableCell>{log.amoNo || 'N/A'}</TableCell>
                      <TableCell>{log.reference || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Aircraft Documentation</CardTitle>
                <CardDescription>C of A, Insurance, and other technical certificates.</CardDescription>
              </div>
              <DocumentUploader
                onDocumentUploaded={onDocumentUploaded}
                trigger={(open) => <Button size="sm" onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>}
              />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aircraft.documents?.map(doc => (
                    <TableRow key={doc.name}>
                      <TableCell className="font-semibold">{doc.name}</TableCell>
                      <TableCell>{doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild><Link href={doc.url} target="_blank">View</Link></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!aircraft.documents?.length && <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No documents uploaded.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
