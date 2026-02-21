
'use client';

import { useState, use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import type { Aircraft } from '@/types/aircraft';
import { EditPersonnelForm } from '../../../users/personnel/[id]/edit-personnel-form';
import { ViewAircraftDetails } from './view-aircraft-details';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { AircraftForm } from '../aircraft-form';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';


interface AircraftPageProps {
    params: { id: string };
}

function AircraftPageContent({ params }: AircraftPageProps) {
    const [isEditing, setIsEditing] = useState(false);
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const aircraftId = params.id;
    const { hasPermission } = usePermissions();
    const canEdit = hasPermission('assets-edit');

    const aircraftRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
        [firestore, tenantId, aircraftId]
    );
    const { data: aircraft, isLoading: isLoadingAircraft, error: aircraftError } = useDoc<Aircraft>(aircraftRef);

    const inspectionSettingsId = 'inspection-warnings';
    const inspectionSettingsRef = useMemoFirebase(() => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', inspectionSettingsId) : null), [firestore, tenantId]);
    const { data: inspectionSettings, isLoading: isLoadingInspections, error: inspectionError } = useDoc<AircraftInspectionWarningSettings>(inspectionSettingsRef);

    const isLoading = isLoadingAircraft || isLoadingInspections;
    const error = aircraftError || inspectionError;

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

    if (isEditing) {
        return (
            <AircraftForm
                tenantId={tenantId}
                existingAircraft={aircraft}
                onCancel={() => setIsEditing(false)}
            />
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                {canEdit && (
                    <Button onClick={() => setIsEditing(true)}>
                        <Pencil className='mr-2 h-4 w-4' />
                        Edit Aircraft
                    </Button>
                )}
            </div>
            <ViewAircraftDetails 
                aircraft={aircraft} 
                inspectionSettings={inspectionSettings}
            />
        </div>
    )
}

export default function AircraftPage(props: AircraftPageProps) {
    const resolvedParams = use(props.params);
    return (
        <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <AircraftPageContent params={resolvedParams} />
        </Suspense>
    )
}

