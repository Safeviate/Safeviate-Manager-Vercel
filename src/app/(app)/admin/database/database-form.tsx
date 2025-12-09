
'use client';

import { collection, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useFirestore } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { permissionsConfig } from '@/lib/permissions-config';

export function DatabaseForm() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleSeedDatabase = () => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore is not initialized.',
      });
      return;
    }
    try {
      const tenantId = 'safeviate';
      const tenantRef = doc(firestore, 'tenants', tenantId);

      setDocumentNonBlocking(
        tenantRef,
        {
          id: tenantId,
          name: 'Safeviate',
        },
        { merge: true }
      );

      const permissionsRef = collection(firestore, 'tenants', tenantId, 'permissions');

      permissionsConfig.forEach(resource => {
        resource.actions.forEach(action => {
            const permissionId = `${resource.id}-${action}`;
            const permissionDocRef = doc(permissionsRef, permissionId);
            const permissionName = `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource.name}`;

            setDocumentNonBlocking(permissionDocRef, {
                id: permissionId,
                name: permissionName,
                description: `Allows users to ${action} ${resource.name.toLowerCase()}.`,
                resource: resource.id,
                action: action,
            }, { merge: true });
        });
      });

      toast({
        title: 'Database Seeding Initiated',
        description: 'The "Safeviate" tenant and its permissions are being created.',
      });
    } catch (e: any) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description:
          e.message || 'There was a problem seeding the database.',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Database Setup</CardTitle>
        <CardDescription>
          Create the initial tenant document and seed the granular, action-based permissions required for role assignment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleSeedDatabase}>Create "Safeviate" Tenant & Seed Permissions</Button>
      </CardContent>
    </Card>
  );
}
