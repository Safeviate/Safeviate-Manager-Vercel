
'use client';

import { useState } from 'react';
import { doc } from 'firebase/firestore';
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
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';
import { AircraftForm } from './aircraft-form';

interface AircraftActionsProps {
  tenantId: string;
  aircraft: Aircraft;
  canEdit: boolean;
}

export function AircraftActions({ tenantId, aircraft, canEdit }: AircraftActionsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDelete = () => {
    if (!firestore || !tenantId) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    deleteDocumentNonBlocking(aircraftRef);
    toast({ title: 'Aircraft Deleted' });
    setIsDeleteDialogOpen(false);
  };

  if (!canEdit) return null;

  return (
    <div className="flex items-center justify-end gap-2">
      <AircraftForm
        tenantId={tenantId}
        organizationId={aircraft.organizationId || null}
        existingAircraft={aircraft}
        trigger={
          <Button variant="outline" size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        }
      />
      
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setIsDeleteDialogOpen(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently remove {aircraft.tailNumber} from your fleet records.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
