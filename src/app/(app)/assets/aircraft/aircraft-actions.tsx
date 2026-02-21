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
import { MoreHorizontal, Eye, Trash2 } from 'lucide-react';
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
import type { Aircraft } from '../page';
import Link from 'next/link';

interface AircraftActionsProps {
  tenantId: string;
  aircraft: Aircraft;
}

export function AircraftActions({ tenantId, aircraft }: AircraftActionsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDelete = () => {
    if (!firestore) return;
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    deleteDocumentNonBlocking(aircraftRef);
    toast({ title: 'Aircraft Deleted' });
    setIsDeleteDialogOpen(false);
  };

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
                    <Link href={`/assets/aircraft/${aircraft.id}`}>
                        <Eye className="mr-2 h-4 w-4" /> View
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:text-destructive">
                    <Trash2 className='mr-2 h-4 w-4' /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the aircraft &quot;{aircraft.tailNumber}&quot;.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive-foreground">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
