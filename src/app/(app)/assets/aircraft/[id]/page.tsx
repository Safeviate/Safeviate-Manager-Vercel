
'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ArrowLeft, PlusCircle, Wrench, Settings2, FileText, ClipboardList, Clock, Save, Trash2, CalendarIcon, View, Upload } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { DocumentUploader } from '@/components/document-uploader';
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

  const [isEditHoursOpen, setIsEditHoursOpen] = useState(false);
  const [isEditServiceOpen, setIsEditServiceOpen] = useState(false);
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);

  // References
  const aircraftRef = useMemoFirebase(() => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null), [firestore, tenantId, aircraftId]);
  const componentsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`, aircraftId, 'components')) : null), [firestore, aircraftId]);
  const logsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`, aircraftId, 'maintenanceLogs'), orderBy('date', 'desc')) : null), [firestore, aircraftId]);

  // Data
  const { data: aircraft, isLoading: isLoadingAc } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: isLoadingComp } = useCollection<AircraftComponent>(componentsQuery);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  // Form states
  const [hobbs, setHobbs] = useState(0);
  const [tacho, setTacho] = useState(0);
  const [tacho50, setTacho50] = useState(0);
  const [tacho100, setTacho100] = useState(0);

  const handleUpdateHours = () => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, { currentHobbs: Number(hobbs), currentTacho: Number(tacho) });
    setIsEditHoursOpen(false);
    toast({ title: 'Flight Hours Updated' });
  };

  const handleUpdateService = () => {
    if (!aircraftRef) return;
    updateDocumentNonBlocking(aircraftRef, { tachoAtNext50Inspection: Number(tacho50), tachoAtNext100Inspection: Number(tacho100) });
    setIsEditServiceOpen(false);
    toast({ title: 'Service Intervals Updated' });
  };

  const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    if (!aircraftRef) return;
    const currentDocs = aircraft?.documents || [];
    updateDocumentNonBlocking(aircraftRef, { documents: [...currentDocs, docDetails] });
    toast({ title: 'Document Added' });
  };

  if (isLoadingAc) return <Skeleton className="h-96 w-full" />;
  if (!aircraft) return <div className="text-center py-12">Aircraft not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <Button asChild variant="ghost" className="-ml-2 h-8 text-muted-foreground">
            <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
          <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isEditHoursOpen} onOpenChange={(open) => { setIsEditHoursOpen(open); if (open) { setHobbs(aircraft.currentHobbs || 0); setTacho(aircraft.currentTacho || 0); } }}>
            <DialogTrigger asChild><Button variant="outline"><Clock className="mr-2 h-4 w-4" /> Edit Flight Hours</Button></DialogTrigger>
            <DialogContent className="sm:max-w-xs">
              <DialogHeader><DialogTitle>Update Readings</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2"><Label>Current Hobbs</Label><Input type="number" step="0.1" value={hobbs} onChange={(e) => setHobbs(Number(e.target.value))} /></div>
                <div className="grid gap-2"><Label>Current Tacho</Label><Input type="number" step="0.1" value={tacho} onChange={(e) => setTacho(Number(e.target.value))} /></div>
              </div>
              <DialogFooter><Button onClick={handleUpdateHours}>Save Readings</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditServiceOpen} onOpenChange={(open) => { setIsEditServiceOpen(open); if (open) { setTacho50(aircraft.tachoAtNext50Inspection || 0); setTacho100(aircraft.tachoAtNext100Inspection || 0); } }}>
            <DialogTrigger asChild><Button variant="outline"><Settings2 className="mr-2 h-4 w-4" /> Edit Service</Button></DialogTrigger>
            <DialogContent className="sm:max-w-xs">
              <DialogHeader>
                <DialogTitle>Service Targets</DialogTitle>
                <DialogDescription>Set next Tachometer readings for inspection intervals.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2"><Label>Next 50hr (Tacho)</Label><Input type="number" step="0.1" value={tacho50} onChange={(e) => setTacho50(Number(e.target.value))} /></div>
                <div className="grid gap-2"><Label>Next 100hr (Tacho)</Label><Input type="number" step="0.1" value={tacho100} onChange={(e) => setTacho100(Number(e.target.value))} /></div>
              </div>
              <DialogFooter><Button onClick={handleUpdateService}>Save Targets</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20 shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Current Tachometer</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold font-mono">{aircraft.currentTacho?.toFixed(1) || '0.0'}</p></CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100 shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground text-blue-700">Next 50hr Inspection</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono text-blue-900">{aircraft.tachoAtNext50Inspection?.toFixed(1) || '0.0'}</p>
            <p className="text-xs text-blue-600 mt-1">{(aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0) > 0 ? `${((aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0)).toFixed(1)} hrs remaining` : 'OVERDUE'}</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-100 shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground text-orange-700">Next 100hr Inspection</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono text-orange-900">{aircraft.tachoAtNext100Inspection?.toFixed(1) || '0.0'}</p>
            <p className="text-xs text-orange-600 mt-1">{(aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0) > 0 ? `${((aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0)).toFixed(1)} hrs remaining` : 'OVERDUE'}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="components" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0">
          <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Tracked Components</TabsTrigger>
          <TabsTrigger value="history" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Maintenance History</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Documents</TabsTrigger>
        </TabsList>

        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <TabsContent value="components" className="m-0">
            <Card className="border-none shadow-none bg-transparent">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">Airframe & Engine Components</CardTitle>
                  <CardDescription>Monitor life-limited parts and recurring inspection items.</CardDescription>
                </div>
                <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableHead>Component Name</TableHead>
                      <TableHead>S/N</TableHead>
                      <TableHead className="text-right">TSN</TableHead>
                      <TableHead className="text-right">TSO</TableHead>
                      <TableHead className="text-right">Max Hours</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {components?.map((c) => {
                      const remaining = (c.maxHours || 0) - (c.tsn || 0);
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-muted-foreground">{c.serialNumber}</TableCell>
                          <TableCell className="text-right font-mono">{c.tsn?.toFixed(1) || '0.0'}</TableCell>
                          <TableCell className="text-right font-mono">{c.tso?.toFixed(1) || '0.0'}</TableCell>
                          <TableCell className="text-right font-mono">{c.maxHours?.toFixed(1) || '0.0'}</TableCell>
                          <TableCell className={cn("text-right font-bold font-mono", remaining < 50 ? "text-red-600" : "text-green-600")}>
                            {remaining.toFixed(1)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(!components || components.length === 0) && (
                      <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No components being tracked.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="m-0">
            <Card className="border-none shadow-none bg-transparent">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">Maintenance Logs</CardTitle>
                  <CardDescription>Comprehensive record of all technical work and certifications.</CardDescription>
                </div>
                <Button size="sm" onClick={() => setIsAddLogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add Maintenance Entry</Button>
              </CardHeader>
              <CardContent className="p-0">
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
                        <TableCell className="whitespace-nowrap font-medium">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="font-semibold text-blue-700">{log.maintenanceType}</TableCell>
                        <TableCell className="max-w-md"><p className="line-clamp-2 text-sm text-muted-foreground">{log.details}</p></TableCell>
                        <TableCell className="font-mono text-xs">{log.ameNo || 'N/A'}</TableCell>
                        <TableCell className="font-mono text-xs">{log.amoNo || 'N/A'}</TableCell>
                        <TableCell className="font-mono text-xs">{log.reference || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                    {(!logs || logs.length === 0) && (
                      <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No maintenance records found.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="m-0">
            <Card className="border-none shadow-none bg-transparent">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">Aircraft Documents</CardTitle>
                  <CardDescription>Manage airworthiness certificates, insurance, and registrations.</CardDescription>
                </div>
                <DocumentUploader
                  onDocumentUploaded={onDocumentUploaded}
                  trigger={(open) => <Button size="sm" onClick={() => open()}><Upload className="mr-2 h-4 w-4" /> Upload Document</Button>}
                />
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableHead>Document Name</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aircraft.documents?.map((doc, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell>{format(new Date(doc.uploadDate), 'PPP')}</TableCell>
                        <TableCell>{doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'No Expiry'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild><a href={doc.url} target="_blank" rel="noopener noreferrer"><View className="h-4 w-4" /></a></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!aircraft.documents || aircraft.documents.length === 0) && (
                      <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No documents uploaded.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={isAddLogOpen} onOpenChange={setIsAddLogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Add Maintenance Entry</DialogTitle><DialogDescription>Certify technical work performed on the aircraft.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2"><Label>Maintenance Type</Label><Input placeholder="e.g., 50hr Inspection, Unscheduled Repair" /></div>
            <div className="col-span-2 space-y-2"><Label>Details</Label><Textarea className="min-h-[120px]" placeholder="Full description of work performed..." /></div>
            <div className="space-y-2"><Label>AME License No.</Label><Input placeholder="AME-12345" /></div>
            <div className="space-y-2"><Label>AMO Number</Label><Input placeholder="AMO-678" /></div>
            <div className="space-y-2"><Label>Reference / PO No.</Label><Input placeholder="REF-001" /></div>
            <div className="space-y-2"><Label>Certification Date</Label><Input type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} /></div>
          </div>
          <DialogFooter><Button onClick={() => { setIsAddLogOpen(false); toast({ title: 'Maintenance Log Added' }); }}>Certify Entry</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
