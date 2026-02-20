'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { Aircraft } from '../page';
import { EditAircraftForm } from './edit-asset-form';
import { usePermissions } from '@/hooks/use-permissions';
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc } from 'firebase/firestore';
import Link from 'next/link';
import { Eye } from 'lucide-react';

interface AircraftActionsProps {
  tenantId: string;
  aircraft: Aircraft;
}

export function AircraftActions({ tenantId, aircraft }: AircraftActionsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const canEdit = hasPermission('assets-edit');
  const canDelete = hasPermission('assets-delete');

  const handleDeleteAircraft = async () => {
    if (!firestore || !canDelete) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    try {
        await deleteDocumentNonBlocking(aircraftRef);
        toast({
            title: 'Aircraft Deleted',
            description: `The aircraft "${aircraft.tailNumber}" is being deleted.`,
        });
        setIsDeleteDialogOpen(false);
    } catch(e) {
        toast({
            variant: 'destructive',
            title: 'Delete Failed',
            description: 'There was a problem deleting the aircraft.'
        })
    }
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
          <DropdownMenuItem asChild>
            <Link href={`/assets/${aircraft.id}`}>
              <Eye className='mr-2' /> View
            </Link>
          </DropdownMenuItem>
          {canEdit && (
            <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
              <Pencil className='mr-2' /> Edit
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem onSelect={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
              <Trash2 className='mr-2' /> Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Aircraft</DialogTitle>
            <DialogDescription>
              Update the details for {aircraft.tailNumber}.
            </DialogDescription>
          </DialogHeader>
          <EditAircraftForm
            aircraft={aircraft}
            tenantId={tenantId}
            onSave={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the aircraft
                    &quot;{aircraft.tailNumber}&quot;.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAircraft} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
