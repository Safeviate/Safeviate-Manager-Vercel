'use client';

import { useState } from 'react';
import { doc } from 'firebase/firestore';
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
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { DeleteActionButton, EditActionButton } from '@/components/record-action-buttons';
import { RoleForm } from './role-form';
import type { RoleCategory } from './page';

interface RoleActionsProps {
  tenantId: string;
  role: {
    id: string;
    name: string;
    category?: string;
    permissions: string[];
    requiredDocuments?: string[];
  };
}

export function RoleActions({ tenantId, role }: RoleActionsProps) {
  const firestore = useFirestore();
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
    if (!firestore) return;
    const roleRef = doc(firestore, 'tenants', tenantId, 'roles', role.id);
    deleteDocumentNonBlocking(roleRef);
    toast({
        title: 'Role Deleted',
        description: `The role "${role.name}" is being deleted.`,
    });
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
