
'use client';

import { use, Suspense } from 'react';
import { doc, collection } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Aircraft } from '@/types/aircraft';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { ViewAircraftDetails } from './view-aircraft-details';
import { AircraftForm } from '../aircraft-form';
import { useState } from 'react';
import { Pencil } from 'lucide-react';

interface AircraftPageProps {
    params: { id: string };
}

function AircraftPageContent({ params }: AircraftPageProps) {
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const aircraftId = params.id;
    const [isEditing, setIsEditing] = useState(false);

    const aircraftDocRef = useMemoFirebase(
        () => (firestore && aircraftId ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
        [firestore, tenantId, aircraftId]
    );

    const inspectionSettingsRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'inspection-warnings') : null),
        [firestore, tenantId]
    );

    const { data: aircraft, isLoading: isLoadingAircraft, error: aircraftError } = useDoc<Aircraft>(aircraftDocRef);
    const { data: inspectionSettings, isLoading: isLoadingSettings } = useDoc<AircraftInspectionWarningSettings>(inspectionSettingsRef);

    const isLoading = isLoadingAircraft || isLoadingSettings;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }
    
    if (aircraftError) {
        return <p className="text-destructive">Error loading aircraft: {aircraftError.message}</p>;
    }


    return (
        <div className='space-y-6'>
            <div className="flex justify-between items-center">
                <Button asChild variant="outline">
                    <Link href="/assets/aircraft">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Fleet
                    </Link>
                </Button>
                <Button onClick={() => setIsEditing(!isEditing)}>
                    <Pencil className='mr-2' />
                    {isEditing ? 'Cancel' : 'Edit Aircraft'}
                </Button>
            </div>
            
            {isEditing ? (
                <AircraftForm 
                    existingAircraft={aircraft}
                    onCancel={() => setIsEditing(false)}
                />
            ) : (
                 <ViewAircraftDetails 
                    aircraft={aircraft} 
                    inspectionSettings={inspectionSettings}
                />
            )}
        </div>
    );
}

export default function AircraftPage(props: AircraftPageProps) {
    const resolvedParams = use(props.params);
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AircraftPageContent params={resolvedParams} />
        </Suspense>
    )
}

    