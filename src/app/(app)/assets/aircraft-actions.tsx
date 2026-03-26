'use client';

import { doc } from 'firebase/firestore';
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';
import { usePermissions } from '@/hooks/use-permissions';
import { DeleteActionButton, ViewActionButton } from '@/components/record-action-buttons';

interface AircraftActionsProps {
  tenantId: string;
  aircraft: Aircraft;
}

export function AircraftActions({ tenantId, aircraft }: AircraftActionsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const canDelete = hasPermission('assets-delete');

  const handleDelete = () => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    deleteDocumentNonBlocking(aircraftRef);
    toast({
        title: 'Aircraft Removed',
        description: `Aircraft ${aircraft.tailNumber} is being deleted.`,
    });
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <ViewActionButton href={`/assets/aircraft/${aircraft.id}`} />
      {canDelete && (
        <DeleteActionButton
          description={`This will permanently delete ${aircraft.tailNumber} and all its associated logs and records.`}
          onDelete={handleDelete}
          srLabel="Delete aircraft"
        />
      )}
    </div>
  );
}
