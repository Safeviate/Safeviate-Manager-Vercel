'use client';

import { useState } from 'react';
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
import { Eye, Trash2, Mail, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Personnel, PilotProfile } from './personnel-directory-page';
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
        case 'External': return 'personnel';
        default: return 'personnel';
    }
}

export function PersonnelActions({ tenantId, user }: PersonnelActionsProps) {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const canDelete = hasPermission('users-delete');
  const canEdit = hasPermission('users-edit');

  const handleDeleteUser = async () => {
    try {
      const response = await fetch(`/api/personnel/${user.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete user');
      }
      toast({
        title: 'User Removed',
        description: `The user profile for ${user.firstName} ${user.lastName} was deleted.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error.message || 'The user profile could not be deleted.',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      window.dispatchEvent(new Event('safeviate-personnel-updated'));
      window.dispatchEvent(new Event('safeviate-users-updated'));
    }
  }

  const handleSendWelcomeEmail = async () => {
    setIsSendingEmail(true);
    try {
      const response = await fetch('/api/admin/send-welcome-email', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send email');
      }

      toast({
        title: 'Welcome Email Sent',
        description: `A setup link has been dispatched to ${user.email}.`
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Email Failed',
        description: error.message
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        {canEdit && (
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 border-slate-300"
            onClick={handleSendWelcomeEmail}
            disabled={isSendingEmail}
            title="Send Welcome Email"
          >
            {isSendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4 text-primary" />}
          </Button>
        )}

        <Button asChild variant="outline" size="sm" className="h-8 gap-2 border-slate-300">
          <Link href={`/users/personnel/${user.id}?type=${user.userType}`}>
            <Eye className="h-4 w-4" />
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
