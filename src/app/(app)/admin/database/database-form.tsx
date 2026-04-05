'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { menuConfig } from '@/lib/menu-config';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export function DatabaseForm() {
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
    walk(menuConfig);
    return new Set(hrefs);
  }, []);

  const [enabledHrefs, setEnabledHrefs] = useState<Set<string>>(allHrefs);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/tenant-config', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        const config = payload?.config && typeof payload.config === 'object' ? payload.config : {};
        if (!cancelled && Array.isArray((config as any).enabledMenus)) {
          setEnabledHrefs(new Set((config as any).enabledMenus));
        }
      } catch (e) {
        console.error("Failed to parse tenant config", e);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleMenu = (href: string, subHrefs?: string[]) => {
    const newEnabled = new Set(enabledHrefs);
    if (newEnabled.has(href)) {
      newEnabled.delete(href);
      subHrefs?.forEach(sh => newEnabled.delete(sh));
    } else {
      newEnabled.add(href);
      subHrefs?.forEach(sh => addHrefs(sh, newEnabled));
    }
    setEnabledHrefs(newEnabled);
  };

  const addHrefs = (href: string, set: Set<string>) => {
      set.add(href);
  }

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

  const handleCreateTenant = async () => {
    try {
      const response = await fetch('/api/tenant-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { enabledMenus: Array.from(enabledHrefs) } }),
      });
      if (!response.ok) {
        throw new Error('Failed to save configuration.');
      }

      toast({
        title: 'Setup Updated',
        description: 'Organization branding and menu configurations have been saved.',
      });
    } catch (e: any) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: e.message || 'There was a problem saving the configuration.',
      });
    }
  };

  return (
    <Card className="rounded-3xl border-2 shadow-none overflow-hidden">
      <CardHeader className="bg-muted/5 border-b p-8">
        <CardTitle className="text-2xl font-black uppercase tracking-tight">Permission Management</CardTitle>
        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Manage the primary organization profile and control which functional modules are enabled for your portal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 p-8">
        <div className="space-y-6">
            <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-tight">Module Access Control</h3>
                <p className="text-xs text-muted-foreground">Select the sections of the application that should be visible to your organization members.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {menuConfig.map((menu) => {
                    const subHrefs = menu.subItems?.map(s => s.href) || [];
                    const isEnabled = enabledHrefs.has(menu.href);
                    
                    return (
                        <div key={menu.href} className="space-y-4 p-4 border-2 rounded-2xl bg-muted/5 transition-all hover:bg-muted/10">
                            <div className="flex items-center space-x-3">
                                <Checkbox 
                                    id={`safe-menu-${menu.href}`} 
                                    checked={isEnabled}
                                    onCheckedChange={() => toggleMenu(menu.href, subHrefs)}
                                    className="h-5 w-5 border-2 rounded-md"
                                />
                                <Label htmlFor={`safe-menu-${menu.href}`} className="text-xs font-black uppercase tracking-widest cursor-pointer flex items-center gap-2">
                                    <menu.icon className="h-4 w-4 text-primary" />
                                    {menu.label}
                                </Label>
                            </div>
                            
                            {menu.subItems && (
                                <div className="pl-8 space-y-2 pt-1 border-l-2 ml-2.5">
                                    {menu.subItems.map((sub) => (
                                        <div key={sub.href} className="flex items-center space-x-3">
                                            <Checkbox 
                                                id={`safe-sub-${sub.href}`} 
                                                checked={enabledHrefs.has(sub.href)}
                                                onCheckedChange={() => toggleSubMenu(menu.href, sub.href)}
                                                className="h-4 w-4 border-2 rounded-sm"
                                            />
                                            <Label htmlFor={`safe-sub-${sub.href}`} className="text-[11px] font-bold uppercase tracking-tight cursor-pointer text-muted-foreground">
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
        
        <div className="flex justify-end pt-4">
            <Button onClick={handleCreateTenant} className="h-12 px-12 text-[10px] font-black uppercase shadow-lg">Save Authorization Pattern</Button>
        </div>
      </CardContent>
    </Card>
  );
}
