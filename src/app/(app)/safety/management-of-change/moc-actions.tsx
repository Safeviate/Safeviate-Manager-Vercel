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
import type { ManagementOfChange } from '@/types/moc';
import Link from 'next/link';
import { usePermissions } from '@/hooks/use-permissions';

interface MocActionsProps {
  moc: ManagementOfChange;
  tenantId: string;
}

export function MocActions({ moc, tenantId }: MocActionsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const canManage = hasPermission('moc-manage');

  const handleDelete = () => {
    if (!firestore) return;
    const mocRef = doc(firestore, `tenants/${tenantId}/management-of-change`, moc.id);
    deleteDocumentNonBlocking(mocRef);
    toast({
        title: "MOC Deleted",
        description: `MOC #${moc.mocNumber} is being deleted.`
    });
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="default" size="sm">
          <Link href={`/safety/management-of-change/${moc.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            {canManage ? 'View / Edit' : 'View'}
          </Link>
        </Button>
        
        {canManage && (
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
                      This will permanently delete the MOC &quot;{moc.mocNumber}: {moc.title}&quot;. This action cannot be undone.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
