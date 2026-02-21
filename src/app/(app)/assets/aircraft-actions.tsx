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
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Aircraft } from '@/types/aircraft';
import { usePermissions } from '@/hooks/use-permissions';


interface AircraftActionsProps {
  tenantId: string;
  aircraft: Aircraft;
  onEdit: () => void;
}

export function AircraftActions({ tenantId, aircraft, onEdit }: AircraftActionsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('assets-edit');
  const canDelete = hasPermission('assets-delete');

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  }
  
  const handleDelete = () => {
    if (!firestore || !tenantId) return;

    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    deleteDocumentNonBlocking(aircraftRef)
      .then(() => {
        toast({
          title: 'Aircraft Deleted',
          description: `Aircraft ${aircraft.tailNumber} is being deleted.`,
        });
      })
      .catch((error) => {
        toast({
            variant: 'destructive',
            title: 'Delete failed',
            description: error.message || 'Could not delete the aircraft.',
        });
      });
    
    setIsDeleteDialogOpen(false);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleEditClick} disabled={!canEdit}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDeleteClick} disabled={!canDelete} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the aircraft &quot;{aircraft.tailNumber}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
