'use client';

import { use, useState, Suspense } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import type { Aircraft } from '../page';
import { ViewAircraftDetails } from '../view-asset-details';
import { EditAircraftForm } from '../edit-asset-form';
import { usePermissions } from '@/hooks/use-permissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AircraftDocuments } from './aircraft-documents';
import { AircraftComponents } from './aircraft-components';
import { AircraftMaintenance } from './aircraft-maintenance';

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
        return <Skeleton className="h-[500px] w-full" />;
    }

    if (error) {
        return <p className="text-destructive">Error loading aircraft: {error.message}</p>;
    }

    if (!aircraft) {
        return <p>Aircraft not found.</p>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                {canEdit && !isEditing && (
                    <Button onClick={() => setIsEditing(true)}>
                        <Pencil className='mr-2' />
                        Edit Aircraft
                    </Button>
                )}
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="components">Components</TabsTrigger>
                    <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                    {isEditing ? (
                        <EditAircraftForm
                            aircraft={aircraft}
                            tenantId={tenantId}
                            onCancel={() => setIsEditing(false)}
                        />
                    ) : (
                        <ViewAircraftDetails aircraft={aircraft} />
                    )}
                </TabsContent>
                <TabsContent value="documents">
                    <AircraftDocuments aircraftId={aircraft.id} tenantId={tenantId} />
                </TabsContent>
                <TabsContent value="components">
                    <AircraftComponents aircraftId={aircraft.id} tenantId={tenantId} />
                </TabsContent>
                <TabsContent value="maintenance">
                    <AircraftMaintenance aircraftId={aircraft.id} tenantId={tenantId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function AircraftDetailPage(props: AircraftDetailPageProps) {
    return (
        <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
            <AircraftDetailPageContent {...props} />
        </Suspense>
    )
}
