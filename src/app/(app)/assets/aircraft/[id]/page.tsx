'use client';

import { useState, use, Suspense } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { AircraftForm } from '../aircraft-form';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft } from '@/types/aircraft';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { ViewAircraftDetails } from '../view-aircraft-details';
import { usePermissions } from '@/hooks/use-permissions';

interface AircraftPageProps {
  params: { id: string };
}

function AircraftPageContent({ params }: AircraftPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const aircraftId = resolvedParams.id;
  const tenantId = 'safeviate'; // Hardcoded for now
  const [isEditing, setIsEditing] = useState(false);
  const canEdit = hasPermission('assets-edit');

  const aircraftDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftDocRef);

  if (isLoading) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  if (error) {
    return <p className="text-destructive">Error: {error.message}</p>;
  }

  if (!aircraft) {
    return <p>Aircraft not found.</p>;
  }

  return (
    <div className="space-y-6">
      {isEditing ? (
        <AircraftForm
          existingAircraft={aircraft}
          onSave={() => setIsEditing(false)}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          <div className="flex justify-end">
            {canEdit && (
                <Button onClick={() => setIsEditing(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Aircraft
                </Button>
            )}
          </div>
          <ViewAircraftDetails aircraft={aircraft} />
        </>
      )}
    </div>
  );
}


export default function AircraftPage(props: AircraftPageProps) {
    return (
        <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
            <AircraftPageContent {...props} />
        </Suspense>
    )
}
