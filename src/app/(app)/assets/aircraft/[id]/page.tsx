
'use client';

import { use, useMemo, useState } from 'react';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Pencil, 
  PlusCircle, 
  Trash2, 
  Eye, 
  CalendarIcon, 
  Wrench, 
  FileText, 
  History,
  Upload,
  ChevronLeft
} from 'lucide-react';
import Link from 'next/link';
import { format, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DocumentUploader } from '@/components/document-uploader';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';
import { AircraftForm } from '../aircraft-form';
import { ComponentForm } from './component-form';
import Image from 'next/image';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const [isEditAircraftOpen, setIsEditAircraftOpen] = useState(false);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);
  const [viewingDocument, setViewingDocument] = useState<{ name: string; url: string } | null>(null);

  // --- Data Fetching ---
  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components')) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);

  const expirySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  // --- Logic ---
  const getStatusColor = (expirationDate: string | null | undefined): string | null => {
    if (!expirationDate || !expirySettings) return null;

    const today = new Date();
    const expiry = new Date(expirationDate);
    const daysUntilExpiry = differenceInDays(expiry, today);

    if (daysUntilExpiry < 0) {
      return expirySettings.expiredColor || '#ef4444'; 
    }

    const sortedPeriods = [...(expirySettings.warningPeriods || [])].sort((a, b) => a.period - b.period);
    for (const warning of sortedPeriods) {
      if (daysUntilExpiry <= warning.period) {
        return warning.color;
      }
    }

    return expirySettings.defaultColor || null; 
  };

  const handleDocumentDelete = (docNameToDelete: string) => {
    if (!aircraft) return;
    const updatedDocs = (aircraft.documents || []).filter(d => d.name !== docNameToDelete);
    updateDocumentNonBlocking(aircraftRef!, { documents: updatedDocs });
    toast({ title: 'Document Removed' });
  };

  const onDocumentUploaded = (docDetails: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => {
    if (!aircraft) return;
    const currentDocs = aircraft.documents || [];
    const updatedDocs = [...currentDocs, docDetails];
    updateDocumentNonBlocking(aircraftRef!, { documents: updatedDocs });
  };

  const handleExpirationDateChange = (docName: string, date: Date | undefined) => {
    if (!aircraft) return;
    const updatedDocs = (aircraft.documents || []).map(d => 
      d.name === docName ? { ...d, expirationDate: date ? date.toISOString() : null } : d
    );
    updateDocumentNonBlocking(aircraftRef!, { documents: updatedDocs });
  };

  if (isLoadingAircraft) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!aircraft) return <div>Aircraft not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="-ml-2 h-8 w-8">
              <Link href="/assets/aircraft"><ChevronLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
          </div>
          <p className="text-muted-foreground ml-10">{aircraft.make} {aircraft.model} • {aircraft.type}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsEditAircraftOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit Aircraft
          </Button>
        </div>
      </div>

      {/* Overview Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold">Current Hobbs</CardDescription>
            <CardTitle className="text-2xl font-mono">{aircraft.currentHobbs?.toFixed(1) || '0.0'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold">Current Tacho</CardDescription>
            <CardTitle className="text-2xl font-mono">{aircraft.currentTacho?.toFixed(1) || '0.0'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold">Next 50hr Due</CardDescription>
            <div className="flex justify-between items-baseline">
              <CardTitle className="text-2xl font-mono">{aircraft.tachoAtNext50Inspection?.toFixed(1) || 'N/A'}</CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {((aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0)).toFixed(1)} hrs rem.
              </Badge>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold">Next 100hr Due</CardDescription>
            <div className="flex justify-between items-baseline">
              <CardTitle className="text-2xl font-mono">{aircraft.tachoAtNext100Inspection?.toFixed(1) || 'N/A'}</CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {((aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0)).toFixed(1)} hrs rem.
              </Badge>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="components" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
          <TabsTrigger value="components" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2">
            <Wrench className="mr-2 h-4 w-4" /> Tracked Components
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2">
            <FileText className="mr-2 h-4 w-4" /> Documents
          </TabsTrigger>
          <TabsTrigger value="logs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2">
            <History className="mr-2 h-4 w-4" /> Maintenance Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="pt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Aircraft Components</CardTitle>
                <CardDescription>Track life-limited parts and maintenance intervals.</CardDescription>
              </div>
              <Button onClick={() => { setEditingComponent(null); setIsAddComponentOpen(true); }} variant="outline" size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Component
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Install Date</TableHead>
                    <TableHead className="text-right">TSN</TableHead>
                    <TableHead className="text-right">TSO</TableHead>
                    <TableHead className="text-right">Total Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingComponents ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8">Loading components...</TableCell></TableRow>
                  ) : components && components.length > 0 ? (
                    components.map(comp => (
                      <TableRow key={comp.id}>
                        <TableCell className="font-medium">{comp.name}</TableCell>
                        <TableCell>{comp.manufacturer || 'N/A'}</TableCell>
                        <TableCell>{comp.serialNumber || 'N/A'}</TableCell>
                        <TableCell>{comp.installDate ? format(new Date(comp.installDate), 'PP') : 'N/A'}</TableCell>
                        <TableCell className="text-right font-mono">{comp.tsn?.toFixed(1) || '0.0'}</TableCell>
                        <TableCell className="text-right font-mono">{comp.tso?.toFixed(1) || '0.0'}</TableCell>
                        <TableCell className="text-right font-mono">{comp.totalTime?.toFixed(1) || '0.0'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingComponent(comp); setIsAddComponentOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDocumentNonBlocking(doc(firestore!, 'tenants', tenantId, 'aircrafts', aircraftId, 'components', comp.id))}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No components tracked yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="pt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Aircraft Documents</CardTitle>
                <CardDescription>Certificates of Airworthiness, Registration, and Insurance.</CardDescription>
              </div>
              <DocumentUploader 
                onDocumentUploaded={onDocumentUploaded}
                trigger={(open) => (
                  <Button variant="outline" size="sm" onClick={() => open()}>
                    <Upload className="mr-2 h-4 w-4" /> Add Document
                  </Button>
                )}
              />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead className="text-center">Set Expiry</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(aircraft.documents || []).length > 0 ? (
                    (aircraft.documents || []).map(doc => {
                      const statusColor = getStatusColor(doc.expirationDate);
                      return (
                        <TableRow key={doc.name}>
                          <TableCell className="font-medium">{doc.name}</TableCell>
                          <TableCell 
                            className="font-semibold transition-colors" 
                            style={{ color: statusColor || 'inherit' }}
                          >
                            {doc.expirationDate ? format(new Date(doc.expirationDate), 'MMM d, yyyy') : 'N/A'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8">
                                  <CalendarIcon className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <CustomCalendar 
                                  selectedDate={doc.expirationDate ? new Date(doc.expirationDate) : undefined}
                                  onDateSelect={(date) => handleExpirationDateChange(doc.name, date)}
                                />
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => setViewingDocument({ name: doc.name, url: doc.url })}>
                                <Eye className="mr-2 h-4 w-4" /> View
                              </Button>
                              <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDocumentDelete(doc.name)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No documents uploaded.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Logs</CardTitle>
              <CardDescription>History of all maintenance work performed on this aircraft.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
              Maintenance logs feature is coming soon.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AircraftForm
        isOpen={isEditAircraftOpen}
        setIsOpen={setIsEditAircraftOpen}
        existingAircraft={aircraft}
        tenantId={tenantId}
      />

      <ComponentForm
        isOpen={isAddComponentOpen}
        setIsOpen={setIsAddComponentOpen}
        aircraftId={aircraftId}
        tenantId={tenantId}
        existingComponent={editingComponent || undefined}
      />

      <Dialog open={!!viewingDocument} onOpenChange={(open) => !open && setViewingDocument(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{viewingDocument?.name}</DialogTitle>
          </DialogHeader>
          {viewingDocument && (
            <div className="relative h-[70vh] w-full bg-muted rounded-md overflow-hidden">
              <Image 
                src={viewingDocument.url} 
                alt={viewingDocument.name} 
                fill 
                className="object-contain"
              />
            </div>
          )}
          <div className="flex justify-end">
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
