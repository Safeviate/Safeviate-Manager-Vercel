
'use client';

import { use, useState, useMemo } from 'react';
import { doc, collection, query, where } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Pencil, 
  Settings2, 
  FileText, 
  Wrench, 
  Eye, 
  Clock, 
  Trash2, 
  PlusCircle, 
  FileUp, 
  Camera, 
  ZoomIn 
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DocumentUploader } from '@/components/document-uploader';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const aircraftId = resolvedParams.id;
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`) : null),
    [firestore, tenantId, aircraftId]
  );

  const maintenanceQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);
  const { data: maintenanceLogs, isLoading: isLoadingLogs } = useCollection<MaintenanceLog>(maintenanceQuery);

  const isLoading = isLoadingAircraft || isLoadingComponents || isLoadingLogs;

  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };

  const onDocumentUploaded = (docDetails: any) => {
    if (!aircraft) return;
    const currentDocs = aircraft.documents || [];
    const updatedDocs = [...currentDocs, docDetails];
    updateDocumentNonBlocking(aircraftRef!, { documents: updatedDocs });
    toast({ title: 'Document Saved', description: `"${docDetails.name}" has been added to technical records.` });
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!aircraft) return <div className="p-8 text-center">Aircraft not found.</div>;

  const tacho = aircraft.currentTacho || 0;
  const next50 = aircraft.tachoAtNext50Inspection || 0;
  const next100 = aircraft.tachoAtNext100Inspection || 0;

  const remaining50 = Math.max(0, next50 - tacho);
  const remaining100 = Math.max(0, next100 - tacho);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button asChild variant="outline" size="sm">
          <Link href="/assets/aircraft">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings2 className="mr-2 h-4 w-4" /> Edit Service
          </Button>
          <Button variant="outline" size="sm">
            <Pencil className="mr-2 h-4 w-4" /> Edit Flight Hours
          </Button>
        </div>
      </div>

      {/* Reordered Compact Status Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatusCard label="Initial Hobbs" value={aircraft.initialHobbs?.toFixed(1) || '0.0'} />
        <StatusCard label="Initial Tacho" value={aircraft.initialTacho?.toFixed(1) || '0.0'} />
        <StatusCard label="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1) || '0.0'} />
        <StatusCard label="Current Tacho" value={tacho.toFixed(1)} highlight />
        <StatusCard 
          label="Next 50hr" 
          value={next50.toFixed(1)} 
          subValue={`${remaining50.toFixed(1)} left`}
          variant="blue"
        />
        <StatusCard 
          label="Next 100hr" 
          value={next100.toFixed(1)} 
          subValue={`${remaining100.toFixed(1)} left`}
          variant="orange"
        />
      </div>

      <Tabs defaultValue="components" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0">
          <TabsTrigger value="components" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Tracked Components</TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Maintenance History</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-full px-6 py-2 border data-[state=active]:bg-header data-[state=active]:text-header-foreground">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Tracked Components</CardTitle>
              <CardDescription>Life-limited parts and component times.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Serial No.</TableHead>
                    <TableHead className="text-right">TSN</TableHead>
                    <TableHead className="text-right">TSO</TableHead>
                    <TableHead className="text-right">Max Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components?.map(comp => (
                    <TableRow key={comp.id}>
                      <TableCell className="font-medium">{comp.name}</TableCell>
                      <TableCell>{comp.serialNumber}</TableCell>
                      <TableCell className="text-right font-mono">{comp.tsn?.toFixed(1) || '0.0'}</TableCell>
                      <TableCell className="text-right font-mono">{comp.tso?.toFixed(1) || '0.0'}</TableCell>
                      <TableCell className="text-right font-mono">{comp.maxHours?.toFixed(1) || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance History</CardTitle>
              <CardDescription>Technical log entries and certifications.</CardDescription>
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
                  {maintenanceLogs?.sort((a, b) => b.date.localeCompare(a.date)).map(log => (
                    <TableRow key={log.id}>
                      <TableCell>{log.date ? format(new Date(log.date), 'dd MMM yyyy') : 'N/A'}</TableCell>
                      <TableCell>{log.maintenanceType}</TableCell>
                      <TableCell className="max-w-md truncate">{log.details}</TableCell>
                      <TableCell>{log.ameNo}</TableCell>
                      <TableCell>{log.amoNo}</TableCell>
                      <TableCell>{log.reference}</TableCell>
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
                <CardTitle>Technical Documents</CardTitle>
                <CardDescription>C of A, C of R, Insurance, and other certifications.</CardDescription>
              </div>
              <DocumentUploader
                onDocumentUploaded={onDocumentUploaded}
                trigger={(open) => (
                  <Button size="sm" onClick={() => open()}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Document
                  </Button>
                )}
              />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {aircraft.documents?.map((doc, idx) => (
                  <Card key={idx} className="flex flex-col h-full border rounded-lg shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex justify-center p-4 bg-muted rounded-md mb-2">
                        <FileText className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-sm mt-2 truncate">{doc.name}</CardTitle>
                    </CardHeader>
                    <CardFooter className="mt-auto pt-2">
                      <Button variant="default" size="sm" className="w-full" onClick={() => handleViewImage(doc.url)}>
                        <Eye className="mr-2 h-4 w-4" /> View
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Viewer</DialogTitle>
            <DialogDescription>Viewing aircraft technical record.</DialogDescription>
          </DialogHeader>
          {viewingImageUrl && (
            <div className="relative h-[70vh] w-full">
              <Image src={viewingImageUrl} alt="Document" fill className="object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusCard({ label, value, subValue, highlight, variant }: { 
  label: string; 
  value: string; 
  subValue?: string;
  highlight?: boolean;
  variant?: 'blue' | 'orange';
}) {
  const variantClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    default: 'bg-card border-border text-card-foreground'
  };

  return (
    <Card className={cn("p-3 shadow-none border", variant ? variantClasses[variant] : variantClasses.default, highlight && "border-primary ring-1 ring-primary")}>
      <p className="text-[10px] uppercase font-bold text-muted-foreground opacity-70">{label}</p>
      <div className="flex items-baseline justify-between mt-1">
        <p className="text-lg font-bold font-mono">{value}</p>
        {subValue && <p className="text-[10px] font-semibold">{subValue}</p>}
      </div>
    </Card>
  );
}
