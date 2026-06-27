'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { DeleteActionButton } from '@/components/record-action-buttons';
import type { Role } from './page';

interface RoleActionsProps {
  tenantId: string;
  role: Role;
}

export function RoleActions({ tenantId, role }: RoleActionsProps) {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const canManage = hasPermission('admin-roles-manage');

  const handleDelete = () => {
    fetch(`/api/roles/${role.id}`, { method: 'DELETE' })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.error || 'The role could not be deleted.');
        }
        window.dispatchEvent(new Event('safeviate-roles-updated'));
        toast({
          title: 'Role Deleted',
          description: `The role "${role.name}" has been removed.`,
        });
      })
      .catch(() => {
        toast({
            variant: 'destructive',
            title: 'Delete Failed',
            description: 'The role could not be deleted.',
        });
      });
    setIsDeleteDialogOpen(false);
  }

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline" size="icon" className="h-8 w-8 border-slate-300 p-0">
          <Link href={`/admin/roles/${role.id}`} aria-label="Edit role">
            <span className="sr-only">Edit role</span>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </Link>
        </Button>
        
        {canManage && (
          <DeleteActionButton
            description={`This will permanently delete the "${role.name}" role. Users assigned to this role may lose access to critical features.`}
            onDelete={() => setIsDeleteDialogOpen(true)}
            srLabel="Delete role"
          />
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the "{role.name}" role. Users assigned to this role may lose access to critical features.
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
