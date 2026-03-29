'use client';

import { useState, useMemo, useEffect } from 'react';
import { doc, collection } from 'firebase/firestore';
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
import { useFirestore, setDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { menuConfig } from '@/lib/menu-config';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useUserProfile } from '@/hooks/use-user-profile';
import { ArrowRightLeft, Building2, CheckCircle2, Pencil, PlusCircle, Save, Briefcase, Info } from 'lucide-react';
import type { Tenant, IndustryType } from '@/types/quality';

const DEFAULT_MAIN = { background: '#ebf5fb', primary: '#7cc4f7', 'primary-foreground': '#1e293b', accent: '#63b2a7' };
const TENANT_OVERRIDE_STORAGE_KEY = 'safeviate:selected-tenant';
const INDUSTRY_OVERRIDE_KEY = 'safeviate:industry-override';

const INDUSTRY_TYPES: IndustryType[] = [
  'Aviation: Flight Training (ATO)',
  'Aviation: Charter / Ops (AOC)',
  'Aviation: Maintenance (AMO)',
  'General: Occupational Health & Safety (OHS)'
];

export function DatabaseForm() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { tenantId: activeTenantId, userProfile } = useUserProfile();
  
  const tenantsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'tenants') : null),
    [firestore]
  );
  const { data: tenants, isLoading: isLoadingTenants } = useCollection<Tenant>(tenantsQuery);

  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState('');
  const [industry, setIndustry] = useState<IndustryType>('Aviation: Flight Training (ATO)');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [localIndustryOverride, setLocalIndustryOverride] = useState<IndustryType | 'none'>('none');
  
  const [mainTheme, setMainTheme] = useState(DEFAULT_MAIN);
  const [enabledHrefs, setEnabledHrefs] = useState<Set<string>>(new Set());

  const isDeveloperMode = userProfile?.role?.toLowerCase() === 'dev' || userProfile?.role?.toLowerCase() === 'developer' || userProfile?.id === 'DEVELOPER_MODE';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(INDUSTRY_OVERRIDE_KEY);
      setLocalIndustryOverride((stored as IndustryType) || 'none');
    }
  }, []);

  const handleIndustryOverrideChange = (val: IndustryType | 'none') => {
    setLocalIndustryOverride(val);
    if (typeof window !== 'undefined') {
      if (val === 'none') {
        window.localStorage.removeItem(INDUSTRY_OVERRIDE_KEY);
      } else {
        window.localStorage.setItem(INDUSTRY_OVERRIDE_KEY, val);
      }
      window.dispatchEvent(new Event('safeviate-industry-switch'));
      toast({ 
        title: 'Industry View Overridden', 
        description: `Your local UI now simulates ${val === 'none' ? 'the organization setting' : val}.` 
      });
    }
  };

  const sortedTenants = useMemo(() => {
    if (!tenants) return [];
    return [...tenants].sort((a, b) => a.name.localeCompare(b.name));
  }, [tenants]);

  const handleLoadTenant = (tenantId: string) => {
    const t = tenants?.find(tenant => tenant.id === tenantId);
    if (!t) return;

    setSelectedTenantId(t.id);
    setTenantName(t.name);
    setIndustry(t.industry || 'Aviation: Flight Training (ATO)');
    setLogoPreview(t.logoUrl || null);
    setMainTheme(t.theme?.main || { 
        ...DEFAULT_MAIN, 
        primary: t.theme?.primaryColour || DEFAULT_MAIN.primary, 
        background: t.theme?.backgroundColour || DEFAULT_MAIN.background,
        accent: t.theme?.accentColour || DEFAULT_MAIN.accent 
    });
    setEnabledHrefs(new Set(t.enabledMenus || []));

    toast({ title: 'Tenant Loaded', description: `Configuration for "${t.name}" is ready for editing.` });
  };

  const handleIndustryChange = (newIndustry: IndustryType) => {
    setIndustry(newIndustry);
    
    // Auto-pre-configure menus based on industry logic
    const newEnabled = new Set<string>();
    const walk = (items: any[]) => {
        items.forEach(i => {
            const isAviationOnly = i.href.includes('/bookings') || i.href.includes('/assets/aircraft') || i.href.includes('/admin/mb-config');
            const isATOOnly = i.href.includes('/training/student-progress');
            
            let shouldAdd = true;
            if (newIndustry === 'General: Occupational Health & Safety (OHS)' && isAviationOnly) shouldAdd = false;
            if (newIndustry !== 'Aviation: Flight Training (ATO)' && isATOOnly) shouldAdd = false;

            if (shouldAdd) {
                newEnabled.add(i.href);
                if (i.subItems) walk(i.subItems);
            }
        });
    };
    walk(menuConfig);
    setEnabledHrefs(newEnabled);
    toast({ title: 'Industry Presets Applied', description: `Authorized modules have been adjusted for ${newIndustry}.` });
  };

  const handleSwitchTenant = (tenant: Tenant) => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(TENANT_OVERRIDE_STORAGE_KEY, tenant.id);
    window.dispatchEvent(new Event('safeviate-tenant-switch'));

    toast({
      title: 'Company Switched',
      description: `"${tenant.name}" is now the active company for developer view.`,
    });
  };

  const handleClearForm = () => {
    setSelectedTenantId(null);
    setTenantName('');
    setIndustry('Aviation: Flight Training (ATO)');
    setLogoPreview(null);
    setMainTheme(DEFAULT_MAIN);
    setEnabledHrefs(new Set());
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
      newEnabled.add(parentHref);
    }
    setEnabledHrefs(newEnabled);
  };

  const handleSaveTenant = () => {
    if (!tenantName) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide a Tenant Name.' });
      return;
    }
    
    const tenantId = selectedTenantId || tenantName.toLowerCase().replace(/\s+/g, '-');

    try {
      const tenantRef = doc(firestore, 'tenants', tenantId);
      
      setDocumentNonBlocking(
        tenantRef,
        {
          id: tenantId,
          name: tenantName,
          industry: industry,
          logoUrl: logoPreview || '',
          theme: {
            primaryColour: mainTheme.primary,
            backgroundColour: mainTheme.background,
            accentColour: mainTheme.accent,
            main: mainTheme,
          },
          enabledMenus: Array.from(enabledHrefs),
        },
        { merge: true }
      );
      
      toast({
        title: selectedTenantId ? 'Tenant Updated' : 'Tenant Created',
        description: `"${tenantName}" has been successfully saved.`,
      });

      if (!selectedTenantId) handleClearForm();

    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'There was a problem saving the tenant.' });
    }
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-none border">
      <CardHeader className="shrink-0 border-b bg-muted/5">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle>Tenant Manager</CardTitle>
                <CardDescription>Manage authorized features and branding for any organization on the system.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearForm}><PlusCircle className="mr-2 h-4 w-4" /> New Tenant</Button>
        </div>
      </CardHeader>
      
      <div className="p-6 pb-0 border-b bg-muted/10">
          <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
              <div className="space-y-2 flex-1">
                  <Label>Load Existing Tenant</Label>
                  <Select onValueChange={handleLoadTenant} value={selectedTenantId || undefined}>
                      <SelectTrigger><SelectValue placeholder={isLoadingTenants ? "Loading..." : "Choose a tenant..."} /></SelectTrigger>
                      <SelectContent>
                          {(tenants || []).map(t => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                      </SelectContent>
                  </Select>
              </div>
              <div className="space-y-2 flex-1">
                  <Label htmlFor="tenant-name">Tenant Name</Label>
                  <Input id="tenant-name" placeholder="e.g., Safeviate Inc." value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
              </div>
              <div className="space-y-2 flex-1">
                  <Label className="flex items-center gap-2">
                    <Briefcase className="h-3.5 w-3.5 text-primary" />
                    Industry Profile
                  </Label>
                  <Select onValueChange={(v) => handleIndustryChange(v as IndustryType)} value={industry}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                          {INDUSTRY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
          </div>

          <div className="mb-6 space-y-3 rounded-lg border bg-background p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                      <h3 className="text-sm font-black uppercase tracking-tight text-primary flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Active Organizations
                      </h3>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase italic">Switch between tenants or simulate layouts for developer review.</p>
                  </div>
                  <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1.5 h-7 text-[10px] font-black uppercase">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          Active: {(sortedTenants.find((tenant) => tenant.id === activeTenantId)?.name) || activeTenantId || 'None'}
                      </Badge>
                  </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {/* --- REAL TENANT SWITCHER --- */}
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Persisted Organizations</Label>
                    <div className="grid grid-cols-1 gap-2">
                        {sortedTenants.length === 0 ? (
                            <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground text-center">
                                No organizations found.
                            </div>
                        ) : (
                            sortedTenants.map((tenant) => {
                                const isActiveTenant = tenant.id === activeTenantId;
                                return (
                                    <div key={tenant.id} className={cn("flex items-center justify-between p-3 rounded-lg border bg-background transition-colors shadow-sm", isActiveTenant ? "border-primary ring-1 ring-primary/20" : "hover:border-slate-300")}>
                                        <div className="min-w-0">
                                            <p className="font-black text-xs uppercase truncate">{tenant.name}</p>
                                            <p className="text-[9px] text-muted-foreground uppercase">{tenant.industry || 'Standard'}</p>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <Button type="button" variant="outline" size="compact" onClick={() => handleLoadTenant(tenant.id)} className="h-7"><Pencil className="h-3 w-3 mr-1" /> Load</Button>
                                            <Button
                                                type="button"
                                                size="compact"
                                                variant={isActiveTenant ? 'secondary' : 'default'}
                                                onClick={() => handleSwitchTenant(tenant)}
                                                disabled={!isDeveloperMode || isActiveTenant}
                                                className="h-7"
                                            >
                                                {isActiveTenant ? 'ACTIVE' : 'SWITCH'}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                  </div>

                  {/* --- LOCAL INDUSTRY OVERRIDE --- */}
                  <div className="space-y-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                    <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-amber-600" />
                        <Label className="text-[10px] font-black uppercase tracking-widest text-amber-800">UI Layout Switcher (Simulation)</Label>
                    </div>
                    <p className="text-[10px] text-amber-700/70 font-medium leading-relaxed">
                        Use this to test the dynamic layout changes between industries without altering the database.
                    </p>
                    <Select onValueChange={(v) => handleIndustryOverrideChange(v as any)} value={localIndustryOverride}>
                        <SelectTrigger className="h-10 bg-background border-amber-500/30">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Default (From Database)</SelectItem>
                            {INDUSTRY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {localIndustryOverride !== 'none' && (
                        <Badge variant="outline" className="w-full justify-center border-amber-500/40 text-amber-700 bg-white text-[9px] font-black uppercase py-1">
                            Simulation Mode: {localIndustryOverride}
                        </Badge>
                    )}
                  </div>
              </div>
          </div>
      </div>

      <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-10">
            {/* --- Menu Config Section --- */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold">Authorized Navigation</h3>
                <p className="text-sm text-muted-foreground">Select the application modules visible to this tenant.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {menuConfig.map((menu) => {
                        const subHrefs = menu.subItems?.map(s => s.href) || [];
                        const isEnabled = enabledHrefs.has(menu.href);
                        return (
                            <div key={menu.href} className="space-y-3 p-4 border rounded-lg bg-muted/10">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id={`menu-${menu.href}`} checked={isEnabled} onCheckedChange={() => toggleMenu(menu.href, subHrefs)} />
                                    <Label htmlFor={`menu-${menu.href}`} className="font-bold flex items-center gap-2 cursor-pointer">
                                        <menu.icon className="h-4 w-4" /> {menu.label}
                                    </Label>
                                </div>
                                {menu.subItems && (
                                    <div className="pl-6 space-y-2 pt-2 border-l ml-2">
                                        {menu.subItems.map((sub) => (
                                            <div key={sub.href} className="flex items-center space-x-2">
                                                <Checkbox id={`sub-${sub.href}`} checked={enabledHrefs.has(sub.href)} onCheckedChange={() => toggleSubMenu(menu.href, sub.href)} />
                                                <Label htmlFor={`sub-${sub.href}`} className="text-xs cursor-pointer">{sub.label}</Label>
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
          <Button onClick={handleSaveTenant} size="lg" className="w-48 shadow-lg">
              {selectedTenantId ? <><Save className="mr-2 h-4 w-4" /> Update Tenant</> : <><PlusCircle className="mr-2 h-4 w-4" /> Create Tenant</>}
          </Button>
      </div>
    </Card>
  );
}
