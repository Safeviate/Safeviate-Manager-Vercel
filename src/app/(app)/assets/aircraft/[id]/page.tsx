
'use client';

import { useState, useMemo, use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, doc, query } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Aircraft } from '@/types/aircraft';
import type { Department } from '@/app/(app)/users/personnel/page';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { AircraftForm } from '../aircraft-form';
import { ViewAircraftDetails } from './view-aircraft-details';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';

interface AircraftProfilePageProps {
    params: { id: string };
}


function AircraftProfileContent({ params }: AircraftProfilePageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const { hasPermission } = usePermissions();

    const tenantId = 'safeviate'; // Hardcoded for now
    const aircraftId = resolvedParams.id;
    const [isEditing, setIsEditing] = useState(false);
    const canEdit = hasPermission('assets-edit');


    const aircraftDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
        [firestore, tenantId, aircraftId]
    );

    const inspectionSettingsRef = useMemoFirebase(
      () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'inspection-warnings') : null),
      [firestore, tenantId]
    );

    const { data: aircraft, isLoading: isLoadingAircraft, error: aircraftError } = useDoc<Aircraft>(aircraftDocRef);
    const { data: inspectionSettings, isLoading: isLoadingSettings, error: settingsError } = useDoc<AircraftInspectionWarningSettings>(inspectionSettingsRef);

    const isLoading = isLoadingAircraft || isLoadingSettings;
    const error = aircraftError || settingsError;


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
                 <AircraftForm
                    tenantId={tenantId}
                    existingAircraft={aircraft}
                    onCancel={() => setIsEditing(false)}
                />
            ) : (
                <>
                    <div className="flex justify-end">
                        {canEdit && (
                            <Button onClick={() => setIsEditing(true)}>
                                <Pencil className='mr-2' />
                                Edit Aircraft
                            </Button>
                        )}
                    </div>
                    <ViewAircraftDetails 
                        aircraft={aircraft} 
                        inspectionWarningSettings={inspectionSettings}
                    />
                </>
            )}
           
        </div>
    );
}


export default function AircraftProfilePageWrapper(props: AircraftProfilePageProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AircraftProfileContent {...props} />
    </Suspense>
  )
}
