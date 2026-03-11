'use client';

import { useState, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { menuConfig, settingsMenuItem } from '@/lib/menu-config';
import { ScrollArea } from '@/components/ui/scroll-area';

export function DatabaseForm() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [tenantName, setTenantName] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [primaryColour, setPrimaryColour] = useState('#7cc4f7');
  const [backgroundColour, setBackgroundColour] = useState('#ebf5fb');
  const [accentColour, setAccentColour] = useState('#63b2a7');
  
  // Menu visibility state
  const [enabledHrefs, setEnabledHrefs] = useState<Set<string>>(new Set());

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogo(e.target.files[0]);
    }
  };

  const toggleMenu = (href: string, subHrefs?: string[]) => {
    const newEnabled = new Set(enabledHrefs);
    if (newEnabled.has(href)) {
      newEnabled.delete(href);
      subHrefs?.forEach(sh => newEnabled.delete(sh));
    } else {
      newEnabled.add(href);
      subHrefs?.forEach(sh => newEnabled.add(sh));
    }
    setEnabledHrefs(newEnabled);
  };

  const toggleSubMenu = (parentHref: string, href: string) => {
    const newEnabled = new Set(enabledHrefs);
    if (newEnabled.has(href)) {
      newEnabled.delete(href);
    } else {
      newEnabled.add(href);
      newEnabled.add(parentHref); // Ensure parent is enabled if child is
    }
    setEnabledHrefs(newEnabled);
  };

  const handleAddTenant = () => {
    if (!tenantName) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide a Tenant Name.',
      });
      return;
    }
    
    const tenantId = tenantName.toLowerCase().replace(/\s+/g, '-');

    try {
      const tenantRef = doc(firestore, 'tenants', tenantId);
      const settingsRef = doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry');

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
          enabledMenus: Array.from(enabledHrefs),
        },
        { merge: true }
      );
      
      setDocumentNonBlocking(
        settingsRef,
        {
          id: 'document-expiry',
          warningPeriods: [30, 60, 90],
        },
        { merge: true }
      );

      toast({
        title: 'Tenant Created',
        description: `The "${tenantName}" tenant has been created with custom menu visibility.`,
      });

      // Reset form
      setTenantName('');
      setLogo(null);
      setEnabledHrefs(new Set());
      const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (e: any) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: e.message || 'There was a problem creating the tenant.',
      });
    }
  };

  const allMenus = useMemo(() => [...menuConfig, settingsMenuItem], []);

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-none border">
      <CardHeader className="shrink-0 border-b bg-muted/5">
        <CardTitle>Tenant Management</CardTitle>
        <CardDescription>
          Add new tenants with custom branding and granular control over which menus are visible.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-8">
            <div className="space-y-4">
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

            <div className="space-y-4">
                <h3 className="text-lg font-medium">Menu Configuration</h3>
                <p className="text-sm text-muted-foreground">Select the menus and submenus that should be visible for this tenant.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {allMenus.map((menu) => {
                        const subHrefs = menu.subItems?.map(s => s.href) || [];
                        const isEnabled = enabledHrefs.has(menu.href);
                        
                        return (
                            <div key={menu.href} className="space-y-3 p-4 border rounded-lg bg-muted/10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`menu-${menu.href}`} 
                                            checked={isEnabled}
                                            onCheckedChange={() => toggleMenu(menu.href, subHrefs)}
                                        />
                                        <Label htmlFor={`menu-${menu.href}`} className="font-bold flex items-center gap-2 cursor-pointer">
                                            <menu.icon className="h-4 w-4" />
                                            {menu.label}
                                        </Label>
                                    </div>
                                </div>
                                
                                {menu.subItems && (
                                    <div className="pl-6 space-y-2 pt-2 border-l ml-2">
                                        {menu.subItems.map((sub) => (
                                            <div key={sub.href} className="flex items-center space-x-2">
                                                <Checkbox 
                                                    id={`sub-${sub.href}`} 
                                                    checked={enabledHrefs.has(sub.href)}
                                                    onCheckedChange={() => toggleSubMenu(menu.href, sub.href)}
                                                />
                                                <Label htmlFor={`sub-${sub.href}`} className="text-xs cursor-pointer">
                                                    {sub.label}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
      <Separator />
      <div className="shrink-0 p-6 flex justify-end">
          <Button onClick={handleAddTenant} size="lg">Create Tenant</Button>
      </div>
    </Card>
  );
}
