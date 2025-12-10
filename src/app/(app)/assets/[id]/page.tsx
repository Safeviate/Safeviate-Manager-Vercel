
'use client';

import { useState, use } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Aircraft } from '../page';
import { EditAircraftForm } from './edit-aircraft-form';
import { ViewAircraftDetails } from './view-aircraft-details';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

interface AircraftProfilePageProps {
    params: { id: string };
}

export default function AircraftProfilePage({ params }: AircraftProfilePageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const tenantId = 'safeviate'; // Hardcoded for now
    const aircraftId = resolvedParams.id;
    const [isEditing, setIsEditing] = useState(false);

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
            {!isEditing && (
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
                    <Button onClick={() => setIsEditing(true)}>
                        <Pencil className='mr-2' />
                        Edit Aircraft
                    </Button>
                </div>
            )}
            
            {isEditing ? (
                 <EditAircraftForm
                    tenantId={tenantId}
                    aircraft={aircraft}
                    onCancel={() => setIsEditing(false)}
                />
            ) : (
                <ViewAircraftDetails 
                    aircraft={aircraft}
                />
            )}
           
        </div>
    );
}
