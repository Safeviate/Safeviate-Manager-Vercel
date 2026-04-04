'use client';

import { useState } from 'react';
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
import { DeleteActionButton, EditActionButton } from '@/components/record-action-buttons';
import { RoleForm } from './role-form';
import type { RoleCategory, Role } from './page';

interface RoleActionsProps {
  tenantId: string;
  role: Role;
}

export function RoleActions({ tenantId, role }: RoleActionsProps) {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const canManage = hasPermission('admin-roles-manage');
  const normalizedCategory = (
    ['Personnel', 'Instructor', 'Student', 'Private Pilot', 'External'] as RoleCategory[]
  ).includes(role.category as RoleCategory)
    ? (role.category as RoleCategory)
    : undefined;

  const handleDelete = () => {
    try {
        const stored = localStorage.getItem('safeviate.roles');
        if (stored) {
            const roles = JSON.parse(stored) as Role[];
            const nextRoles = roles.filter(r => r.id !== role.id);
            localStorage.setItem('safeviate.roles', JSON.stringify(nextRoles));
            window.dispatchEvent(new Event('safeviate-roles-updated'));
            
            toast({
                title: 'Role Deleted',
                description: `The role "${role.name}" has been removed.`,
            });
        }
    } catch (e) {
        toast({
            variant: 'destructive',
            title: 'Delete Failed',
            description: 'The role could not be deleted.',
        });
    }
    setIsDeleteDialogOpen(false);
  }

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <RoleForm 
            tenantId={tenantId} 
            existingRole={{ ...role, category: normalizedCategory }} 
            trigger={
                <EditActionButton label="Edit role" />
            } 
        />
        
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
