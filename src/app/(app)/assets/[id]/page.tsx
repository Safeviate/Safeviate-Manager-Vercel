'use client';

import { useState, useMemo, use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Aircraft } from '../page';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ViewAircraftDetails } from './view-asset-details';
import { EditAircraftForm } from '../edit-asset-form';
import { AircraftDocuments } from './aircraft-documents';
import { AircraftComponents } from './aircraft-components';
import { AircraftSnags } from './aircraft-snags';

interface AircraftDetailPageProps {
    params: { id: string };
}

function AircraftDetailPageContent({ params }: AircraftDetailPageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const searchParams = useSearchParams();

    const tenantId = 'safeviate'; // Hardcoded for now
    const aircraftId = resolvedParams.id;
    const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true');

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
            <div className="flex justify-between items-center">
                <Button asChild variant="outline">
                    <Link href="/assets">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Fleet
                    </Link>
                </Button>
                {!isEditing && (
                    <Button onClick={() => setIsEditing(true)}>
                        <Pencil className='mr-2' />
                        Edit Aircraft
                    </Button>
                )}
            </div>

            <Tabs defaultValue="overview">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="components">Components</TabsTrigger>
                    <TabsTrigger value="snags">Snags</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="mt-4">
                    {isEditing ? (
                        <EditAircraftForm aircraft={aircraft} onCancel={() => setIsEditing(false)} />
                    ) : (
                        <ViewAircraftDetails aircraft={aircraft} />
                    )}
                </TabsContent>
                <TabsContent value="documents" className="mt-4">
                    <AircraftDocuments aircraft={aircraft} />
                </TabsContent>
                 <TabsContent value="components" className="mt-4">
                    <AircraftComponents aircraft={aircraft} />
                </TabsContent>
                 <TabsContent value="snags" className="mt-4">
                    <AircraftSnags aircraft={aircraft} />
                </TabsContent>
            </Tabs>
        </div>
    )
}


export default function AircraftDetailPage(props: AircraftDetailPageProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AircraftDetailPageContent {...props} />
    </Suspense>
  )
}
