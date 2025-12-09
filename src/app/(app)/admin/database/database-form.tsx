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
import { useFirestore } from '@/firebase/hooks';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { menuConfig, settingsMenuItem } from '@/lib/menu-config';

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
      const allMenuItems = [...menuConfig, settingsMenuItem];

      allMenuItems.forEach(item => {
        if (!item.href) return;
        // Add main menu item permission
        const mainPermRef = doc(permissionsRef, item.href.replace('/', ''));
        setDocumentNonBlocking(mainPermRef, {
            id: item.href,
            name: item.label,
            description: `Access to ${item.label} section`,
        }, { merge: true });

        // Add sub-menu items permissions
        if (item.subItems) {
            item.subItems.forEach(subItem => {
                if (!subItem.href) return;
                const subPermRef = doc(permissionsRef, subItem.href.replace(/\//g, '-').substring(1));
                 setDocumentNonBlocking(subPermRef, {
                    id: subItem.href,
                    name: subItem.label,
                    description: subItem.description,
                }, { merge: true });
            });
        }
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
          Create the initial tenant document and its associated permissions required for the application to
          function correctly.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleSeedDatabase}>Create "Safeviate" Tenant & Permissions</Button>
      </CardContent>
    </Card>
  );
}
