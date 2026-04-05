'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';
import { AircraftForm } from './aircraft-form';

interface AircraftActionsProps {
  tenantId: string;
  aircraft: Aircraft;
  canEdit: boolean;
}

export function AircraftActions({ tenantId, aircraft, canEdit }: AircraftActionsProps) {
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/aircraft/${aircraft.id}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Failed to delete aircraft.');

      window.dispatchEvent(new Event('safeviate-aircrafts-updated'));
      toast({ title: 'Aircraft Deleted', description: `${aircraft.tailNumber} has been removed from the fleet.` });
      setIsDeleteDialogOpen(false);
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
          <Button variant="outline" size="sm" className="h-8 px-4 text-[10px] font-black uppercase border-slate-300 shadow-sm">
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Edit
          </Button>
        }
      />

      <Button
        variant="destructive"
        size="sm"
        className="h-8 px-4 text-[10px] font-black uppercase shadow-sm"
        onClick={() => setIsDeleteDialogOpen(true)}
      >
        <Trash2 className="mr-2 h-3.5 w-3.5" />
        Delete
      </Button>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="text-sm">
                    This will permanently remove <span className="font-bold text-foreground">{aircraft.tailNumber}</span> and all its associated maintenance history from your fleet records.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel className="text-[10px] font-black uppercase h-10 px-8 border-slate-300">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className='bg-destructive text-destructive-foreground hover:bg-destructive/90 text-[10px] font-black uppercase h-10 px-8'>
                    Confirm Deletion
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
