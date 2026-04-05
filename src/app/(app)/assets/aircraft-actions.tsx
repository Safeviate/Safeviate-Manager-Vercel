'use client';

import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';
import { usePermissions } from '@/hooks/use-permissions';
import { DeleteActionButton, ViewActionButton } from '@/components/record-action-buttons';

interface AircraftActionsProps {
  tenantId: string;
  aircraft: Aircraft;
}

export function AircraftActions({ aircraft }: AircraftActionsProps) {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const canDelete = hasPermission('assets-delete');

  const handleDelete = () => {
    fetch(`/api/aircraft/${aircraft.id}`, { method: 'DELETE' })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Failed to remove the aircraft.');
        window.dispatchEvent(new Event('safeviate-aircrafts-updated'));
        toast({
          title: 'Aircraft Removed',
          description: `Aircraft ${aircraft.tailNumber} has been permanently deleted from the database.`,
        });
      })
      .catch(() => {
        toast({
          variant: 'destructive',
          title: 'Deletion Failed',
          description: 'Failed to remove the aircraft from the database.',
        });
      });
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <ViewActionButton href={`/assets/aircraft/${aircraft.id}`} />
      {canDelete && (
        <DeleteActionButton
          title="Delete Aircraft?"
          description={`This will permanently delete ${aircraft.tailNumber} and all its associated logs and records from the local system.`}
          onDelete={handleDelete}
          srLabel="Delete aircraft"
        />
      )}
    </div>
  );
}
