'use client';

import { use, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil } from 'lucide-react';
import type { Aircraft } from '../page';
import { ViewAssetDetails } from './view-asset-details';
import { EditAircraftForm } from './edit-asset-form';
import { usePermissions } from '@/hooks/use-permissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AircraftDocuments } from './aircraft-documents';
import { AircraftComponents } from './aircraft-components';
import { AircraftSnags } from './aircraft-snags';

interface AircraftDetailPageProps {
    params: { id: string };
}

function AircraftDetailPageContent({ params }: AircraftDetailPageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const aircraftId = resolvedParams.id;
    const [isEditing, setIsEditing] = useState(false);
    const { hasPermission } = usePermissions();
    const canEdit = hasPermission('assets-edit');

    const aircraftDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
        [firestore, tenantId, aircraftId]
    );

    const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftDocRef);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-1/4" />
                    <Skeleton className="h-10 w-24" />
                </div>
                <Skeleton className="h-[200px] w-full" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    if (error) {
        return <div className="text-destructive">Error: {error.message}</div>;
    }

    if (!aircraft) {
        return (
            <div className="text-center py-10">
                <p className="text-muted-foreground">Aircraft not found.</p>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
                    <p className="text-muted-foreground">{aircraft.model}</p>
                </div>
                {canEdit && (
                    <Button onClick={() => setIsEditing(!isEditing)}>
                        <Pencil className="mr-2" />
                        {isEditing ? 'Cancel' : 'Edit Aircraft'}
                    </Button>
                )}
            </div>

            {isEditing ? (
                <EditAircraftForm aircraft={aircraft} onFormSubmit={() => setIsEditing(false)} />
            ) : (
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="documents">Documents</TabsTrigger>
                        <TabsTrigger value="components">Components</TabsTrigger>
                        <TabsTrigger value="snags">Snags</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview">
                        <ViewAssetDetails aircraft={aircraft} />
                    </TabsContent>
                    <TabsContent value="documents">
                        <AircraftDocuments aircraft={aircraft} tenantId={tenantId} />
                    </TabsContent>
                    <TabsContent value="components">
                        <AircraftComponents aircraftId={aircraft.id} tenantId={tenantId} />
                    </TabsContent>
                    <TabsContent value="snags">
                        <AircraftSnags aircraft={aircraft} tenantId={tenantId} />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    )
}

export default function AircraftDetailPage(props: AircraftDetailPageProps) {
  return (
    <Suspense fallback={<div>Loading page...</div>}>
      <AircraftDetailPageContent {...props} />
    </Suspense>
  )
}
