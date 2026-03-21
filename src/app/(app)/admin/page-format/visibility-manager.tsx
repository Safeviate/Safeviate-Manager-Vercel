'use client';

import { useState, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, setDocumentNonBlocking } from '@/firebase';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { menuConfig } from '@/lib/menu-config';
import { useTenantConfig } from '@/hooks/use-tenant-config';
import { Skeleton } from '@/components/ui/skeleton';
import { LayoutGrid } from 'lucide-react';

export function VisibilityManager() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { tenant, isLoading: isLoadingTenant } = useTenantConfig();
  const tenantId = 'safeviate';

  // --- Module Access Logic ---
  const [enabledHrefs, setEnabledHrefs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (tenant?.enabledMenus) {
      setEnabledHrefs(new Set(tenant.enabledMenus));
    }
  }, [tenant]);

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

  const handleSaveModules = () => {
    if (!firestore) return;
    const tenantRef = doc(firestore, 'tenants', tenantId);
    setDocumentNonBlocking(tenantRef, { enabledMenus: Array.from(enabledHrefs) }, { merge: true });
    toast({ title: 'Module Access Updated', description: 'Sidebar navigation settings have been saved.' });
  };

  if (isLoadingTenant) {
    return <div className="space-y-6"><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              Module Access Control
            </h3>
            <p className="text-sm text-muted-foreground">Select which functional modules are enabled for the organization sidebar. Includes Admin and Development menus.</p>
          </div>
          <Button onClick={handleSaveModules}>Apply Module Changes</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuConfig.map((menu) => {
            const subHrefs = menu.subItems?.map(s => s.href) || [];
            const isEnabled = enabledHrefs.has(menu.href);
            
            return (
              <div key={menu.href} className="p-4 border rounded-xl bg-muted/10 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id={`mod-${menu.href}`} 
                    checked={isEnabled}
                    onCheckedChange={() => toggleMenu(menu.href, subHrefs)}
                  />
                  <Label htmlFor={`mod-${menu.href}`} className="font-bold flex items-center gap-2 cursor-pointer">
                    <menu.icon className="h-4 w-4 text-primary" />
                    {menu.label}
                  </Label>
                </div>
                {menu.subItems && (
                  <div className="pl-6 space-y-2 border-l ml-2">
                    {menu.subItems.map((sub) => {
                      const isSubEnabled = enabledHrefs.has(sub.href);
                      return (
                        <div key={sub.href} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`submod-${sub.href}`} 
                            checked={isSubEnabled}
                            onCheckedChange={() => toggleSubMenu(menu.href, sub.href)}
                          />
                          <Label htmlFor={`submod-${sub.href}`} className="text-xs text-muted-foreground cursor-pointer">
                            {sub.label}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
