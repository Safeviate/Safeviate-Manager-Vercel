'use client';

import { useState, useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, setDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { menuConfig } from '@/lib/menu-config';
import { useTenantConfig } from '@/hooks/use-tenant-config';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, LayoutGrid, Info } from 'lucide-react';
import type { TabVisibilitySettings } from '../external/page';

const PAGE_OPTIONS = [
  { id: 'audits', label: 'Quality Audits' },
  { id: 'safety-reports', label: 'Safety Reports' },
  { id: 'risk-register', label: 'Risk Register' },
  { id: 'safety-indicators', label: 'Safety Indicators' },
  { id: 'moc', label: 'Management of Change' },
  { id: 'task-tracker', label: 'Task Tracker' },
  { id: 'coherence-matrix', label: 'Coherence Matrix' },
  { id: 'aircraft', label: 'Aircraft Management' },
];

export function VisibilityManager() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { tenant, isLoading: isLoadingTenant } = useTenantConfig();
  const tenantId = 'safeviate';

  const visibilitySettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/settings`, 'tab-visibility') : null),
    [firestore, tenantId]
  );
  const { data: tabSettings, isLoading: isLoadingTabs } = useDoc<TabVisibilitySettings>(visibilitySettingsRef);

  // --- Module Access Logic ---
  const [enabledHrefs, setEnabledHrefs] = useState<Set<string>>(new Set());

  useMemo(() => {
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
    toast({ title: 'Module Access Updated' });
  };

  // --- Tab Visibility Logic ---
  const handleToggleTab = (pageId: string, enabled: boolean) => {
    if (!firestore || !visibilitySettingsRef) return;
    const newVisibilities = { ...(tabSettings?.visibilities || {}), [pageId]: enabled };
    setDocumentNonBlocking(visibilitySettingsRef, { id: 'tab-visibility', visibilities: newVisibilities }, { merge: true });
    toast({ title: 'Tab Preference Saved' });
  };

  if (isLoadingTenant || isLoadingTabs) {
    return <div className="space-y-6"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-10">
      {/* SECTION 1: SIDEBAR MODULES */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              Module Access Control
            </h3>
            <p className="text-sm text-muted-foreground">Select which functional modules are enabled for the organization sidebar.</p>
          </div>
          <Button onClick={handleSaveModules}>Apply Module Changes</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuConfig.map((menu) => {
            if (menu.label === 'Admin' || menu.label === 'Development') return null;
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
                    {menu.subItems.map((sub) => (
                      <div key={sub.href} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`submod-${sub.href}`} 
                          checked={enabledHrefs.has(sub.href)}
                          onCheckedChange={() => toggleSubMenu(menu.href, sub.href)}
                        />
                        <Label htmlFor={`submod-${sub.href}`} className="text-xs text-muted-foreground cursor-pointer">
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
      </section>

      <Separator />

      {/* SECTION 2: PAGE TABS */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Page Tab Contexts
          </h3>
          <p className="text-sm text-muted-foreground">Enable or disable the top-level organization switcher tabs for specific modules.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PAGE_OPTIONS.map((page) => (
            <div key={page.id} className="flex items-center justify-between p-4 border rounded-xl bg-muted/10">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">{page.label}</Label>
                <p className="text-xs text-muted-foreground italic">Show company context tabs on this page.</p>
              </div>
              <Switch 
                checked={tabSettings?.visibilities?.[page.id] ?? true} 
                onCheckedChange={(val) => handleToggleTab(page.id, val)}
              />
            </div>
          ))}
        </div>

        <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-3">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">
            <strong>Note:</strong> Disabling a tab does not remove data access. It simply simplifies the UI for administrators who only manage internal organization data.
          </p>
        </div>
      </section>
    </div>
  );
}