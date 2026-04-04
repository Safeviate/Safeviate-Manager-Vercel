'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { menuConfig } from '@/lib/menu-config';
import { useTenantConfig } from '@/hooks/use-tenant-config';
import { Skeleton } from '@/components/ui/skeleton';
import { LayoutGrid } from 'lucide-react';

export function VisibilityManager() {
  const { toast } = useToast();
  const { tenant, isLoading: isLoadingTenant } = useTenantConfig();
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
    try {
        const stored = localStorage.getItem('safeviate.tenant-config');
        const currentTenant = stored ? JSON.parse(stored) : { id: 'safeviate', name: 'Safeviate' };
        
        const updatedTenant = { 
            ...currentTenant, 
            enabledMenus: Array.from(enabledHrefs) 
        };
        
        localStorage.setItem('safeviate.tenant-config', JSON.stringify(updatedTenant));
        window.dispatchEvent(new Event('safeviate-tenant-config-updated'));
        
        toast({ title: 'Module Access Updated', description: 'Sidebar navigation settings have been saved.' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save module settings.' });
    }
  };

  if (isLoadingTenant) {
    return <div className="space-y-6"><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-10">
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2 text-foreground">
              <LayoutGrid className="h-4 w-4 text-primary" />
              Module Access Control
            </h3>
            <p className="text-xs text-muted-foreground italic">Select functional modules enabled for the organization sidebar.</p>
          </div>
          <Button onClick={handleSaveModules} className="text-[10px] font-black uppercase h-9 px-6 shadow-md">Apply Changes</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuConfig.map((menu) => {
            const subHrefs = menu.subItems?.map(s => s.href) || [];
            const isEnabled = enabledHrefs.has(menu.href);
            
            return (
              <div key={menu.href} className="p-5 border rounded-2xl bg-muted/5 space-y-4 shadow-sm border-slate-200">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id={`mod-${menu.href}`} 
                    checked={isEnabled}
                    onCheckedChange={() => toggleMenu(menu.href, subHrefs)}
                    className="h-5 w-5"
                  />
                  <Label htmlFor={`mod-${menu.href}`} className="text-xs font-black uppercase tracking-tight flex items-center gap-2 cursor-pointer text-foreground">
                    <menu.icon className="h-4 w-4 text-primary opacity-70" />
                    {menu.label}
                  </Label>
                </div>
                {menu.subItems && (
                  <div className="pl-8 space-y-2.5 border-l-2 ml-2.5 border-primary/10">
                    {menu.subItems.map((sub) => {
                      const isSubEnabled = enabledHrefs.has(sub.href);
                      return (
                        <div key={sub.href} className="flex items-center space-x-3">
                          <Checkbox 
                            id={`submod-${sub.href}`} 
                            checked={isSubEnabled}
                            onCheckedChange={() => toggleSubMenu(menu.href, sub.href)}
                            className="h-4 w-4"
                          />
                          <Label htmlFor={`submod-${sub.href}`} className="text-[11px] font-bold text-muted-foreground cursor-pointer hover:text-foreground transition-colors uppercase">
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
