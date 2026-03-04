'use client';

import { use, useMemo, useState } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { ArrowLeft, Plus, Eye, Calendar as CalendarIcon, FileText, Settings, History, Wrench } from 'lucide-react';
import Link from 'next/link';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { DocumentExpirySettings } from '../../../admin/document-dates/page';
import { AircraftForm } from '../aircraft-form';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const [isEditOpen, setIsEditingOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<{ name: string; url: string } | null>(null);

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

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);
  const { data: logs, isLoading: isLoadingLogs } = useCollection<any>(logsQuery);
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  const getStatusColor = (expirationDate: string | null | undefined): string | null => {
    if (!expirationDate || !expirySettings) return null;
    const today = new Date();
    const expiry = new Date(expirationDate);
    const daysRemaining = differenceInDays(expiry, today);

    if (daysRemaining < 0) return expirySettings.expiredColor || '#ef4444';

    const sortedPeriods = [...(expirySettings.warningPeriods || [])].sort((a, b) => a.period - b.period);
    for (const warning of sortedPeriods) {
      if (daysRemaining <= warning.period) return warning.color;
    }

    return expirySettings.defaultColor || null;
  };

  const handleUpdateExpiry = (docName: string, date: Date | undefined) => {
    if (!aircraft || !firestore) return;
    const updatedDocs = (aircraft.documents || []).map(d => 
      d.name === docName ? { ...d, expirationDate: date ? date.toISOString() : null } : d
    );
    updateDocumentNonBlocking(aircraftRef!, { documents: updatedDocs });
  };

  const next50 = aircraft ? (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0) : 0;
  const next100 = aircraft ? (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0) : 0;

  if (isLoadingAircraft) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
          <p className="text-muted-foreground">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
        </div>
        <AircraftForm 
          tenantId={tenantId} 
          existingAircraft={aircraft}
          trigger={<Button variant="outline"><Settings className="mr-2 h-4 w-4" /> Edit Aircraft</Button>}
        />
      </div>

      {/* Persistent Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Current Hobbs</CardDescription><CardTitle className="text-2xl font-mono">{(aircraft.currentHobbs || 0).toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Current Tacho</CardDescription><CardTitle className="text-2xl font-mono">{(aircraft.currentTacho || 0).toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 50hr Due</CardDescription><CardTitle className={cn("text-2xl font-mono", next50 < 5 ? "text-destructive" : "")}>{next50.toFixed(1)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Next 100hr Due</CardDescription><CardTitle className={cn("text-2xl font-mono", next100 < 10 ? "text-destructive" : "")}>{next100.toFixed(1)}</CardTitle></CardHeader></Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Airframe & Engine</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between"><span>Airframe Total Time</span><span className="font-mono">{(aircraft.frameHours || 0).toFixed(1)} hrs</span></div>
                <Separator />
                <div className="flex justify-between"><span>Engine Total Time</span><span className="font-mono">{(aircraft.engineHours || 0).toFixed(1)} hrs</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Meter Readings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between"><span>Initial Hobbs</span><span className="font-mono">{(aircraft.initialHobbs || 0).toFixed(1)}</span></div>
                <Separator />
                <div className="flex justify-between"><span>Initial Tacho</span><span className="font-mono">{(aircraft.initialTacho || 0).toFixed(1)}</span></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Aircraft Documents</CardTitle>
                <CardDescription>Regulatory compliance and certification files.</CardDescription>
              </div>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Document</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Expiration Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(aircraft.documents || []).map((doc) => (
                    <TableRow key={doc.name}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span style={{ color: getStatusColor(doc.expirationDate) || 'inherit' }} className="font-semibold">
                            {doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}
                          </span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6"><CalendarIcon className="h-3 w-3" /></Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <CustomCalendar 
                                selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined}
                                onDateSelect={(date) => handleUpdateExpiry(doc.name, date)}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => { setViewingDoc(doc); setIsViewerOpen(true); }}><Eye className="mr-2 h-4 w-4" /> View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tracked Components</CardTitle>
                <CardDescription>Life-limited components and service intervals.</CardDescription>
              </div>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Component</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Install Date</TableHead>
                    <TableHead>TSN</TableHead>
                    <TableHead>TSO</TableHead>
                    <TableHead className="text-right">Total Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components?.map((comp) => (
                    <TableRow key={comp.id}>
                      <TableCell className="font-medium">{comp.name}</TableCell>
                      <TableCell>{comp.manufacturer}</TableCell>
                      <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                      <TableCell>{comp.installDate ? format(new Date(comp.installDate), 'PP') : 'N/A'}</TableCell>
                      <TableCell className="font-mono">{(comp.tsn || 0).toFixed(1)}</TableCell>
                      <TableCell className="font-mono">{(comp.tso || 0).toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono">{(comp.totalTime || 0).toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                  {(!components || components.length === 0) && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No tracked components found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Maintenance Logs</CardTitle>
                <CardDescription>History of service, inspections, and repairs.</CardDescription>
              </div>
              <Button size="sm"><Wrench className="mr-2 h-4 w-4" /> Log Entry</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{format(new Date(log.date), 'PPP')}</TableCell>
                      <TableCell className="max-w-md truncate">{log.description}</TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="sm">View</Button></TableCell>
                    </TableRow>
                  ))}
                  {(!logs || logs.length === 0) && (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No maintenance logs found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader><DialogTitle>{viewingDoc?.name}</DialogTitle></DialogHeader>
          {viewingDoc?.url && <iframe src={viewingDoc.url} className="w-full h-full border rounded-md" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
