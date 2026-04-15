'use client';

import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';
import { AircraftForm } from './aircraft-form';
import { DeleteActionButton, EditActionButton } from '@/components/record-action-buttons';

interface AircraftActionsProps {
  tenantId: string;
  aircraft: Aircraft;
  canEdit: boolean;
}

export function AircraftActions({ tenantId, aircraft, canEdit }: AircraftActionsProps) {
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/aircraft/${aircraft.id}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Failed to delete aircraft.');

      window.dispatchEvent(new Event('safeviate-aircrafts-updated'));
      toast({ title: 'Aircraft Deleted', description: `${aircraft.tailNumber} has been removed from the fleet.` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete aircraft.' });
    }
  };

  if (!canEdit) return null;

  return (
    <div className="flex items-center justify-end gap-2">
      <AircraftForm
        tenantId={tenantId}
        organizationId={aircraft.organizationId || null}
        existingAircraft={aircraft}
        trigger={
          <EditActionButton label="Edit aircraft" />
        }
      />

      <DeleteActionButton
        description={`This will permanently remove "${aircraft.tailNumber}" and its associated maintenance history from your fleet records.`}
        onDelete={handleDelete}
        srLabel="Delete aircraft"
      />
    </div>
  );
}
