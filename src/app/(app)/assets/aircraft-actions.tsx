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
import { Eye, Trash2 } from 'lucide-react';
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/types/aircraft';
import Link from 'next/link';
import { usePermissions } from '@/hooks/use-permissions';

interface AircraftActionsProps {
  tenantId: string;
  aircraft: Aircraft;
}

export function AircraftActions({ tenantId, aircraft }: AircraftActionsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const canDelete = hasPermission('assets-delete');

  const handleDelete = () => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    deleteDocumentNonBlocking(aircraftRef);
    toast({
        title: 'Aircraft Removed',
        description: `Aircraft ${aircraft.tailNumber} is being deleted.`,
    });
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/assets/aircraft/${aircraft.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Link>
        </Button>
        
        {canDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action will permanently delete {aircraft.tailNumber} and all its associated logs and records.
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
  </>
  );
}
