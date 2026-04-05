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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { menuConfig } from '@/lib/menu-config';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useUserProfile } from '@/hooks/use-user-profile';
import { 
    Building2, 
    CheckCircle2, 
    PlusCircle, 
    Save, 
    Briefcase, 
    MonitorSmartphone,
    ShieldCheck,
    LayoutDashboard,
    ArrowRightLeft,
    ChevronRight,
    Users
} from 'lucide-react';
import type { Tenant, IndustryType } from '@/types/quality';
import { cn } from '@/lib/utils';

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
  const { toast } = useToast();
  const { tenantId: activeTenantId, userProfile } = useUserProfile();
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(true);

  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState('');
  const [industry, setIndustry] = useState<IndustryType>('Aviation: Flight Training (ATO)');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [localIndustryOverride, setLocalIndustryOverride] = useState<string>('');
  
  const [mainTheme, setMainTheme] = useState(DEFAULT_MAIN);
  const [enabledHrefs, setEnabledHrefs] = useState<Set<string>>(new Set());

  // Load Tenants from LocalStorage
  useEffect(() => {
    const loadTenants = () => {
        fetch('/api/tenants', { cache: 'no-store' })
          .then((response) => response.json())
          .then((payload) => {
            const rows = Array.isArray(payload?.tenants) ? payload.tenants : [];
            if (rows.length > 0) {
              setTenants(rows as Tenant[]);
            } else {
              const initial: Tenant[] = [{
                id: 'safeviate',
                name: 'Safeviate Standard',
                industry: 'Aviation: Flight Training (ATO)',
                enabledMenus: menuConfig.map(m => m.href),
                theme: {
                  primaryColour: DEFAULT_MAIN.primary,
                  backgroundColour: DEFAULT_MAIN.background,
                  accentColour: DEFAULT_MAIN.accent,
                  main: DEFAULT_MAIN
                }
              }];
              setTenants(initial);
            }
          })
          .catch((e) => console.error('Failed to load tenants', e))
          .finally(() => setIsLoadingTenants(false));
    };

    loadTenants();
    
    if (typeof window !== 'undefined') {
        setLocalIndustryOverride(window.localStorage.getItem(INDUSTRY_OVERRIDE_KEY) || 'none');
    }

    const handleUpdate = () => loadTenants();
    window.addEventListener('safeviate-tenants-updated', handleUpdate);
    return () => window.removeEventListener('safeviate-tenants-updated', handleUpdate);
  }, []);

  const sortedTenants = useMemo(() => {
    return [...tenants].sort((a, b) => a.name.localeCompare(b.name));
  }, [tenants]);

  const handleLoadTenant = (tenantId: string) => {
    const t = tenants.find(tenant => tenant.id === tenantId);
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

    toast({ title: 'System Context Loaded', description: `Configuration for "${t.name}" inherited.` });
  };

  const handleIndustryChange = (newIndustry: IndustryType) => {
    setIndustry(newIndustry);
    
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
    toast({ title: 'Logic Presets Calibrated', description: `Module permissions synthesized for ${newIndustry}.` });
  };

  const handleApplyIndustryOverride = (val: string) => {
    if (typeof window === 'undefined') return;
    setLocalIndustryOverride(val);
    if (val === 'none') {
        window.localStorage.removeItem(INDUSTRY_OVERRIDE_KEY);
    } else {
        window.localStorage.setItem(INDUSTRY_OVERRIDE_KEY, val);
    }
    window.dispatchEvent(new Event('safeviate-industry-switch'));
    toast({ title: 'Simulation Parameter Set', description: `Interface synchronized to ${val === 'none' ? 'Registry Default' : val}.` });
  };

  const handleSwitchTenant = (tenant: Tenant) => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(TENANT_OVERRIDE_STORAGE_KEY, tenant.id);
    window.dispatchEvent(new Event('safeviate-tenant-switch'));

    toast({
      title: 'Active Context Shifted',
      description: `Terminal established as "${tenant.name}".`,
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

  const handleSaveTenant = async () => {
    if (!tenantName) {
      toast({ variant: 'destructive', title: 'Invalid Operation', description: 'Registry Name is mandatory.' });
      return;
    }
    
    const tenantId = selectedTenantId || tenantName.toLowerCase().replace(/\s+/g, '-');

    try {
      const nextTenants = [...tenants];
      const index = nextTenants.findIndex(t => t.id === tenantId);
      
      const tenantData: Tenant = {
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
      };

      if (index >= 0) {
          nextTenants[index] = tenantData;
      } else {
          nextTenants.push(tenantData);
      }

      await Promise.all(nextTenants.map((tenant) => fetch('/api/tenants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant }),
      })));
      window.dispatchEvent(new Event('safeviate-tenants-updated'));
      
      toast({
        title: selectedTenantId ? 'Registry Entry Updated' : 'Registry Entry Generated',
        description: `"${tenantName}" is now persistent in the database.`,
      });

      if (!selectedTenantId) handleClearForm();

    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Commit Failure', description: e.message || 'System fault during persistence.' });
    }
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden border-0 shadow-2xl rounded-3xl bg-background">
      <CardHeader className="shrink-0 border-b p-8 bg-muted/5 relative overflow-hidden">
        <div className="absolute right-0 top-0 p-8 opacity-5">
            <Building2 className="h-32 w-32 rotate-12" />
        </div>
        <div className="flex items-center justify-between relative z-10">
            <div className="space-y-4 text-left">
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-primary border-primary/30 bg-primary/5 px-4 h-7 tracking-widest">
                    <ShieldCheck className="h-3.5 w-3.5 mr-2" />
                    Corporate Registry Admin
                </Badge>
                <div>
                    <CardTitle className="text-4xl font-black uppercase tracking-tighter leading-none">Axiom Registry Console</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2 opacity-70">
                        Synthesize organization profiles and parameterize logic distribution.
                    </CardDescription>
                </div>
            </div>
            <Button onClick={handleClearForm} className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
              <PlusCircle className="mr-3 h-5 w-5" /> Initialize Profile
            </Button>
        </div>
      </CardHeader>
      
      <div className="p-8 pb-4 border-b bg-muted/10 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                  <div className="space-y-2.5 text-left">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Inherit Registry Entry</Label>
                      <Select onValueChange={handleLoadTenant} value={selectedTenantId || undefined}>
                          <SelectTrigger className="h-12 border-2 rounded-xl font-bold uppercase text-xs bg-background shadow-sm hover:border-primary/50 transition-colors">
                            <SelectValue placeholder={isLoadingTenants ? "Accessing Core..." : "Choose Profile..."} />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-2">
                              {sortedTenants.map(t => (<SelectItem key={t.id} value={t.id} className="font-bold uppercase text-[10px]">{t.name}</SelectItem>))}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2.5 text-left">
                      <Label htmlFor="tenant-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Registry Label</Label>
                      <Input id="tenant-name" placeholder="Safeviate Aviation" className="h-12 border-2 rounded-xl font-black uppercase tracking-tight text-sm focus-visible:ring-primary/20" value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
                  </div>
                  <div className="space-y-2.5 text-left col-span-full">
                      <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                        <Briefcase className="h-3.5 w-3.5 text-primary" />
                        Industry Logic Profile
                      </Label>
                      <Select onValueChange={(v) => handleIndustryChange(v as IndustryType)} value={industry}>
                          <SelectTrigger className="h-14 border-2 rounded-xl font-black uppercase tracking-tight text-sm bg-background shadow-md">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-2">
                              {INDUSTRY_TYPES.map(t => <SelectItem key={t} value={t} className="font-black uppercase text-xs">{t}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
              </div>
          </div>

          <div className="space-y-6">
              <div className="rounded-3xl border-2 bg-background p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <LayoutDashboard className="h-20 w-20" />
                  </div>
                  <div className="flex flex-col gap-2 relative z-10 text-left">
                      <div>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-1">
                            <MonitorSmartphone className="h-4 w-4" />
                            Interface Vector Simulation
                          </h3>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-50">Local override for aesthetic validation.</p>
                      </div>
                      <div className="pt-4">
                        <Select value={localIndustryOverride} onValueChange={handleApplyIndustryOverride}>
                            <SelectTrigger className="h-12 border-2 border-dashed rounded-xl font-bold uppercase text-[10px] bg-muted/5 group-hover:border-primary/50">
                                <SelectValue placeholder="Bypass Active" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="none" className="font-bold uppercase text-[10px]">No Simulation (Default)</SelectItem>
                                {INDUSTRY_TYPES.map(t => <SelectItem key={t} value={t} className="font-bold uppercase text-[10px]">{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                      </div>
                  </div>
              </div>

              <div className="rounded-3xl border-2 bg-background p-6 shadow-xl relative overflow-hidden">
                  <div className="flex flex-col gap-2 text-left">
                      <div className="flex items-center justify-between mb-2">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                              <ArrowRightLeft className="h-4 w-4" />
                              System Impersonation
                          </h3>
                          <Badge variant="outline" className="gap-2 h-6 px-3 rounded-full border-2 border-primary/20 text-[9px] font-black uppercase tracking-widest text-primary">
                              <CheckCircle2 className="h-3 w-3" />
                              {(sortedTenants.find((tenant) => tenant.id === activeTenantId)?.name) || activeTenantId || 'None'}
                          </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                          {sortedTenants.slice(0, 4).map((tenant) => {
                              const isActive = tenant.id === activeTenantId;
                              return (
                                  <Button
                                      key={tenant.id}
                                      variant={isActive ? 'secondary' : 'outline'}
                                      size="sm"
                                      className={cn(
                                          "h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                                          isActive ? "bg-primary text-white shadow-lg scale-105" : "hover:border-primary/50 hover:bg-primary/5 shadow-sm"
                                      )}
                                      onClick={() => handleSwitchTenant(tenant)}
                                      disabled={isActive}
                                  >
                                      {tenant.name}
                                  </Button>
                              );
                          })}
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <CardContent className="flex-1 min-h-0 p-0 overflow-hidden bg-muted/5">
        <ScrollArea className="h-full">
          <div className="p-10 space-y-12">
            <div className="space-y-8">
                <div className="flex items-center gap-4 text-left">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
                        <Users className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Logic Distribution Matrix</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Authorize specific system verticals for this registry profile.</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {menuConfig.map((menu) => {
                        const subHrefs = menu.subItems?.map(s => s.href) || [];
                        const isEnabled = enabledHrefs.has(menu.href);
                        return (
                            <div 
                                key={menu.href} 
                                className={cn(
                                    "space-y-4 p-6 rounded-3xl border-2 transition-all group/menu",
                                    isEnabled ? "bg-background border-primary shadow-xl ring-4 ring-primary/5" : "bg-muted/10 border-slate-100 hover:border-primary/30"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className={cn("p-2 rounded-lg transition-colors", isEnabled ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover/menu:bg-primary/10 group-hover/menu:text-primary")}>
                                            <menu.icon className="h-5 w-5" />
                                        </div>
                                        <Label htmlFor={`menu-${menu.href}`} className="font-black uppercase tracking-tight text-sm cursor-pointer leading-none">
                                            {menu.label}
                                        </Label>
                                    </div>
                                    <Checkbox 
                                        id={`menu-${menu.href}`} 
                                        checked={isEnabled} 
                                        onCheckedChange={() => toggleMenu(menu.href, subHrefs)}
                                        className="h-6 w-6 border-2 data-[state=checked]:bg-primary"
                                    />
                                </div>
                                
                                {menu.subItems && (
                                    <div className="pl-4 space-y-3 pt-4 border-t border-slate-100">
                                        {menu.subItems.map((sub) => (
                                            <div key={sub.href} className="flex items-center justify-between group/sub">
                                                <div className="flex items-center gap-2">
                                                    <ChevronRight className="h-3 w-3 text-muted-foreground opacity-30" />
                                                    <Label htmlFor={`sub-${sub.href}`} className="text-[11px] font-bold uppercase tracking-widest cursor-pointer opacity-60 group-hover/sub:opacity-100 transition-opacity">{sub.label}</Label>
                                                </div>
                                                <Checkbox 
                                                    id={`sub-${sub.href}`} 
                                                    checked={enabledHrefs.has(sub.href)} 
                                                    onCheckedChange={() => toggleSubMenu(menu.href, sub.href)}
                                                    className="h-4 w-4 border-2 data-[state=checked]:bg-primary"
                                                />
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
      <div className="shrink-0 p-8 flex justify-end bg-background">
          <Button onClick={handleSaveTenant} className="w-full sm:w-72 h-16 rounded-2xl shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] font-black uppercase tracking-widest gap-3 text-lg">
              {selectedTenantId ? <><Save className="h-6 w-6" /> Commit Update</> : <><PlusCircle className="h-6 w-6" /> Finalize Registry</>}
          </Button>
      </div>
    </Card>
  );
}
