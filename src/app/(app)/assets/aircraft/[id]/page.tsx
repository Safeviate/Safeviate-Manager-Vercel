'use client';

import { use, useMemo, useState, useEffect } from 'react';
import { doc, collection, query, orderBy, arrayUnion } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentUploader } from '@/components/document-uploader';
import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  FileText,
  History,
  Plus,
  Trash2,
  Settings2,
  Activity,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

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

  if (isLoadingAircraft) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!aircraft) {
    return (
      <div className="max-w-[1200px] mx-auto w-full text-center py-12">
        <p className="text-muted-foreground mb-4">Aircraft not found.</p>
        <Button asChild variant="outline">
          <Link href="/assets/aircraft">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet
          </Link>
        </Button>
      </div>
    );
  }

  const timeTo50 = aircraft.tachoAtNext50Inspection && aircraft.currentTacho 
    ? (aircraft.tachoAtNext50Inspection - aircraft.currentTacho).toFixed(1)
    : 'N/A';

  const timeTo100 = aircraft.tachoAtNext100Inspection && aircraft.currentTacho
    ? (aircraft.tachoAtNext100Inspection - aircraft.currentTacho).toFixed(1)
    : 'N/A';

  return (
    <div className="max-w-[1200px] mx-auto w-full space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Button asChild variant="ghost" className="pl-0 hover:bg-transparent -ml-1 h-auto text-muted-foreground">
            <Link href="/assets/aircraft">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
          <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">Hobbs:</span>
            <span className="font-mono font-bold">{aircraft.currentHobbs?.toFixed(1) || '0.0'}h</span>
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-slate-200">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">Tacho:</span>
            <span className="font-mono font-bold">{aircraft.currentTacho?.toFixed(1) || '0.0'}h</span>
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

      <Tabs defaultValue="maintenance" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start overflow-x-auto no-scrollbar">
          <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0">Maintenance Logs</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0">Technical Documents</TabsTrigger>
          <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0">Component Tracker</TabsTrigger>
        </TabsList>

        <TabsContent value="maintenance" className="mt-0">
          <MaintenanceTab 
            aircraftId={aircraftId} 
            tenantId={tenantId} 
            logs={logs || []} 
            isLoading={isLoadingLogs} 
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-0">
          <DocumentsTab 
            aircraft={aircraft} 
            tenantId={tenantId} 
          />
        </TabsContent>

        <TabsContent value="components" className="mt-0">
          <ComponentsTab 
            aircraft={aircraft} 
            tenantId={tenantId} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MaintenanceTab({ aircraftId, tenantId, logs, isLoading }: { aircraftId: string, tenantId: string, logs: MaintenanceLog[], isLoading: boolean }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleAddLog = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      aircraftId,
      maintenanceType: formData.get('type') as string,
      date: new Date(formData.get('date') as string).toISOString(),
      details: formData.get('details') as string,
      reference: formData.get('reference') as string,
      ameNo: formData.get('ame') as string,
    };

    if (!firestore) return;
    const colRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(colRef, data);
    toast({ title: 'Log Added', description: 'Maintenance entry has been recorded.' });
    setIsOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Maintenance Log
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Maintenance Entry</DialogTitle>
              <DialogDescription>Record a technical intervention or inspection.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddLog} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Entry Type</Label>
                  <Input id="type" name="type" placeholder="e.g., 50h Inspection" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" name="date" type="date" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Reference / Release to Service</Label>
                <Input id="reference" name="reference" placeholder="e.g., CRS-12345" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="details">Work Details</Label>
                <Textarea id="details" name="details" placeholder="Describe the maintenance performed..." required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ame">AME License No.</Label>
                <Input id="ame" name="ame" placeholder="e.g., AME-9988" />
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Save Log</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">AME No.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10">Loading logs...</TableCell></TableRow>
            ) : logs.length > 0 ? (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                  <TableCell><Badge variant="outline">{log.maintenanceType}</Badge></TableCell>
                  <TableCell className="max-w-md truncate" title={log.details}>{log.details}</TableCell>
                  <TableCell>{log.reference || 'N/A'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{log.ameNo || 'N/A'}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No maintenance history recorded.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DocumentsTab({ aircraft, tenantId }: { aircraft: Aircraft, tenantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDocUpload = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    if (!firestore) return;
    const currentDocs = aircraft.documents || [];
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { documents: [...currentDocs, docDetails] });
    toast({ title: 'Document Added' });
  };

  const deleteDocItem = (name: string) => {
    if (!firestore) return;
    const filtered = (aircraft.documents || []).filter(d => d.name !== name);
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { documents: filtered });
    toast({ title: 'Document Deleted' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <DocumentUploader
          onDocumentUploaded={handleDocUpload}
          trigger={(open) => (
            <Button size="sm" onClick={() => open()}>
              <Plus className="mr-2 h-4 w-4" /> Add Document
            </Button>
          )}
        />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Document Name</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(aircraft.documents || []).length > 0 ? (
              (aircraft.documents || []).map((d) => (
                <TableRow key={d.name}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{format(new Date(d.uploadDate), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{d.expirationDate ? format(new Date(d.expirationDate), 'dd MMM yyyy') : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                        <a href={d.url} target="_blank" rel="noopener noreferrer"><FileText className="h-4 w-4" /></a>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDocItem(d.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">No technical documents uploaded.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ComponentsTab({ aircraft, tenantId }: { aircraft: Aircraft, tenantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleAddComponent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const component: AircraftComponent = {
      id: uuidv4(),
      name: formData.get('name') as string,
      serialNumber: formData.get('serial') as string,
      partNumber: formData.get('part') as string,
      manufacturer: formData.get('manufacturer') as string,
      installDate: new Date(formData.get('date') as string).toISOString(),
      installHours: parseFloat(formData.get('installHours') as string) || 0,
      maxHours: parseFloat(formData.get('maxHours') as string) || 0,
      tsn: parseFloat(formData.get('tsn') as string) || 0,
      tso: 0,
      totalTime: 0,
      notes: '',
    };

    if (!firestore) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: arrayUnion(component) });
    toast({ title: 'Component Added', description: `Tracked item "${component.name}" added.` });
    setIsOpen(false);
  };

  const removeComponent = (id: string) => {
    if (!firestore) return;
    const filtered = (aircraft.components || []).filter(c => c.id !== id);
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { components: filtered });
    toast({ title: 'Component Removed' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Component
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Track New Component</DialogTitle>
              <DialogDescription>Define a serialized part for lifecycle tracking.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddComponent} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Component Name</Label>
                  <Input id="name" name="name" placeholder="e.g., Engine No. 1" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input id="manufacturer" name="manufacturer" placeholder="e.g., Lycoming" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="part">Part Number</Label>
                  <Input id="part" name="part" placeholder="O-360-A4M" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serial">Serial Number</Label>
                  <Input id="serial" name="serial" placeholder="L-12345-36A" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Install Date</Label>
                  <Input id="date" name="date" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tsn">TSN at Install</Label>
                  <Input id="tsn" name="tsn" type="number" step="0.1" placeholder="0.0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="installHours">A/C Hours at Install</Label>
                  <Input id="installHours" name="installHours" type="number" step="0.1" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxHours">Life Limit (Hours)</Label>
                  <Input id="maxHours" name="maxHours" type="number" step="0.1" required />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Save Component</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(aircraft.components || []).length > 0 ? (
          (aircraft.components || []).map((comp) => {
            const currentTsn = comp.tsn + (aircraft.currentHobbs || 0) - comp.installHours;
            const hoursRemaining = comp.maxHours - currentTsn;
            const progress = (currentTsn / comp.maxHours) * 100;
            const isNearLimit = hoursRemaining < 100;

            return (
              <Card key={comp.id} className="shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-sm">{comp.name}</CardTitle>
                      <CardDescription className="text-xs">SN: {comp.serialNumber}</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeComponent(comp.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Hours Remaining:</span>
                    <span className={cn("font-bold", isNearLimit ? "text-destructive" : "text-primary")}>
                      {hoursRemaining.toFixed(1)}h
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all", isNearLimit ? "bg-destructive" : "bg-primary")}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] uppercase font-bold text-muted-foreground">
                    <div>TSN: {currentTsn.toFixed(1)}h</div>
                    <div className="text-right">Limit: {comp.maxHours}h</div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg bg-muted/10">
            <Activity className="mx-auto h-8 w-8 text-muted-foreground opacity-20 mb-2" />
            <p className="text-sm text-muted-foreground">No components tracked for this aircraft.</p>
          </div>
        )}
      </div>
    </div>
  );
}
