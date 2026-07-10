'use client';

import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';
import { AircraftForm } from './aircraft-form';
import { ArchiveActionButton, EditActionButton } from '@/components/record-action-buttons';
import { ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AircraftActionsProps {
  tenantId: string;
  aircraft: Aircraft;
  canEdit: boolean;
  archived?: boolean;
}

export function AircraftActions({ tenantId, aircraft, canEdit, archived = false }: AircraftActionsProps) {
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/aircraft/${aircraft.id}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Failed to archive aircraft.');

      window.dispatchEvent(new Event('safeviate-aircrafts-updated'));
      toast({ title: 'Aircraft Archived', description: `${aircraft.tailNumber} can be restored from Archived Aircraft.` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to archive aircraft.' });
    }
  };

  if (!canEdit) return null;

  return (
    <div className="flex items-center justify-end gap-2">
      {!archived ? <AircraftForm
        tenantId={tenantId}
        organizationId={aircraft.organizationId || null}
        existingAircraft={aircraft}
        trigger={
          <EditActionButton label="Edit aircraft" />
        }
      /> : null}

      {archived ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            const response = await fetch(`/api/aircraft/${aircraft.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'restore' }),
            });
            if (response.ok) {
              window.dispatchEvent(new Event('safeviate-aircrafts-updated'));
              toast({ title: 'Aircraft Restored', description: `${aircraft.tailNumber} is active again.` });
            } else {
              toast({ variant: 'destructive', title: 'Restore Failed', description: 'Failed to restore aircraft.' });
            }
          }}
        >
          <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" /> Restore
        </Button>
      ) : (
        <ArchiveActionButton
          description={`"${aircraft.tailNumber}" will be moved to Archived Aircraft. It will remain recoverable and can be restored later.`}
          onArchive={handleDelete}
          srLabel="Archive aircraft"
        />
      )}
    </div>
  );
}
