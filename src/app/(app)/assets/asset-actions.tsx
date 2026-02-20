'use client';

import { useState, useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react';
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from 'next/link';
import { usePermissions } from '@/hooks/use-permissions';
import { AssetForm } from './asset-form';
import type { Aircraft } from './page';

interface AssetActionsProps {
  aircraft: Aircraft;
  bookings: any[];
  tenantId: string;
}

export function AssetActions({ aircraft, bookings, tenantId }: AssetActionsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const canEdit = hasPermission('assets-edit');
  const canDelete = hasPermission('assets-delete');

  const hasBookings = useMemo(() => {
    return bookings.some(booking => booking.aircraftId === aircraft.id);
  }, [bookings, aircraft.id]);

  const handleDelete = () => {
    if (!firestore) return;
    if (hasBookings) {
        toast({
            variant: "destructive",
            title: "Cannot Delete",
            description: "This aircraft has associated bookings and cannot be deleted."
        });
        setIsDeleteDialogOpen(false);
        return;
    }

    const docRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Aircraft Deleted', description: `${aircraft.tailNumber} is being deleted.` });
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
                    <Link href={`/assets/${aircraft.id}`}>
                        <Eye className="mr-2 h-4 w-4" /> View Details
                    </Link>
                </DropdownMenuItem>
                {canEdit && (
                    <AssetForm 
                        tenantId={tenantId} 
                        existingAircraft={aircraft}
                        trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                        }
                    />
                )}
                {canDelete && (
                    <DropdownMenuItem onSelect={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                )}
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
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
