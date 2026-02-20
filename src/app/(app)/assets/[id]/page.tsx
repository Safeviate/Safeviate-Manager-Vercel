
'use client';

import React, { use, useState, Suspense } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import type { Aircraft } from '../page';
import { ViewAssetDetails } from '../view-asset-details';
import { EditAircraftForm } from '../edit-asset-form';
import { usePermissions } from '@/hooks/use-permissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AircraftDocuments } from './aircraft-documents';
import { AircraftComponents } from './aircraft-components';


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
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-10 w-24" />
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }
    
    if (error) {
        return <div className="text-destructive">Error: {error.message}</div>;
    }
    
    if (!aircraft) {
        return <div>Aircraft not found.</div>;
    }

    if (isEditing) {
        return <EditAircraftForm aircraft={aircraft} onCancel={() => setIsEditing(false)} />;
    }

    return (
        <div className='space-y-6'>
            <div className="flex justify-between items-center">
                 <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
                 {canEdit && (
                    <Button onClick={() => setIsEditing(true)}>
                        <Pencil className="mr-2" />
                        Edit Aircraft
                    </Button>
                 )}
            </div>
            
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="components">Components</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="snags">Snags</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="mt-6">
                    <ViewAssetDetails aircraft={aircraft} />
                </TabsContent>
                 <TabsContent value="components" className="mt-6">
                    <AircraftComponents aircraftId={aircraft.id} tenantId={tenantId} />
                </TabsContent>
                <TabsContent value="documents" className="mt-6">
                    <AircraftDocuments aircraft={aircraft} tenantId={tenantId} />
                </TabsContent>
                 <TabsContent value="snags" className="mt-6">
                    <p className="text-muted-foreground">Maintenance snags and logs will be displayed here.</p>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function AircraftDetailPage(props: AircraftDetailPageProps) {
    return (
        <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <AircraftDetailPageContent {...props} />
        </Suspense>
    )
}
