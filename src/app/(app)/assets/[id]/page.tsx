
'use client';

import { use, useState, Suspense } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Aircraft } from '../page';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ViewAircraftDetails } from './view-asset-details';
import { EditAircraftForm } from '../edit-asset-form';
import { AircraftDocuments } from './aircraft-documents';
import { AircraftComponents } from './aircraft-components';
import { AircraftSnags } from './aircraft-snags';
import { usePermissions } from '@/hooks/use-permissions';

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

    const aircraftRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
        [firestore, tenantId, aircraftId]
    );

    const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftRef);

    if (isLoading) {
        return <Skeleton className="h-96 w-full" />;
    }

    if (error) {
        return <p className="text-destructive">Error: {error.message}</p>;
    }

    if (!aircraft) {
        return <p>Aircraft not found.</p>;
    }
    
    if (isEditing) {
        return <EditAircraftForm aircraft={aircraft} onCancel={() => setIsEditing(false)} />;
    }

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
                    <p className="text-muted-foreground">{aircraft.model}</p>
                </div>
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
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="components">Components</TabsTrigger>
                    <TabsTrigger value="snags">Snags</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                    <ViewAircraftDetails aircraft={aircraft} />
                </TabsContent>
                <TabsContent value="documents">
                    <AircraftDocuments aircraft={aircraft} tenantId={tenantId} />
                </TabsContent>
                <TabsContent value="components">
                   <AircraftComponents aircraftId={aircraft.id} tenantId={tenantId} />
                </TabsContent>
                <TabsContent value="snags">
                    <AircraftSnags aircraftId={aircraft.id} tenantId={tenantId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}


export default function AircraftDetailPage(props: AircraftDetailPageProps) {
    return (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <AircraftDetailPageContent {...props} />
        </Suspense>
    )
}
