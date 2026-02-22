
'use client';

import { use, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewAircraftDetails } from './view-aircraft-details';
import type { Aircraft } from '@/types/aircraft';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { AircraftEditActions } from './aircraft-edit-actions';

interface AircraftPageProps {
  params: { id: string };
}

function AircraftPageContent({ params }: AircraftPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  
  const inspectionSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'inspection-warnings') : null),
    [firestore, tenantId]
  );
  
  const { data: aircraft, isLoading: isLoadingAircraft, error } = useDoc<Aircraft>(aircraftRef);
  const { data: inspectionSettings, isLoading: isLoadingSettings } = useDoc<AircraftInspectionWarningSettings>(inspectionSettingsRef);

  const isLoading = isLoadingAircraft || isLoadingSettings;

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
      <div className="flex justify-end">
        <AircraftEditActions aircraft={aircraft} tenantId={tenantId} />
      </div>
      <ViewAircraftDetails aircraft={aircraft} inspectionSettings={inspectionSettings} />
    </div>
  );
}


export default function AircraftPage(props: AircraftPageProps) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <AircraftPageContent {...props} />
    </Suspense>
  )
}
