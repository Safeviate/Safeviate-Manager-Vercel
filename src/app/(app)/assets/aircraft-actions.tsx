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
          title: 'Aircraft Archived',
          description: `Aircraft ${aircraft.tailNumber} was moved to the Recovery Vault.`,
        });
      })
      .catch(() => {
        toast({
          variant: 'destructive',
          title: 'Archive Failed',
          description: 'Failed to archive the aircraft.',
        });
      });
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <ViewActionButton href={`/assets/aircraft/${aircraft.id}`} />
      {canDelete && (
        <DeleteActionButton
          title="Archive Aircraft?"
          description={`${aircraft.tailNumber} will be removed from active records and retained in the Recovery Vault for restoration by the Safeviate master administrator.`}
          onDelete={handleDelete}
          srLabel="Archive aircraft"
        />
      )}
    </div>
  );
}
