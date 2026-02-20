
'use client';

import { use, useState } from 'react';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';
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
        return (
            <div className="space-y-8">
                <Skeleton className="h-10 w-1/4" />
                <div className="space-y-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
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

    return (
        <div className='space-y-6'>
            {isEditing ? (
                 <EditAircraftForm
                    aircraft={aircraft}
                    tenantId={tenantId}
                    onCancel={() => setIsEditing(false)}
                />
            ) : (
                <>
                    <div className="flex justify-between items-center">
                        <div />
                        {canEdit && (
                            <Button onClick={() => setIsEditing(true)}>
                                <Pencil className='mr-2' />
                                Edit Aircraft
                            </Button>
                        )}
                    </div>

                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="documents">Documents</TabsTrigger>
                            <TabsTrigger value="components">Components</TabsTrigger>
                        </TabsList>
                        <TabsContent value="overview">
                           <ViewAircraftDetails aircraft={aircraft} />
                        </TabsContent>
                        <TabsContent value="documents">
                            <AircraftDocuments aircraftId={aircraftId} tenantId={tenantId} />
                        </TabsContent>
                         <TabsContent value="components">
                            <AircraftComponents aircraftId={aircraftId} tenantId={tenantId} />
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    );
}

export default function AircraftDetailPage(props: AircraftDetailPageProps) {
    return (
        <AircraftDetailPageContent {...props} />
    )
}
