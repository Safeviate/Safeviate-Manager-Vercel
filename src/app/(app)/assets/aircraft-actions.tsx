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
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
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

  const handleDeleteAircraft = () => {
    if (!firestore || !tenantId) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not connect to the database.',
          });
        return;
    }
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    deleteDocumentNonBlocking(aircraftRef);
    toast({
        title: 'Aircraft Deleted',
        description: `The aircraft "${aircraft.tailNumber}" is being deleted.`,
    });
    setIsDeleteDialogOpen(false);
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  }

  return (
    <>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {canEdit && <DropdownMenuItem onSelect={handleEditClick}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>}
                {canDelete && <DropdownMenuItem onSelect={handleDeleteClick} className="text-destructive focus:bg-destructive/10 focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>}
            </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
            if (!open) setIsDeleteDialogOpen(false);
        }}>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the aircraft &quot;{aircraft.tailNumber}&quot;.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={(e) => { e.stopPropagation(); setIsDeleteDialogOpen(false); }}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={(e) => { e.stopPropagation(); handleDeleteAircraft(); }} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
