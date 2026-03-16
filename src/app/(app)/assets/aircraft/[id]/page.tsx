'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Clock, FileText, Settings, Wrench, PlusCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DocumentUploader } from '@/components/document-uploader';
import { AddMaintenanceLogDialog } from './add-maintenance-log-dialog';
import { AddComponentDialog } from './add-component-dialog';
import type { Aircraft, MaintenanceLog } from '@/types/aircraft';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
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

  const { data: aircraft, isLoading: loadingAc } = useDoc<Aircraft>(aircraftRef);
  const { data: logs, isLoading: loadingLogs } = useCollection<MaintenanceLog>(logsQuery);

  const handleDocUploaded = (docDetails: any) => {
    if (!aircraft) return;
    const updatedDocs = [...(aircraft.documents || []), docDetails];
    updateDocumentNonBlocking(aircraftRef!, { documents: updatedDocs });
  };

  const handleDocDelete = (docName: string) => {
    if (!aircraft) return;
    const updatedDocs = aircraft.documents?.filter(d => d.name !== docName) || [];
    updateDocumentNonBlocking(aircraftRef!, { documents: updatedDocs });
  };

  if (loadingAc || loadingLogs) {
    return <div className="max-w-[1200px] mx-auto w-full p-8"><Skeleton className="h-[600px] w-full" /></div>;
  }

  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden px-1">
      <div className="flex justify-between items-center shrink-0">
        <Button asChild variant="ghost" size="sm">
          <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link>
        </Button>
        <Badge variant="outline" className="font-mono text-lg py-1 px-4 border-primary/20 text-primary">
          {aircraft.tailNumber}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <Card className="shadow-none border">
          <CardHeader className="py-4">
            <CardTitle className="text-xs uppercase text-muted-foreground flex items-center gap-2">
              <Clock className="h-3 w-3" /> Hobbs Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-black font-mono">{(aircraft.currentHobbs || 0).toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-none border">
          <CardHeader className="py-4">
            <CardTitle className="text-xs uppercase text-muted-foreground flex items-center gap-2">
              <Clock className="h-3 w-3" /> Tacho Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-black font-mono">{(aircraft.currentTacho || 0).toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-none border border-primary/20 bg-primary/5">
          <CardHeader className="py-4">
            <CardTitle className="text-xs uppercase text-primary font-bold flex items-center gap-2">
              <Wrench className="h-3 w-3" /> Next 50h Due
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-black font-mono">{(aircraft.tachoAtNext50Inspection || 0).toFixed(1)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
        <Tabs defaultValue="maintenance" className="flex-1 flex flex-col">
          <div className="shrink-0 border-b bg-muted/10 px-6 pt-4">
            <TabsList className="bg-transparent h-auto p-0 gap-2 mb-2 border-b-0 justify-start w-full flex">
              <TabsTrigger value="maintenance" className="rounded-full px-6 py-1.5 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-xs">Maintenance Logs</TabsTrigger>
              <TabsTrigger value="documents" className="rounded-full px-6 py-1.5 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-xs">Technical Documents</TabsTrigger>
              <TabsTrigger value="components" className="rounded-full px-6 py-1.5 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-xs">Component Tracker</TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="flex-1 p-0 overflow-hidden">
            <TabsContent value="maintenance" className="m-0 h-full flex flex-col">
              <div className="p-4 border-b bg-muted/5 flex justify-between items-center shrink-0">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Historical Maintenance</h3>
                <AddMaintenanceLogDialog tenantId={tenantId} aircraftId={aircraftId} />
              </div>
              <ScrollArea className="flex-1 custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase">Date</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Type</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Reference</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">AME/AMO</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs?.map(log => (
                      <TableRow key={log.id} className="text-xs">
                        <TableCell className="whitespace-nowrap font-medium">{format(new Date(log.date), 'dd MMM yy')}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px] py-0">{log.maintenanceType}</Badge></TableCell>
                        <TableCell className="font-mono text-muted-foreground">{log.reference || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{log.ameNo || log.amoNo || 'N/A'}</TableCell>
                        <TableCell className="max-w-[300px] truncate">{log.details}</TableCell>
                      </TableRow>
                    ))}
                    {(!logs || logs.length === 0) && (
                      <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">No maintenance history recorded.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="documents" className="m-0 h-full flex flex-col">
              <div className="p-4 border-b bg-muted/5 flex justify-between items-center shrink-0">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Compliance Files</h3>
                <DocumentUploader
                  onDocumentUploaded={handleDocUploaded}
                  trigger={(open) => <Button size="sm" variant="outline" onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>}
                />
              </div>
              <ScrollArea className="flex-1 custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase">Document Name</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Uploaded</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Expiry</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aircraft.documents?.map(doc => (
                      <TableRow key={doc.name} className="text-xs">
                        <TableCell className="font-bold">{doc.name}</TableCell>
                        <TableCell className="text-muted-foreground">{format(new Date(doc.uploadDate), 'dd MMM yy')}</TableCell>
                        <TableCell className="text-muted-foreground">{doc.expirationDate ? format(new Date(doc.expirationDate), 'dd MMM yy') : '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDocDelete(doc.name)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!aircraft.documents || aircraft.documents.length === 0) && (
                      <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">No technical documents uploaded.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="components" className="m-0 h-full flex flex-col">
              <div className="p-4 border-b bg-muted/5 flex justify-between items-center shrink-0">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Lifed Components</h3>
                <AddComponentDialog tenantId={tenantId} aircraftId={aircraftId} />
              </div>
              <ScrollArea className="flex-1 custom-scrollbar">
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aircraft.components?.map(comp => (
                    <Card key={comp.id} className="bg-muted/10 border shadow-none">
                      <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-black text-primary">{comp.name}</CardTitle>
                        <Badge variant="outline" className="text-[9px] font-mono">{comp.serialNumber}</Badge>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="bg-background border rounded p-2">
                            <p className="text-[9px] uppercase font-bold text-muted-foreground">TSN</p>
                            <p className="font-mono font-bold text-sm">{(comp.tsn || 0).toFixed(1)}</p>
                          </div>
                          <div className="bg-background border rounded p-2">
                            <p className="text-[9px] uppercase font-bold text-muted-foreground">Life Limit</p>
                            <p className="font-mono font-bold text-sm">{(comp.maxHours || 0).toFixed(1)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!aircraft.components || aircraft.components.length === 0) && (
                    <div className="col-span-full h-48 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground italic">
                      No tracked components defined.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}