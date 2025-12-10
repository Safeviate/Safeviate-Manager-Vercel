
'use client';

import { useState } from 'react';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import type { Aircraft } from './page';

interface AircraftActionsProps {
  tenantId: string;
  aircraft: Aircraft;
}

export function AircraftActions({ tenantId, aircraft }: AircraftActionsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [tailNumber, setTailNumber] = useState(aircraft.tailNumber);
  const [model, setModel] = useState(aircraft.model);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleUpdateAircraft = () => {
    if (!tailNumber.trim() || !model.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please provide both a tail number and a model.',
      });
      return;
    }

    if (!firestore || !tenantId) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not connect to the database.',
          });
        return;
    }

    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, { tailNumber, model });

    toast({
        title: 'Aircraft Updated',
        description: `The aircraft "${tailNumber}" has been updated.`,
    });
    
    setIsEditOpen(false);
  };

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
    setIsDeleteOpen(false);
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
          <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
            <Pencil className='mr-2 h-4 w-4' /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsDeleteOpen(true)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
             <Trash2 className='mr-2 h-4 w-4' /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Edit Aircraft</DialogTitle>
                <DialogDescription>
                    Update the details for &quot;{aircraft.tailNumber}&quot;.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-tailNumber" className="text-right">
                    Tail Number
                </Label>
                <Input
                    id="edit-tailNumber"
                    value={tailNumber}
                    onChange={(e) => setTailNumber(e.target.value)}
                    className="col-span-3"
                />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-model" className="text-right">
                    Model
                </Label>
                <Input
                    id="edit-model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="col-span-3"
                />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleUpdateAircraft}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Alert Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the 
                      aircraft &quot;{aircraft.tailNumber}&quot;.
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
