
'use client';

import { doc } from 'firebase/firestore';
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

export function DatabaseForm() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleCreateTenant = () => {
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

      toast({
        title: 'Database Action Initiated',
        description: 'The "Safeviate" tenant document is being created or updated.',
      });
    } catch (e: any) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description:
          e.message || 'There was a problem with the database operation.',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Database Setup</CardTitle>
        <CardDescription>
          Create the initial "Safeviate" tenant document in Firestore. Permissions are now managed in the code and do not need to be seeded.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleCreateTenant}>Create "Safeviate" Tenant</Button>
      </CardContent>
    </Card>
  );
}
