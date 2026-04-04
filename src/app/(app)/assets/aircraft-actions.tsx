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
    try {
      const stored = localStorage.getItem('safeviate.aircrafts');
      if (!stored) return;
      
      const aircrafts = JSON.parse(stored) as Aircraft[];
      const nextAircrafts = aircrafts.filter(a => a.id !== aircraft.id);
      
      localStorage.setItem('safeviate.aircrafts', JSON.stringify(nextAircrafts));
      
      // Notify the system that the fleet has been modified
      window.dispatchEvent(new Event('safeviate-aircrafts-updated'));

      toast({
          title: 'Aircraft Removed',
          description: `Aircraft ${aircraft.tailNumber} has been permanently deleted from the local inventory.`,
      });
    } catch (e) {
      toast({ 
        variant: 'destructive', 
        title: 'Deletion Failed', 
        description: 'Failed to remove the aircraft from local storage.' 
      });
    }
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
