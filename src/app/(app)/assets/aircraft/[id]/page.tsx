
'use client';

import { use, useMemo, useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Pencil, PlusCircle, FileText, Settings, History, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { AircraftForm } from '../aircraft-form';
import { ComponentForm } from './component-form';
import { ComponentsTable } from './components-table';
import { DocumentUploader } from '@/components/document-uploader';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const DetailItem = ({ label, value }: { label: string; value: string | number | undefined }) => (
  <div>
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <p className="text-lg font-semibold">{value || 'N/A'}</p>
  </div>
);

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const canEdit = hasPermission('assets-edit');

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`, aircraftId, 'components'), orderBy('name')) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);

  const handleDocumentUploaded = (docDetails: any) => {
    if (!firestore || !aircraft) return;
    const currentDocs = aircraft.documents || [];
    const updatedDocs = [...currentDocs, docDetails];
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId);
    updateDocumentNonBlocking(aircraftRef, { documents: updatedDocs });
    toast({ title: 'Document Added', description: `"${docDetails.name}" has been saved.` });
  };

  if (isLoadingAircraft) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!aircraft) {
    return <div className="p-8 text-center">Aircraft not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button asChild variant="outline">
          <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link>
        </Button>
        <div className="flex gap-2">
          {canEdit && (
            <>
              <AircraftForm
                tenantId={tenantId}
                existingAircraft={aircraft}
                trigger={<Button variant="outline"><Pencil className="mr-2 h-4 w-4" /> Edit Aircraft</Button>}
              />
              <ComponentForm
                tenantId={tenantId}
                aircraftId={aircraftId}
                trigger={<Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Component</Button>}
              />
              <DocumentUploader
                onDocumentUploaded={handleDocumentUploaded}
                trigger={(open) => (
                  <Button variant="outline" onClick={() => open()}>
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <DetailItem label="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1)} />
            <DetailItem label="Current Tacho" value={aircraft.currentTacho?.toFixed(1)} />
            <DetailItem label="Total Airframe Time" value={aircraft.frameHours?.toFixed(1)} />
            <DetailItem label="Engine Time" value={aircraft.engineHours?.toFixed(1)} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview"><Settings className="mr-2 h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="components"><ClipboardList className="mr-2 h-4 w-4" /> Components</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="mr-2 h-4 w-4" /> Documents</TabsTrigger>
          <TabsTrigger value="maintenance"><History className="mr-2 h-4 w-4" /> Maintenance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Meter History</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-semibold border-b pb-2">Hobbs</h4>
                  <div className="flex justify-between"><span>Initial:</span><span className="font-mono">{aircraft.initialHobbs?.toFixed(1)}</span></div>
                  <div className="flex justify-between font-bold"><span>Current:</span><span className="font-mono">{aircraft.currentHobbs?.toFixed(1)}</span></div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold border-b pb-2">Tachometer</h4>
                  <div className="flex justify-between"><span>Initial:</span><span className="font-mono">{aircraft.initialTacho?.toFixed(1)}</span></div>
                  <div className="flex justify-between font-bold"><span>Current:</span><span className="font-mono">{aircraft.currentTacho?.toFixed(1)}</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components">
          <Card>
            <CardHeader>
              <CardTitle>Tracked Components</CardTitle>
              <CardDescription>Major components and life-limited parts.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingComponents ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <ComponentsTable 
                  data={components || []} 
                  tenantId={tenantId} 
                  aircraftId={aircraftId} 
                  canManage={canEdit} 
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader><CardTitle>Aircraft Documentation</CardTitle></CardHeader>
            <CardContent>
              {aircraft.documents && aircraft.documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {aircraft.documents.map((doc, idx) => (
                    <Card key={idx} className="p-4 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">Uploaded {new Date(doc.uploadDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">View</a>
                      </Button>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center py-12 text-muted-foreground">No documents uploaded for this aircraft.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader><CardTitle>Maintenance Logs</CardTitle></CardHeader>
            <CardContent>
              <p className="text-center py-12 text-muted-foreground">Maintenance logging is under development.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
