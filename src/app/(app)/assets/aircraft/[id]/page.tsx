'use client';

import { use, useMemo, useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, PlusCircle, Pencil, Wrench, FileText, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { AircraftForm } from '../aircraft-form';
import { ComponentForm } from '../component-form';
import { DocumentUploader } from '@/components/document-uploader';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { usePermissions } from '@/hooks/use-permissions';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isComponentFormOpen, setIsComponentFormOpen] = useState(false);

  const canEdit = hasPermission('assets-edit');

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components')) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);

  const handleAddDocument = (docDetails: any) => {
    if (!aircraft) return;
    const currentDocs = aircraft.documents || [];
    const updatedDocs = [...currentDocs, docDetails];
    updateDocumentNonBlocking(aircraftRef!, { documents: updatedDocs });
    toast({ title: 'Document Added', description: `"${docDetails.name}" has been attached to the aircraft.` });
  };

  const handleRemoveComponent = (componentId: string) => {
    if (!firestore) return;
    const compRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId, 'components', componentId);
    deleteDocumentNonBlocking(compRef);
    toast({ title: 'Component Removed' });
  };

  if (isLoadingAircraft || isLoadingComponents) {
    return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  }

  if (!aircraft) {
    return <div className="p-8 text-center"><p>Aircraft not found.</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button asChild variant="outline" size="sm">
          <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link>
        </Button>
        <div className="flex gap-2">
          {canEdit && (
            <>
              <Button size="sm" variant="outline" onClick={() => setIsEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit Aircraft
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsComponentFormOpen(true)}>
                <Wrench className="mr-2 h-4 w-4" /> Add Component
              </Button>
              <DocumentUploader 
                onDocumentUploaded={handleAddDocument}
                trigger={(open) => (
                  <Button size="sm" variant="outline" onClick={() => open()}>
                    <FileText className="mr-2 h-4 w-4" /> Add Document
                  </Button>
                )}
              />
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-3xl font-bold">{aircraft.tailNumber}</CardTitle>
            <CardDescription>{aircraft.make} {aircraft.model} • {aircraft.type}</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-muted-foreground uppercase">Current Hobbs</p>
            <p className="text-2xl font-mono font-bold text-primary">{aircraft.currentHobbs?.toFixed(1) || '0.0'}</p>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview"><LayoutDashboard className="mr-2 h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="components"><Wrench className="mr-2 h-4 w-4" /> Components</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="mr-2 h-4 w-4" /> Documents</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">ENGINE HOURS</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-mono font-bold">{aircraft.engineHours?.toFixed(1) || '0.0'}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">NEXT 50H INSPECTION</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-mono font-bold">{aircraft.tachoAtNext50Inspection?.toFixed(1) || 'N/A'}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">NEXT 100H INSPECTION</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-mono font-bold">{aircraft.tachoAtNext100Inspection?.toFixed(1) || 'N/A'}</p></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="components">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Install Date</TableHead>
                    <TableHead>TSN (Hours)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components?.map((comp) => (
                    <TableRow key={comp.id}>
                      <TableCell className="font-medium">{comp.name}<br/><span className="text-xs text-muted-foreground">{comp.manufacturer}</span></TableCell>
                      <TableCell className="font-mono">{comp.serialNumber}</TableCell>
                      <TableCell>{format(new Date(comp.installDate), 'PPP')}</TableCell>
                      <TableCell className="font-mono">{comp.tsn.toFixed(1)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleRemoveComponent(comp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!components || components.length === 0) && (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No components tracked.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
            {aircraft.documents?.map((doc, idx) => (
              <Card key={idx} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base">{doc.name}</CardTitle>
                  <CardDescription>Uploaded on {format(new Date(doc.uploadDate), 'PPP')}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <Badge variant="outline">{doc.expirationDate ? `Expires: ${format(new Date(doc.expirationDate), 'PPP')}` : 'No Expiry'}</Badge>
                </CardContent>
                <CardContent className="pt-0 flex justify-end gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">View</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
            {(!aircraft.documents || aircraft.documents.length === 0) && (
              <div className="col-span-full py-12 border-2 border-dashed rounded-lg text-center text-muted-foreground">
                No documents uploaded.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {isEditOpen && (
        <AircraftForm 
          isOpen={isEditOpen} 
          onOpenChange={setIsEditOpen} 
          tenantId={tenantId} 
          existingAircraft={aircraft} 
        />
      )}

      {isComponentFormOpen && (
        <ComponentForm 
          isOpen={isComponentFormOpen} 
          onOpenChange={setIsComponentFormOpen} 
          tenantId={tenantId} 
          aircraftId={aircraftId} 
        />
      )}
    </div>
  );
}
