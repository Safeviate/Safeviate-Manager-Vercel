
'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Settings2, 
  Clock, 
  PlusCircle, 
  Trash2, 
  FileUp, 
  Camera, 
  CalendarIcon,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { DocumentUploader } from '@/components/document-uploader';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { cn } from '@/lib/utils';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const StatCard = ({ label, value, remaining, color }: { label: string; value?: number; remaining?: number | null; color?: 'blue' | 'orange' }) => (
  <Card className={cn(
    "shadow-sm",
    color === 'blue' && "bg-blue-50/50 border-blue-100",
    color === 'orange' && "bg-orange-50/50 border-orange-100"
  )}>
    <CardContent className="p-3">
      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold">{value?.toFixed(1) || '0.0'}</span>
        {remaining !== undefined && remaining !== null && (
          <span className="text-[10px] font-medium text-muted-foreground">
            {remaining.toFixed(1)} left
          </span>
        )}
      </div>
    </CardContent>
  </Card>
);

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const [isEditHoursOpen, setIsEditHoursOpen] = useState(false);
  const [isEditServiceOpen, setIsEditServiceOpen] = useState(false);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`), orderBy('name')) : null),
    [firestore, tenantId, aircraftId]
  );

  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  const handleUpdateHours = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updates = {
      currentHobbs: parseFloat(formData.get('currentHobbs') as string),
      currentTacho: parseFloat(formData.get('currentTacho') as string),
    };
    if (aircraftRef) {
      updateDocumentNonBlocking(aircraftRef, updates);
      toast({ title: "Flight Hours Updated" });
      setIsEditHoursOpen(false);
    }
  };

  const handleUpdateService = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updates = {
      tachoAtNext50Inspection: parseFloat(formData.get('next50') as string),
      tachoAtNext100Inspection: parseFloat(formData.get('next100') as string),
    };
    if (aircraftRef) {
      updateDocumentNonBlocking(aircraftRef, updates);
      toast({ title: "Service Targets Updated" });
      setIsEditServiceOpen(false);
    }
  };

  const handleAddComponent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;
    const formData = new FormData(e.currentTarget);
    const componentsRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`);
    addDocumentNonBlocking(componentsRef, {
      name: formData.get('name'),
      partNumber: formData.get('partNumber'),
      serialNumber: formData.get('serialNumber'),
      installDate: new Date().toISOString(),
      tsn: parseFloat(formData.get('tsn') as string) || 0,
      maxHours: parseFloat(formData.get('maxHours') as string) || 0,
    });
    toast({ title: "Component Added" });
    setIsAddComponentOpen(false);
  };

  const handleAddLog = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;
    const formData = new FormData(e.currentTarget);
    const logsRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(logsRef, {
      date: new Date().toISOString(),
      maintenanceType: formData.get('type'),
      details: formData.get('details'),
      ameNo: formData.get('ameNo'),
      amoNo: formData.get('amoNo'),
      reference: formData.get('reference'),
    });
    toast({ title: "Maintenance Entry Recorded" });
    setIsAddLogOpen(false);
  };

  const onDocumentUploaded = (docDetails: any) => {
    if (!aircraftRef) return;
    const currentDocs = aircraft?.documents || [];
    updateDocumentNonBlocking(aircraftRef, {
      documents: [...currentDocs, docDetails]
    });
  };

  if (isLoadingAircraft) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button asChild variant="outline" size="sm">
          <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Fleet</Link>
        </Button>
        <div className="flex gap-2">
          <Dialog open={isEditHoursOpen} onOpenChange={setIsEditHoursOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Clock className="mr-2 h-4 w-4" /> Edit Flight Hours</Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleUpdateHours}>
                <DialogHeader>
                  <DialogTitle>Update Flight Hours</DialogTitle>
                  <DialogDescription>Manually override current meter readings.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="currentHobbs">Current Hobbs</Label>
                    <Input id="currentHobbs" name="currentHobbs" type="number" step="0.1" defaultValue={aircraft.currentHobbs} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="currentTacho">Current Tachometer</Label>
                    <Input id="currentTacho" name="currentTacho" type="number" step="0.1" defaultValue={aircraft.currentTacho} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Save Updates</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditServiceOpen} onOpenChange={setIsEditServiceOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Settings2 className="mr-2 h-4 w-4" /> Edit Service</Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleUpdateService}>
                <DialogHeader>
                  <DialogTitle>Service Targets</DialogTitle>
                  <DialogDescription>Set next Tachometer readings for inspection intervals.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="next50">Next 50-Hour Inspection</Label>
                    <Input id="next50" name="next50" type="number" step="0.1" defaultValue={aircraft.tachoAtNext50Inspection} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="next100">Next 100-Hour Inspection</Label>
                    <Input id="next100" name="next100" type="number" step="0.1" defaultValue={aircraft.tachoAtNext100Inspection} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Save Targets</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-2">
        <StatCard label="Initial Hobbs" value={aircraft.initialHobbs} />
        <StatCard label="Initial Tacho" value={aircraft.initialTacho} />
        <StatCard label="Current Hobbs" value={aircraft.currentHobbs} />
        <StatCard label="Current Tacho" value={aircraft.currentTacho} />
        <StatCard 
          label="Next 50hr" 
          value={aircraft.tachoAtNext50Inspection} 
          remaining={aircraft.tachoAtNext50Inspection ? aircraft.tachoAtNext50Inspection - (aircraft.currentTacho || 0) : null} 
          color="blue" 
        />
        <StatCard 
          label="Next 100hr" 
          value={aircraft.tachoAtNext100Inspection} 
          remaining={aircraft.tachoAtNext100Inspection ? aircraft.tachoAtNext100Inspection - (aircraft.currentTacho || 0) : null} 
          color="orange" 
        />
      </div>

      <Tabs defaultValue="components" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0">
          <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Tracked Components</TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Maintenance History</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Documents</TabsTrigger>
        </TabsList>

        <div className="border rounded-xl bg-card overflow-hidden">
          <TabsContent value="components" className="m-0">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold">Tracked Components</h3>
                  <p className="text-sm text-muted-foreground">Monitoring life-limited parts and assemblies.</p>
                </div>
                <Dialog open={isAddComponentOpen} onOpenChange={setIsAddComponentOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleAddComponent}>
                      <DialogHeader>
                        <DialogTitle>Track New Component</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label>Component Name</Label>
                          <Input name="name" placeholder="e.g., Propeller" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label>Part Number</Label>
                            <Input name="partNumber" required />
                          </div>
                          <div className="grid gap-2">
                            <Label>Serial Number</Label>
                            <Input name="serialNumber" required />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label>Current TSN</Label>
                            <Input name="tsn" type="number" step="0.1" required />
                          </div>
                          <div className="grid gap-2">
                            <Label>Max Life (Hours)</Label>
                            <Input name="maxHours" type="number" step="0.1" required />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">Add Component</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Serial No.</TableHead>
                    <TableHead className="text-right">TSN</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Max Life</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components?.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-xs font-mono">{c.serialNumber}</TableCell>
                      <TableCell className="text-right font-mono">{c.tsn?.toFixed(1) || '0.0'}</TableCell>
                      <TableCell className="text-right font-mono">{(c.maxHours - c.tsn)?.toFixed(1) || '0.0'}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{c.maxHours?.toFixed(1) || '0.0'}</TableCell>
                    </TableRow>
                  ))}
                  {components?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No tracked components.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="maintenance" className="m-0">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold">Maintenance Records</h3>
                  <p className="text-sm text-muted-foreground">Technical history and certification log.</p>
                </div>
                <Dialog open={isAddLogOpen} onOpenChange={setIsAddLogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Entry</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <form onSubmit={handleAddLog}>
                      <DialogHeader>
                        <DialogTitle>Maintenance Entry</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label>Maintenance Type</Label>
                          <Input name="type" placeholder="e.g., 50hr Inspection" required />
                        </div>
                        <div className="grid gap-2">
                          <Label>Details of Work</Label>
                          <Textarea name="details" placeholder="Full technical description..." required className="min-h-32" />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="grid gap-2">
                            <Label>AME No.</Label>
                            <Input name="ameNo" required />
                          </div>
                          <div className="grid gap-2">
                            <Label>AMO No.</Label>
                            <Input name="amoNo" required />
                          </div>
                          <div className="grid gap-2">
                            <Label>Reference</Label>
                            <Input name="reference" placeholder="Job Card #" required />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">Certify Entry</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
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
                  {logs?.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(l.date), 'dd MMM yy')}</TableCell>
                      <TableCell className="font-semibold">{l.maintenanceType}</TableCell>
                      <TableCell className="max-w-md truncate">{l.details}</TableCell>
                      <TableCell>{l.ameNo}</TableCell>
                      <TableCell>{l.amoNo}</TableCell>
                      <TableCell>{l.reference}</TableCell>
                    </TableRow>
                  ))}
                  {logs?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No maintenance history recorded.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="m-0">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold">Aircraft Documentation</h3>
                  <p className="text-sm text-muted-foreground">C of A, Insurance, and other technical certificates.</p>
                </div>
                <DocumentUploader
                  onDocumentUploaded={onDocumentUploaded}
                  trigger={(open) => (
                    <Button size="sm" variant="outline" onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {aircraft.documents?.map((doc, i) => (
                  <Card key={i} className="bg-muted/20">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileUp className="h-4 w-4" />
                        {doc.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-[10px] text-muted-foreground mb-3">Uploaded: {format(new Date(doc.uploadDate), 'PPP')}</p>
                      <Button asChild size="sm" variant="secondary" className="w-full">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">View Document</a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                {(!aircraft.documents || aircraft.documents.length === 0) && (
                  <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                    No documents uploaded.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
