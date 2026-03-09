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
import type { Personnel, PilotProfile } from './page';
import Link from 'next/link';
import { usePermissions } from '@/hooks/use-permissions';

type UserProfile = Personnel | PilotProfile;

interface PersonnelActionsProps {
  tenantId: string;
  user: UserProfile;
}

const determineCollection = (userType: UserProfile['userType']): string => {
    switch(userType) {
        case 'Personnel': return 'personnel';
        case 'Instructor': return 'instructors';
        case 'Student': return 'students';
        case 'Private Pilot': return 'private-pilots';
        default: return 'personnel';
    }
}

export function PersonnelActions({ tenantId, user }: PersonnelActionsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const canDelete = hasPermission('users-delete');

  const handleDeleteUser = () => {
    if (!firestore || !tenantId) return;
    
    const collectionName = determineCollection(user.userType);
    const userRef = doc(firestore, 'tenants', tenantId, collectionName, user.id);
    deleteDocumentNonBlocking(userRef);

    const userLinkRef = doc(firestore, 'users', user.id);
    deleteDocumentNonBlocking(userLinkRef);

    toast({
        title: 'User Removed',
        description: `The user profile for ${user.firstName} ${user.lastName} is being deleted.`,
    });
    setIsDeleteDialogOpen(false);
  }

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="default" size="sm">
          <Link href={`/users/personnel/${user.id}?type=${user.userType}`}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Link>
        </Button>
        
        {canDelete && (
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
                    This will permanently delete the user account and profile for {user.firstName} {user.lastName}.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteUser} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
