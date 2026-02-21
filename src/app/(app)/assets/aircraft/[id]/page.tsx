'use client';

import { use, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, collection } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Aircraft, AircraftInspectionWarningSettings, HourWarning } from '@/types/aircraft';
import { AircraftForm } from '@/app/(app)/assets/aircraft/aircraft-form';
import { ViewAircraftDetails } from './view-aircraft-details';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Pencil, ArrowLeft } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import Link from 'next/link';

interface AircraftDetailPageProps {
    params: { id: string };
}

function AircraftPageContent({ params }: AircraftDetailPageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const searchParams = useSearchParams();
    const { hasPermission } = usePermissions();

    const tenantId = 'safeviate'; // Hardcoded for now
    const aircraftId = resolvedParams.id;
    const [isEditing, setIsEditing] = useState(false);
    const canEdit = hasPermission('assets-edit');
    const collectionName = 'aircrafts'

    const aircraftDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, collectionName, aircraftId) : null),
        [firestore, tenantId, collectionName, aircraftId]
    );

     const inspectionSettingsRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'inspection-warnings') : null),
        [firestore, tenantId]
    );

    const { data: aircraft, isLoading: isLoadingAircraft, error: aircraftError } = useDoc<Aircraft>(aircraftDocRef);
    const { data: inspectionSettings, isLoading: isLoadingSettings } = useDoc<AircraftInspectionWarningSettings>(inspectionSettingsRef);

    const isLoading = isLoadingAircraft || isLoadingSettings;
    const error = aircraftError;

    if (isLoading) {
        return (
            <div className="space-y-8">
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
            {isEditing ? (
                 <AircraftForm
                    tenantId={tenantId}
                    existingAircraft={aircraft}
                    onCancel={() => setIsEditing(false)}
                />
            ) : (
                <>
                    <div className="flex justify-between items-center">
                        <Button asChild variant="outline">
                            <Link href="/assets/aircraft">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Aircraft
                            </Link>
                        </Button>
                        {canEdit && (
                            <Button onClick={() => setIsEditing(true)}>
                                <Pencil className='mr-2' />
                                Edit Aircraft
                            </Button>
                        )}
                    </div>
                    <ViewAircraftDetails 
                        aircraft={aircraft}
                        inspectionSettings={inspectionSettings}
                    />
                </>
            )}
           
        </div>
    );
}

export default function AircraftPage(props: AircraftDetailPageProps) {
  return (
    <AircraftPageContent {...props} />
  )
}
