
'use client';

import { use, useMemo, useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Pencil, PlusCircle, FileText, Gauge, Trash2, History, Tool, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { AircraftForm } from '../aircraft-form';
import { ComponentForm } from './component-form';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DocumentUploader } from '@/components/document-uploader';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
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

  const canEdit = hasPermission('assets-edit');

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  
  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`)) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);

  const [isEditAircraftOpen, setIsEditAircraftOpen] = useState(false);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);

  const handleDocumentUploaded = (docDetails: any) => {
    if (!aircraft) return;
    const currentDocs = aircraft.documents || [];
    updateDocumentNonBlocking(aircraftRef!, {
      documents: [...currentDocs, docDetails]
    });
    toast({ title: 'Document Added' });
  };

  const handleDeleteComponent = (componentId: string) => {
    if (!firestore) return;
    const componentRef = doc(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`, componentId);
    deleteDocumentNonBlocking(componentRef);
    toast({ title: 'Component Deleted' });
  };

  if (isLoadingAircraft || isLoadingComponents) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!aircraft) {
    return <div className="p-8 text-center">Aircraft not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/assets/aircraft">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Fleet
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <>
              <Button onClick={() => setIsEditAircraftOpen(true)} variant="outline">
                <Pencil className="mr-2 h-4 w-4" /> Edit Aircraft
              </Button>
              <Button onClick={() => setIsAddComponentOpen(true)} variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Component
              </Button>
              <DocumentUploader
                onDocumentUploaded={handleDocumentUploaded}
                trigger={(open) => (
                  <Button onClick={() => open()} variant="outline">
                    <FileText className="mr-2 h-4 w-4" /> Add Document
                  </Button>
                )}
              />
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl font-bold">{aircraft.tailNumber}</CardTitle>
              <CardDescription>{aircraft.make} {aircraft.model} • {aircraft.type}</CardDescription>
            </div>
            <Badge variant={((aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0)) < 10 ? 'destructive' : 'default'}>
              {((aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0)).toFixed(1)} hrs to 100hr
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 border rounded-lg bg-muted/20">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Current Hobbs</p>
            <p className="text-2xl font-mono font-bold">{aircraft.currentHobbs?.toFixed(1) || '0.0'}</p>
          </div>
          <div className="p-4 border rounded-lg bg-muted/20">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Current Tacho</p>
            <p className="text-2xl font-mono font-bold">{aircraft.currentTacho?.toFixed(1) || '0.0'}</p>
          </div>
          <div className="p-4 border rounded-lg bg-muted/20">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Next 50hr Due</p>
            <p className="text-2xl font-mono font-bold text-blue-600">{aircraft.tachoAtNext50Inspection?.toFixed(1) || 'N/A'}</p>
          </div>
          <div className="p-4 border rounded-lg bg-muted/20">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Next 100hr Due</p>
            <p className="text-2xl font-mono font-bold text-orange-600">{aircraft.tachoAtNext100Inspection?.toFixed(1) || 'N/A'}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="components" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="components">Tracked Components</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="logs">Maintenance Logs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="components" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Components</CardTitle>
              <CardDescription>Lifed and trackable aircraft components.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
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
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components && components.length > 0 ? (
                    components.map((comp) => (
                      <TableRow key={comp.id}>
                        <TableCell className="font-medium">{comp.name}</TableCell>
                        <TableCell>{comp.manufacturer}</TableCell>
                        <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                        <TableCell>{comp.installDate ? format(new Date(comp.installDate), 'PP') : 'N/A'}</TableCell>
                        <TableCell className="text-right font-mono">{comp.tsn?.toFixed(1) || '0.0'}</TableCell>
                        <TableCell className="text-right font-mono">{comp.tso?.toFixed(1) || '0.0'}</TableCell>
                        <TableCell className="text-right font-mono font-bold">{comp.totalTime?.toFixed(1) || '0.0'}</TableCell>
                        <TableCell className="text-right">
                          {canEdit && (
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => { setEditingComponent(comp); setIsAddComponentOpen(true); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteComponent(comp.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        No components tracked for this aircraft.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(aircraft.documents || []).map((doc, idx) => (
              <Card key={idx}>
                <CardHeader className="flex flex-row items-center gap-4">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-base">{doc.name}</CardTitle>
                    <CardDescription>Uploaded: {format(new Date(doc.uploadDate), 'PP')}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="secondary" className="w-full">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">View Document</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
            {(aircraft.documents || []).length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                No documents uploaded for this aircraft.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Aircraft Maintenance Logs</CardTitle>
              <CardDescription>History of maintenance actions and inspections.</CardDescription>
            </CardHeader>
            <CardContent className="h-48 flex items-center justify-center text-muted-foreground border-t">
              (Maintenance log history view is under construction)
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AircraftForm
        isOpen={isEditAircraftOpen}
        onClose={() => setIsEditAircraftOpen(false)}
        existingAircraft={aircraft}
        tenantId={tenantId}
      />

      <ComponentForm
        isOpen={isAddComponentOpen}
        onClose={() => { setIsAddComponentOpen(false); setEditingComponent(null); }}
        aircraftId={aircraftId}
        tenantId={tenantId}
        existingComponent={editingComponent}
      />
    </div>
  );
}
