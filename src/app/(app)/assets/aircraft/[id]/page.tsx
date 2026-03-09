'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, Settings2, PlusCircle, Eye, FileText, Trash2, ZoomIn } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import { DocumentUploader } from '@/components/document-uploader';
import { useToast } from '@/hooks/use-toast';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const StatCard = ({ label, value, subValue, colorClass }: { label: string; value: string | number; subValue?: string; colorClass?: string }) => (
  <Card className="flex-1 min-w-[140px] shadow-none border bg-muted/5">
    <CardContent className="p-3">
      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">{label}</p>
      <div className="flex items-baseline justify-between">
        <p className={cn("text-lg font-bold font-mono", colorClass)}>{value}</p>
        {subValue && <span className="text-[10px] text-muted-foreground font-medium ml-1">{subValue}</span>}
      </div>
    </CardContent>
  </Card>
);

import { cn } from '@/lib/utils';

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const maintenanceQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAc } = useDoc<Aircraft>(aircraftRef);
  const { data: maintenance, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(maintenanceQuery);
  const { data: components, isLoading: isLoadingComp } = useCollection<AircraftComponent>(componentsQuery);

  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };

  const onDocumentUploaded = (docDetails: any) => {
    if (!aircraft) return;
    const currentDocs = aircraft.documents || [];
    updateDocumentNonBlocking(aircraftRef!, {
      documents: [...currentDocs, docDetails]
    });
    toast({ title: "Document Saved" });
  };

  if (isLoadingAc || isLoadingLogs || isLoadingComp) {
    return <div className="p-8 space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  const tachoRemaining50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const tachoRemaining100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button asChild variant="ghost">
          <Link href="/assets/aircraft">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Clock className="mr-2 h-4 w-4" /> Edit Flight Hours</Button>
          <Button variant="outline" size="sm"><Settings2 className="mr-2 h-4 w-4" /> Edit Service</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatCard label="Initial Hobbs" value={aircraft.initialHobbs?.toFixed(1) || '0.0'} />
        <StatCard label="Initial Tacho" value={aircraft.initialTacho?.toFixed(1) || '0.0'} />
        <StatCard label="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1) || '0.0'} colorClass="text-primary" />
        <StatCard label="Current Tacho" value={aircraft.currentTacho?.toFixed(1) || '0.0'} colorClass="text-primary" />
        <StatCard 
          label="Next 50hr" 
          value={aircraft.tachoAtNext50Inspection?.toFixed(1) || '0.0'} 
          subValue={`${tachoRemaining50.toFixed(1)} left`} 
          colorClass="text-blue-600"
        />
        <StatCard 
          label="Next 100hr" 
          value={aircraft.tachoAtNext100Inspection?.toFixed(1) || '0.0'} 
          subValue={`${tachoRemaining100.toFixed(1)} left`} 
          colorClass="text-orange-600"
        />
      </div>

      <Tabs defaultValue="components" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0">
          <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Tracked Components</TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Maintenance History</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Technical Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="mt-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tracked Components</CardTitle>
                <CardDescription>Lifecycle monitoring for life-limited parts and instruments.</CardDescription>
              </div>
              <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Serial No.</TableHead>
                    <TableHead className="text-right">Installed Hours</TableHead>
                    <TableHead className="text-right">TSN</TableHead>
                    <TableHead className="text-right">TSO</TableHead>
                    <TableHead className="text-right">Max Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components && components.length > 0 ? (
                    components.map(comp => (
                      <TableRow key={comp.id}>
                        <TableCell className="font-medium">{comp.name}</TableCell>
                        <TableCell className="font-mono">{comp.serialNumber}</TableCell>
                        <TableCell className="text-right font-mono">{comp.installHours?.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono">{comp.tsn?.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono">{comp.tso?.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono">{comp.maxHours?.toFixed(1)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No tracked components defined.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Maintenance History</CardTitle>
                <CardDescription>Formal certification log of all work performed.</CardDescription>
              </div>
              <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Entry</Button>
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
                  {maintenance && maintenance.length > 0 ? (
                    maintenance.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">{format(new Date(log.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{log.maintenanceType}</TableCell>
                        <TableCell className="max-w-md truncate">{log.details}</TableCell>
                        <TableCell>{log.ameNo}</TableCell>
                        <TableCell>{log.amoNo}</TableCell>
                        <TableCell className="font-mono text-xs">{log.reference}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No maintenance logs found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Technical Documents</CardTitle>
                <CardDescription>Certificates, manuals, and compliance documentation.</CardDescription>
              </div>
              <DocumentUploader
                onDocumentUploaded={onDocumentUploaded}
                trigger={(open) => <Button size="sm" variant="outline" onClick={() => open()}><PlusCircle className="mr-2 h-4 w-4" /> Add Document</Button>}
              />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {aircraft.documents?.map((doc, idx) => (
                  <Card key={idx} className="flex flex-col">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-center aspect-square bg-muted rounded-md relative group overflow-hidden">
                        <Image src={doc.url} alt={doc.name} fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button size="icon" variant="ghost" className="text-white" onClick={() => handleViewImage(doc.url)}><ZoomIn /></Button>
                        </div>
                      </div>
                      <CardTitle className="text-sm mt-3">{doc.name}</CardTitle>
                    </CardHeader>
                    <CardFooter className="p-4 pt-0 mt-auto">
                      <Button variant="default" size="sm" className="w-full" onClick={() => handleViewImage(doc.url)}>
                        <Eye className="mr-2 h-4 w-4" /> View
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
                {(!aircraft.documents || aircraft.documents.length === 0) && (
                  <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">No documents uploaded.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Document Viewer</DialogTitle></DialogHeader>
          {viewingImageUrl && (
            <div className="relative h-[70vh] w-full mt-4">
              <Image src={viewingImageUrl} alt="Document" fill className="object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
