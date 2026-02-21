
'use client';

import { use, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { Role } from '@/app/(app)/admin/roles/page';
import type { Department } from '@/app/(app)/users/personnel/page';
import type { AircraftInspectionWarningSettings, HourWarning } from '@/types/inspection';
import { AircraftForm } from '../aircraft-form';
import { ViewAircraftDetails } from './view-aircraft-details';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import type { Aircraft } from '@/types/aircraft';

interface AircraftPageProps {
    params: { id: string };
}

function AircraftPageContent({ params }: AircraftPageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const [isEditing, setIsEditing] = useState(false);

    const tenantId = 'safeviate';
    const aircraftId = resolvedParams.id;

    const aircraftRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
        [firestore, tenantId, aircraftId]
    );
    const rolesQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/roles`) : null), [firestore, tenantId]);
    const departmentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/departments`) : null), [firestore, tenantId]);
    const inspectionSettingsRef = useMemoFirebase(() => (firestore ? doc(firestore, `tenants/${tenantId}/settings`, 'inspection-warnings') : null), [firestore, tenantId]);


    const { data: aircraft, isLoading: isLoadingAircraft, error: aircraftError } = useDoc<Aircraft>(aircraftRef);
    const { data: roles, isLoading: isLoadingRoles, error: rolesError } = useCollection<Role>(rolesQuery);
    const { data: departments, isLoading: isLoadingDepts, error: deptsError } = useCollection<Department>(departmentsQuery);
    const { data: inspectionSettings, isLoading: isLoadingSettings, error: settingsError } = useDoc<AircraftInspectionWarningSettings>(inspectionSettingsRef);

    const isLoading = isLoadingAircraft || isLoadingRoles || isLoadingDepts || isLoadingSettings;
    const error = aircraftError || rolesError || deptsError || settingsError;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }
    
    if (error) {
        return <p className="text-destructive text-center p-8">Error: {error.message}</p>
    }

    if (!aircraft) {
        return <p>Aircraft not found.</p>
    }

    return (
        <div className='space-y-6'>
            {isEditing ? (
                 <AircraftForm 
                    tenantId={tenantId}
                    aircraft={aircraft}
                    roles={roles || []}
                    departments={departments || []}
                    onCancel={() => setIsEditing(false)}
                />
            ) : (
                <>
                    <div className="flex justify-end">
                        <Button onClick={() => setIsEditing(true)}>
                            <Pencil className='mr-2' />
                            Edit Aircraft
                        </Button>
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


export default function AircraftPage(props: AircraftPageProps) {
  return (
    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
      <AircraftPageContent {...props} />
    </Suspense>
  )
}
