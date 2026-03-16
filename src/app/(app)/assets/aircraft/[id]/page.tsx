'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, PenLine, FileUp, Trash2, ShieldCheck, History, Settings2, Component } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DocumentUploader } from '@/components/document-uploader';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';

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
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  
  const logsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAc } = useDoc<Aircraft>(aircraftRef);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  const [isLogFormOpen, setIsLogFormOpen] = useState(false);
  const [logType, setLogType] = useState('');
  const [logDetails, setLogDetails] = useState('');
  const [logDate, setLogDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [isComponentFormOpen, setIsComponentFormOpen] = useState(false);
  const [compName, setCompName] = useState('');
  const [compSerial, setCompSerial] = useState('');
  const [compInstallHours, setCompInstallHours] = useState('0');
  const [compMaxHours, setCompMaxHours] = useState('2000');

  const handleAddLog = async () => {
    if (!logType || !logDetails) return;
    if (!firestore) return;

    const logData: Omit<MaintenanceLog, 'id'> = {
      aircraftId,
      maintenanceType: logType,
      details: logDetails,
      date: new Date(logDate).toISOString(),
    };

    const logsCol = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    await addDocumentNonBlocking(logsCol, logData);
    
    toast({ title: 'Log Added' });
    setIsLogFormOpen(false);
    setLogType('');
    setLogDetails('');
  };

  const handleAddComponent = async () => {
    if (!compName) return;
    if (!firestore || !aircraft) return;

    const newComp: AircraftComponent = {
      id: uuidv4(),
      name: compName,
      serialNumber: compSerial,
      manufacturer: '',
      partNumber: '',
      installDate: new Date().toISOString(),
      installHours: parseFloat(compInstallHours) || 0,
      maxHours: parseFloat(compMaxHours) || 0,
      notes: '',
      tsn: 0,
      tso: 0,
      totalTime: 0,
    };

    const updatedComps = [...(aircraft.components || []), newComp];
    updateDocumentNonBlocking(aircraftRef!, { components: updatedComps });
    
    toast({ title: 'Component Added' });
    setIsComponentFormOpen(false);
    setCompName('');
    setCompSerial('');
  };

  const onDocumentUploaded = (docDetails: any) => {
    if (!aircraft) return;
    const updatedDocs = [...(aircraft.documents || []), docDetails];
    updateDocumentNonBlocking(aircraftRef!, { documents: updatedDocs });
    toast({ title: 'Document Uploaded' });
  };

  const uuidv4 = () => 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, () => (Math.random() * 16 | 0).toString(16));

  if (isLoadingAc) {
    return <div className="max-w-[1200px] mx-auto w-full p-8"><Skeleton className="h-full w-full" /></div>;
  }

  if (!aircraft) {
    return <div className="p-8 text-center">Aircraft not found.</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col h-full overflow-hidden gap-4">
      <div className="shrink-0 px-1">
        <Button asChild variant="ghost" className="mb-2">
          <Link href="/assets/aircraft">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet
          </Link>
        </Button>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <p className="text-muted-foreground">{aircraft.make} {aircraft.model}</p>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Current Hobbs</p>
              <p className="text-2xl font-mono font-black text-primary">{aircraft.currentHobbs?.toFixed(1)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Current Tacho</p>
              <p className="text-2xl font-mono font-black text-primary">{aircraft.currentTacho?.toFixed(1)}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="maintenance" className="flex-1 flex flex-col min-h-0">
        <div className="px-1 shrink-0">
          <TabsList className="bg-transparent h-auto p-0 gap-2 mb-4 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex">
            <TabsTrigger value="overview" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-xs shrink-0">Overview</TabsTrigger>
            <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-xs shrink-0">Maintenance Logs</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-xs shrink-0">Technical Documents</TabsTrigger>
            <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-xs shrink-0">Component Tracker</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden px-1">
          <TabsContent value="overview" className="m-0 h-full">
            <Card className="h-full shadow-none border overflow-hidden flex flex-col">
              <ScrollArea className="h-full custom-scrollbar">
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <section className="space-y-4">
                    <h3 className="font-bold uppercase text-xs text-primary flex items-center gap-2"><Settings2 className="h-4 w-4" /> Specifications</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between border-b pb-1 text-sm"><span>Manufacturer</span><span className="font-semibold">{aircraft.make}</span></div>
                      <div className="flex justify-between border-b pb-1 text-sm"><span>Model</span><span className="font-semibold">{aircraft.model}</span></div>
                      <div className="flex justify-between border-b pb-1 text-sm"><span>Type</span><span className="font-semibold">{aircraft.type}</span></div>
                    </div>
                  </section>
                  <section className="space-y-4">
                    <h3 className="font-bold uppercase text-xs text-primary flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Airworthiness</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between border-b pb-1 text-sm"><span>Total Frame Hours</span><span className="font-semibold">{aircraft.frameHours?.toFixed(1)}</span></div>
                      <div className="flex justify-between border-b pb-1 text-sm"><span>Next 50h Inspection</span><span className="font-semibold">{aircraft.tachoAtNext50Inspection?.toFixed(1)}</span></div>
                      <div className="flex justify-between border-b pb-1 text-sm"><span>Next 100h Inspection</span><span className="font-semibold">{aircraft.tachoAtNext100Inspection?.toFixed(1)}</span></div>
                    </div>
                  </section>
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="m-0 h-full">
            <Card className="h-full shadow-none border overflow-hidden flex flex-col">
              <CardHeader className="shrink-0 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  <CardTitle>Maintenance Logs</CardTitle>
                </div>
                <Dialog open={isLogFormOpen} onOpenChange={setIsLogFormOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><PlusCircle className="h-4 w-4 mr-2" /> Add Maintenance Log</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>New Log Entry</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2"><Label>Type</Label><Input value={logType} onChange={e => setLogType(e.target.value)} placeholder="e.g., 50-hour Inspection" /></div>
                      <div className="space-y-2"><Label>Date</Label><Input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Details</Label><Textarea value={logDetails} onChange={e => setLogDetails(e.target.value)} placeholder="Full maintenance narrative..." className="min-h-32" /></div>
                    </div>
                    <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={handleAddLog}>Save Log</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full custom-scrollbar">
                  <div className="p-6">
                    <Table>
                      <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Summary</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {logs?.map(log => (
                          <TableRow key={log.id}>
                            <TableCell className="whitespace-nowrap">{format(new Date(log.date), 'dd MMM yy')}</TableCell>
                            <TableCell className="font-bold">{log.maintenanceType}</TableCell>
                            <TableCell className="max-w-[400px] truncate">{log.details}</TableCell>
                          </TableRow>
                        ))}
                        {(!logs || logs.length === 0) && (
                          <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground italic">No logs recorded.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="m-0 h-full">
            <Card className="h-full shadow-none border overflow-hidden flex flex-col">
              <CardHeader className="shrink-0 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <FileUp className="h-5 w-5 text-primary" />
                  <CardTitle>Technical Documents</CardTitle>
                </div>
                <DocumentUploader
                  onDocumentUploaded={onDocumentUploaded}
                  trigger={(open) => <Button size="sm" onClick={() => open()}><PlusCircle className="h-4 w-4 mr-2" /> Add Document</Button>}
                />
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full custom-scrollbar">
                  <div className="p-6">
                    <Table>
                      <TableHeader><TableRow><TableHead>Document Name</TableHead><TableHead>Uploaded</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {aircraft.documents?.map(doc => (
                          <TableRow key={doc.url}>
                            <TableCell className="font-bold">{doc.name}</TableCell>
                            <TableCell>{format(new Date(doc.uploadDate), 'PPP')}</TableCell>
                            <TableCell className="text-right"><Button variant="outline" size="sm" asChild><Link href={doc.url} target="_blank">View</Link></Button></TableCell>
                          </TableRow>
                        ))}
                        {(!aircraft.documents || aircraft.documents.length === 0) && (
                          <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground italic">No technical documents uploaded.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="components" className="m-0 h-full">
            <Card className="h-full shadow-none border overflow-hidden flex flex-col">
              <CardHeader className="shrink-0 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <Component className="h-5 w-5 text-primary" />
                  <CardTitle>Component Tracker</CardTitle>
                </div>
                <Dialog open={isComponentFormOpen} onOpenChange={setIsComponentFormOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><PlusCircle className="h-4 w-4 mr-2" /> Add Component</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>New Component Tracking</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2"><Label>Component Name</Label><Input value={compName} onChange={e => setCompName(e.target.value)} placeholder="e.g., Engine No. 1" /></div>
                      <div className="space-y-2"><Label>Serial Number</Label><Input value={compSerial} onChange={e => setCompSerial(e.target.value)} placeholder="..." /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Install Hours</Label><Input type="number" value={compInstallHours} onChange={e => setCompInstallHours(e.target.value)} /></div>
                        <div className="space-y-2"><Label>Life Limit (h)</Label><Input type="number" value={compMaxHours} onChange={e => setCompMaxHours(e.target.value)} /></div>
                      </div>
                    </div>
                    <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={handleAddComponent}>Add to List</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full custom-scrollbar">
                  <div className="p-6">
                    <Table>
                      <TableHeader><TableRow><TableHead>Component</TableHead><TableHead>Serial</TableHead><TableHead className="text-right">Hours Used</TableHead><TableHead className="text-right">Life Limit</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {aircraft.components?.map(comp => (
                          <TableRow key={comp.id}>
                            <TableCell className="font-bold">{comp.name}</TableCell>
                            <TableCell className="text-xs font-mono">{comp.serialNumber}</TableCell>
                            <TableCell className="text-right font-mono">{comp.totalTime.toFixed(1)}h</TableCell>
                            <TableCell className="text-right font-mono">{comp.maxHours}h</TableCell>
                          </TableRow>
                        ))}
                        {(!aircraft.components || aircraft.components.length === 0) && (
                          <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">No tracked components defined.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
