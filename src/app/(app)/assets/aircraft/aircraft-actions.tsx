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
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"

interface AircraftActionsProps {
  onEdit: () => void;
  aircraftId: string;
  tenantId: string;
}

export function AircraftActions({ onEdit, aircraftId, tenantId }: AircraftActionsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDelete = () => {
      if (!firestore) return;
      const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId);
      deleteDocumentNonBlocking(aircraftRef);
      toast({ title: 'Aircraft Deleted', description: 'The aircraft is being removed from the fleet.' });
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
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onEdit(); }}>
            <Pencil className='mr-2 h-4 w-4' /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:text-destructive">
            <Trash2 className='mr-2 h-4 w-4' /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the aircraft record.
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
