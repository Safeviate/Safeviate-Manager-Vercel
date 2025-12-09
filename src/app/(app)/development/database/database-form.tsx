'use client';

import { useState } from 'react';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore, setDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export function DatabaseForm() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState('');
  const [tenantName, setTenantName] = useState('');

  const handleAddTenant = () => {
    if (!tenantId || !tenantName) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide both a Tenant ID and a Tenant Name.',
      });
      return;
    }

    try {
      const tenantRef = doc(firestore, 'tenants', tenantId);

      setDocumentNonBlocking(
        tenantRef,
        {
          id: tenantId,
          name: tenantName,
        },
        { merge: true }
      );

      toast({
        title: 'Tenant Creation Initiated',
        description: `The "${tenantName}" tenant document is being created.`,
      });
      
      setTenantId('');
      setTenantName('');

    } catch (e: any) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description:
          e.message || 'There was a problem creating the tenant.',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tenant Management</CardTitle>
        <CardDescription>
          Add new tenants to the Firestore database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tenant-id">Tenant ID</Label>
          <Input
            id="tenant-id"
            placeholder="e.g., safeviate"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
          />
           <p className="text-sm text-muted-foreground">
            A unique identifier for the tenant. Will be converted to lowercase and spaces to dashes.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tenant-name">Tenant Name</Label>
          <Input
            id="tenant-name"
            placeholder="e.g., Safeviate Inc."
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
          />
        </div>
        <Button onClick={handleAddTenant}>Add Tenant</Button>
      </CardContent>
    </Card>
  );
}
