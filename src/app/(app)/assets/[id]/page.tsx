'use client';

import { useState, useMemo, use } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ViewAircraftDetails } from './view-asset-details';
import { EditAircraftForm } from '../edit-asset-form';
import { AircraftDocuments } from './aircraft-documents';
import { AircraftComponents } from './aircraft-components';
import { AircraftSnags } from './aircraft-snags';
import { usePermissions } from '@/hooks/use-permissions';
import { Card } from '@/components/ui/card';

import type { Aircraft } from '../page';


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
                <Skeleton className="h-10 w-1/4" />
                <div className="space-y-6">
                    <Skeleton className="h-64 w-full" />
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
    
    if (isEditing) {
        return <EditAircraftForm aircraft={aircraft} onCancel={() => setIsEditing(false)} />;
    }

    return (
        <div className='space-y-6'>
             <div className="flex justify-end">
                {canEdit && <Button onClick={() => setIsEditing(true)}><Pencil className='mr-2' />Edit Aircraft</Button>}
            </div>
             <Tabs defaultValue="overview" className="w-full">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="components">Components</TabsTrigger>
                    <TabsTrigger value="snags">Snags</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                    <ViewAircraftDetails aircraft={aircraft} />
                </TabsContent>
                 <TabsContent value="documents">
                    <AircraftDocuments aircraft={aircraft} />
                </TabsContent>
                <TabsContent value="components">
                    <AircraftComponents aircraft={aircraft} />
                </TabsContent>
                 <TabsContent value="snags">
                    <AircraftSnags aircraft={aircraft} />
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default function AircraftDetailPage(props: AircraftDetailPageProps) {
    return <AircraftDetailPageContent {...props} />
}
