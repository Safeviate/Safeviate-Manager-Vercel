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
import { Separator } from '@/components/ui/separator';

export function DatabaseForm() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [primaryColour, setPrimaryColour] = useState('#7cc4f7');
  const [backgroundColour, setBackgroundColour] = useState('#ebf5fb');
  const [accentColour, setAccentColour] = useState('#63b2a7');

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogo(e.target.files[0]);
    }
  };

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

      // In a real app, you would upload the logo to Firebase Storage
      // and get a download URL. For now, we'll use a placeholder.
      const logoUrl = logo ? URL.createObjectURL(logo) : '';

      setDocumentNonBlocking(
        tenantRef,
        {
          id: tenantId,
          name: tenantName,
          logoUrl: logoUrl,
          theme: {
            primaryColour,
            backgroundColour,
            accentColour,
          },
        },
        { merge: true }
      );

      toast({
        title: 'Tenant Creation Initiated',
        description: `The "${tenantName}" tenant document is being created.`,
      });

      // Reset form
      setTenantId('');
      setTenantName('');
      setLogo(null);
      setPrimaryColour('#7cc4f7');
      setBackgroundColour('#ebf5fb');
      setAccentColour('#63b2a7');
      // Manually reset file input
      const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

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
          Add new tenants to the Firestore database with their branding.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
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
        </div>

        <Separator />
        
        <div className="space-y-4">
            <h3 className="text-lg font-medium">Branding</h3>
            <div className="space-y-2">
                <Label htmlFor="logo-upload">Company Logo</Label>
                <Input id="logo-upload" type="file" onChange={handleLogoChange} accept="image/*" />
                 {logo && <p className="text-sm text-muted-foreground">Selected: {logo.name}</p>}
            </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <Input id="primary-color" type="color" value={primaryColour} onChange={(e) => setPrimaryColour(e.target.value)} className='p-1 h-10' />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="background-color">Background Color</Label>
                    <Input id="background-color" type="color" value={backgroundColour} onChange={(e) => setBackgroundColour(e.target.value)} className='p-1 h-10' />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="accent-color">Accent Color</Label>
                    <Input id="accent-color" type="color" value={accentColour} onChange={(e) => setAccentColour(e.target.value)} className='p-1 h-10' />
                </div>
            </div>
        </div>
        
        <Separator />

        <Button onClick={handleAddTenant} size="lg">Add Tenant</Button>
      </CardContent>
    </Card>
  );
}

    