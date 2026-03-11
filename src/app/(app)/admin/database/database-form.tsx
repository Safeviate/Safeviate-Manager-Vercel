
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
import { useFirestore } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { menuConfig, settingsMenuItem } from '@/lib/menu-config';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export function DatabaseForm() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // Menu visibility state for Safeviate (default all enabled)
  const allHrefs = useMemo(() => {
    const hrefs: string[] = [];
    const walk = (items: any[]) => {
        items.forEach(i => {
            hrefs.push(i.href);
            if (i.subItems) walk(i.subItems);
        });
    };
    walk([...menuConfig, settingsMenuItem]);
    return new Set(hrefs);
  }, []);

  const [enabledHrefs, setEnabledHrefs] = useState<Set<string>>(allHrefs);

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
      newEnabled.add(parentHref);
    }
    setEnabledHrefs(newEnabled);
  };

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
          enabledMenus: Array.from(enabledHrefs),
        },
        { merge: true }
      );

      toast({
        title: 'Database Action Initiated',
        description: 'The "Safeviate" tenant document is being created or updated with menu configuration.',
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

  const allMenus = useMemo(() => [...menuConfig, settingsMenuItem], []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Database Setup</CardTitle>
        <CardDescription>
          Create or update the "Safeviate" tenant document. You can also configure which features are enabled for this master tenant.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
            <h3 className="text-lg font-medium">Menu Visibility</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allMenus.map((menu) => {
                    const subHrefs = menu.subItems?.map(s => s.href) || [];
                    const isEnabled = enabledHrefs.has(menu.href);
                    
                    return (
                        <div key={menu.href} className="space-y-2 p-3 border rounded-md">
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`safe-menu-${menu.href}`} 
                                    checked={isEnabled}
                                    onCheckedChange={() => toggleMenu(menu.href, subHrefs)}
                                />
                                <Label htmlFor={`safe-menu-${menu.href}`} className="font-bold cursor-pointer">
                                    {menu.label}
                                </Label>
                            </div>
                            
                            {menu.subItems && (
                                <div className="pl-6 space-y-1">
                                    {menu.subItems.map((sub) => (
                                        <div key={sub.href} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={`safe-sub-${sub.href}`} 
                                                checked={enabledHrefs.has(sub.href)}
                                                onCheckedChange={() => toggleSubMenu(menu.href, sub.href)}
                                            />
                                            <Label htmlFor={`safe-sub-${sub.href}`} className="text-xs cursor-pointer">
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
        
        <Separator />
        
        <Button onClick={handleCreateTenant}>Save "Safeviate" Configuration</Button>
      </CardContent>
    </Card>
  );
}
