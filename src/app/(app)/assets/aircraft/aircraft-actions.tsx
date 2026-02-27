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
  aircraft: Aircraft;
  tenantId: string;
}

export function AircraftActions({ aircraft, tenantId }: AircraftActionsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const canDelete = hasPermission('assets-delete');

  const handleDelete = () => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    deleteDocumentNonBlocking(aircraftRef);
    toast({
      title: 'Aircraft Deleted',
      description: `${aircraft.tailNumber} has been removed from the fleet.`,
    });
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={`/assets/aircraft/${aircraft.id}`}>
          <Eye className="mr-2 h-4 w-4" />
          View
        </Link>
      </Button>

      {canDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete aircraft <strong>{aircraft.tailNumber}</strong> from the database.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Aircraft
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
