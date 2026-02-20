'use client';

import { useState, useMemo, use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, collection } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Pencil } from 'lucide-react';
import Link from 'next/link';

import { usePermissions } from '@/hooks/use-permissions';

import { ViewAircraftDetails } from './view-asset-details';
import { EditAircraftForm } from '../edit-asset-form';
import { AircraftDocuments } from './aircraft-documents';
import { AircraftComponents } from './aircraft-components';
import { AircraftSnags } from './aircraft-snags';

import type { Aircraft } from '../page';

interface AircraftDetailPageProps {
    params: { id: string };
}

function AircraftDetailPageContent({ params }: AircraftDetailPageProps) {
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const aircraftId = params.id;
    const [isEditing, setIsEditing] = useState(false);
    const { hasPermission } = usePermissions();
    const canEdit = hasPermission('assets-edit');

    const aircraftDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
        [firestore, tenantId, aircraftId]
    );

    const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftDocRef);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Card>
                    <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                    <CardContent><Skeleton className="h-48 w-full" /></CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return <p className="text-destructive">Error: {error.message}</p>;
    }

    if (!aircraft) {
        return <p>Aircraft not found.</p>;
    }

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <Button asChild variant="outline">
                    <Link href="/assets">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Fleet
                    </Link>
                </Button>
                {canEdit && !isEditing && (
                    <Button onClick={() => setIsEditing(true)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit Aircraft
                    </Button>
                )}
            </div>

            {isEditing ? (
                 <EditAircraftForm 
                    aircraft={aircraft} 
                    tenantId={tenantId}
                    onCancel={() => setIsEditing(false)} 
                />
            ) : (
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
                        <AircraftComponents aircraft={aircraft} tenantId={tenantId} />
                    </TabsContent>
                     <TabsContent value="snags">
                        <AircraftSnags aircraftId={aircraft.id} tenantId={tenantId} />
                    </TabsContent>
                </Tabs>
            )}
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
