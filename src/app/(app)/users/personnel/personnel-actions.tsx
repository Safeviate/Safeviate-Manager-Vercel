
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
import type { Personnel, PilotProfile } from './page';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
        default: return 'personnel'; // Fallback, should not happen
    }
}


export function PersonnelActions({ tenantId, user }: PersonnelActionsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);


  const handleDeleteUser = () => {
    if (!firestore || !tenantId) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not connect to the database.',
          });
        return;
    }
    
    const collectionName = determineCollection(user.userType);
    const userRef = doc(firestore, 'tenants', tenantId, collectionName, user.id);
    deleteDocumentNonBlocking(userRef);

    // Check if the deleted user is the one being impersonated
    const impersonatedEmail = localStorage.getItem('impersonatedUser');
    if (impersonatedEmail === user.email) {
      localStorage.removeItem('impersonatedUser');
      toast({
        title: 'Logged Out',
        description: 'You have deleted the user you were impersonating and have been logged out.',
      });
      router.push('/login');
      return;
    }

    toast({
        title: 'User Deleted',
        description: `The user "${user.firstName} ${user.lastName}" is being deleted.`,
    });
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
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                  <Link href={`/users/personnel/${user.id}?type=${user.userType}`}>
                      <Eye className='mr-2' /> View Profile
                  </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <Trash2 className='mr-2' /> Delete
              </DropdownMenuItem>
          </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the user
                    &quot;{user.firstName} {user.lastName}&quot;.
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
