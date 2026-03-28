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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const DEFAULT_MAIN = { background: '#ebf5fb', primary: '#7cc4f7', 'primary-foreground': '#1e293b', accent: '#63b2a7' };
const DEFAULT_BUTTON = { 'button-primary-background': '#7cc4f7', 'button-primary-foreground': '#1e293b', 'button-primary-accent': '#63b2a7', 'button-primary-accent-foreground': '#ffffff' };
const DEFAULT_CARD = { card: '#ebf5fb', 'card-foreground': '#1e293b', 'card-border': '#d1d5db' };
const DEFAULT_POPOVER = { popover: '#ebf5fb', 'popover-foreground': '#1e293b', 'popover-accent': '#7cc4f7', 'popover-accent-foreground': '#1e293b' };
const DEFAULT_SIDEBAR = { 'sidebar-background': '#dbeafb', 'sidebar-foreground': '#1e293b', 'sidebar-accent': '#f1f5f9', 'sidebar-accent-foreground': '#1e293b', 'sidebar-border': '#94a3b8' };
const DEFAULT_SIDEBAR_BACKGROUND_IMAGE = '/sidebar-background.png';
const DEFAULT_HEADER = { 'header-background': '#171514', 'header-foreground': '#f3efe8', 'header-border': '#3a312b' };
const DEFAULT_SWIMLANE = { 'swimlane-header-background': '#f1f5f9', 'swimlane-header-foreground': '#475569' };
const TENANT_OVERRIDE_STORAGE_KEY = 'safeviate:selected-tenant';

const mergeThemeSection = <T extends Record<string, string>>(defaults: T, incoming?: Record<string, string>) => {
  const merged = { ...defaults };
  if (!incoming) return merged;

  (Object.keys(defaults) as Array<keyof T>).forEach((key) => {
    const nextValue = incoming[key as string];
    if (typeof nextValue === 'string') {
      merged[key] = nextValue as T[keyof T];
    }
  });

  return merged;
};

const INDUSTRY_TYPES: IndustryType[] = [
  'Aviation: Flight Training (ATO)',
  'Aviation: Charter / Ops (AOC)',
  'Aviation: Maintenance (AMO)',
  'General: Occupational Health & Safety (OHS)'
];

const INDUSTRY_MODULES: Record<IndustryType, string[]> = {
  'Aviation: Flight Training (ATO)': [
    'Dashboard and My Dashboard',
    'Bookings and daily scheduling',
    'Operations and ERP tools',
    'Vehicle usage and fleet checkout',
    'Safety management modules',
    'Quality audits and coherence matrix',
    'Training, exams, and student progress',
    'Aircraft and vehicle asset management',
    'Users and admin configuration',
  ],
  'Aviation: Charter / Ops (AOC)': [
    'Dashboard and My Dashboard',
    'Bookings and daily scheduling',
    'Operations and ERP tools',
    'Vehicle usage and fleet checkout',
    'Safety management modules',
    'Quality audits and task tracking',
    'Aircraft and vehicle asset management',
    'Users and admin configuration',
  ],
  'Aviation: Maintenance (AMO)': [
    'Dashboard and My Dashboard',
    'Operations and company documents',
    'Vehicle usage and fleet checkout',
    'Safety management modules',
    'Quality audits and CAP tracking',
    'Aircraft and vehicle asset management',
    'Users and admin configuration',
  ],
  'General: Occupational Health & Safety (OHS)': [
    'Dashboard and My Dashboard',
    'Operations document control and vehicle usage',
    'Safety management modules',
    'Quality audits and task tracking',
    'Vehicle asset management',
    'Users and admin configuration',
  ],
};

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
  
  // Comprehensive Theme State
  const [mainTheme, setMainTheme] = useState(DEFAULT_MAIN);
  const [buttonTheme, setButtonTheme] = useState(DEFAULT_BUTTON);
  const [cardTheme, setCardTheme] = useState(DEFAULT_CARD);
  const [popoverTheme, setPopoverTheme] = useState(DEFAULT_POPOVER);
  const [sidebarTheme, setSidebarTheme] = useState(DEFAULT_SIDEBAR);
  const [sidebarBackgroundImage, setSidebarBackgroundImage] = useState(DEFAULT_SIDEBAR_BACKGROUND_IMAGE);
  const [headerTheme, setHeaderTheme] = useState(DEFAULT_HEADER);
  const [swimlaneTheme, setSwimlaneTheme] = useState(DEFAULT_SWIMLANE);
  
  const [enabledHrefs, setEnabledHrefs] = useState<Set<string>>(new Set());
  const isDeveloperMode = userProfile?.role?.toLowerCase() === 'dev' || userProfile?.role?.toLowerCase() === 'developer' || userProfile?.id === 'DEVELOPER_MODE';
  const sortedTenants = useMemo(() => [...(tenants || [])].sort((a, b) => a.name.localeCompare(b.name)), [tenants]);

  const handleLoadTenant = (tenantId: string) => {
    const t = tenants?.find(tenant => tenant.id === tenantId);
    if (!t) return;

    setSelectedTenantId(t.id);
    setTenantName(t.name);
    setIndustry(t.industry || 'Aviation: Flight Training (ATO)');
    setLogoPreview(t.logoUrl || null);
    
    // Load complex theme or fallback to defaults/basic colors
    setMainTheme({
        ...mergeThemeSection(DEFAULT_MAIN, t.theme?.main),
        primary: t.theme?.primaryColour || mergeThemeSection(DEFAULT_MAIN, t.theme?.main).primary,
        background: t.theme?.backgroundColour || mergeThemeSection(DEFAULT_MAIN, t.theme?.main).background,
        accent: t.theme?.accentColour || mergeThemeSection(DEFAULT_MAIN, t.theme?.main).accent,
    });
    setButtonTheme(mergeThemeSection(DEFAULT_BUTTON, t.theme?.button));
    setCardTheme(mergeThemeSection(DEFAULT_CARD, t.theme?.card));
    setPopoverTheme(mergeThemeSection(DEFAULT_POPOVER, t.theme?.popover));
    setSidebarTheme(mergeThemeSection(DEFAULT_SIDEBAR, t.theme?.sidebar));
    setSidebarBackgroundImage(t.theme?.sidebarBackgroundImage || DEFAULT_SIDEBAR_BACKGROUND_IMAGE);
    setHeaderTheme(mergeThemeSection(DEFAULT_HEADER, t.theme?.header));
    setSwimlaneTheme(mergeThemeSection(DEFAULT_SWIMLANE, t.theme?.swimlane));
    
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
    newEnabled.add('/assets');
    newEnabled.add('/assets/vehicles');
    newEnabled.add('/operations');
    newEnabled.add('/operations/vehicle-usage');
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
    setButtonTheme(DEFAULT_BUTTON);
    setCardTheme(DEFAULT_CARD);
    setPopoverTheme(DEFAULT_POPOVER);
    setSidebarTheme(DEFAULT_SIDEBAR);
    setSidebarBackgroundImage(DEFAULT_SIDEBAR_BACKGROUND_IMAGE);
    setHeaderTheme(DEFAULT_HEADER);
    setSwimlaneTheme(DEFAULT_SWIMLANE);
    setEnabledHrefs(new Set());
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoPreview(URL.createObjectURL(file));
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
      newEnabled.add(parentHref);
    }
    setEnabledHrefs(newEnabled);
  };

  const updateColor = (setter: Function, key: string, value: string) => {
    setter((prev: any) => ({ ...prev, [key]: value }));
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
            button: buttonTheme,
            card: cardTheme,
            popover: popoverTheme,
            sidebar: sidebarTheme,
            sidebarBackgroundImage,
            header: headerTheme,
            swimlane: swimlaneTheme,
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

  const formatLabel = (key: string, prefix: string) => {
    const clean = key.replace(prefix, '');
    if (clean === 'popover' || clean === 'card' || clean === 'background') return 'Background';
    if (clean === 'foreground') return 'Text';
    if (clean === 'accent') return 'Selection / Hover';
    if (clean === 'accent-foreground') return 'Selection Text';
    return clean.replace(/-/g, ' ');
  };

  const ColorSection = ({ title, themeState, setter, prefix }: { title: string, themeState: any, setter: Function, prefix: string }) => (
    <div className="space-y-4 p-4 border rounded-lg bg-background/50">
        <h4 className="font-semibold text-sm uppercase tracking-wider text-primary">{title}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(themeState).map(([key, value]) => (
                <div key={key} className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">{formatLabel(key, prefix)}</Label>
                    <Input type="color" value={value as string} onChange={(e) => updateColor(setter, key, e.target.value)} className="h-8 p-1" />
                </div>
            ))}
        </div>
    </div>
  );

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-none border">
      <CardHeader className="shrink-0 border-b bg-muted/5">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle>Tenant Manager</CardTitle>
                <CardDescription>Manage authorized features and branding for any organization on the system.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="h-9 w-9" aria-label="View industry modules">
                            <Info className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-[380px] space-y-4">
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold uppercase tracking-wider text-primary">Industry Modules</h4>
                            <p className="text-xs text-muted-foreground">
                                These are the default module groups available for each industry preset in Tenant Manager.
                            </p>
                        </div>
                        <div className="space-y-3">
                            {INDUSTRY_TYPES.map((industryType) => (
                                <div key={industryType} className="rounded-lg border bg-muted/20 p-3">
                                    <p className="text-xs font-bold uppercase tracking-wide text-foreground">{industryType}</p>
                                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                        {INDUSTRY_MODULES[industryType].map((moduleName) => (
                                            <li key={moduleName}>- {moduleName}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
                <Button variant="outline" size="sm" onClick={handleClearForm}><PlusCircle className="mr-2 h-4 w-4" /> New Tenant</Button>
            </div>
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
              <div className="space-y-2 flex-[2]">
                  <Label htmlFor="tenant-name">Tenant Name</Label>
                  <Input id="tenant-name" placeholder="e.g., Safeviate Inc." value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
              </div>
              <div className="space-y-2 flex-[1.5]">
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
                  <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Companies</h3>
                      <p className="text-sm text-muted-foreground">Every configured tenant appears here with a quick switch action for developer use.</p>
                  </div>
                  <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Active Company: {(sortedTenants.find((tenant) => tenant.id === activeTenantId)?.name) || activeTenantId || 'None'}
                      </Badge>
                      {!isDeveloperMode && (
                          <Badge variant="secondary">Switching is available in developer mode</Badge>
                      )}
                  </div>
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {sortedTenants.length === 0 ? (
                      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                          No companies have been created yet. Create a tenant and it will appear here automatically.
                      </div>
                  ) : (
                      sortedTenants.map((tenant) => {
                          const isActiveTenant = tenant.id === activeTenantId;

                          return (
                              <div key={tenant.id} className="flex flex-col gap-3 rounded-lg border bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                          <Building2 className="h-4 w-4 text-primary" />
                                          <span className="font-semibold">{tenant.name}</span>
                                          {isActiveTenant && <Badge className="bg-green-600 hover:bg-green-600">Active</Badge>}
                                      </div>
                                      <p className="text-xs text-muted-foreground">Tenant ID: {tenant.id} • {tenant.industry || 'Legacy Profile'}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                      <Button type="button" variant="outline" size="sm" onClick={() => handleLoadTenant(tenant.id)}>
                                          <Pencil className="mr-2 h-4 w-4" />
                                          Edit
                                      </Button>
                                      <Button
                                          type="button"
                                          size="sm"
                                          variant={isActiveTenant ? 'secondary' : 'default'}
                                          onClick={() => handleSwitchTenant(tenant)}
                                          disabled={!isDeveloperMode || isActiveTenant}
                                      >
                                          <ArrowRightLeft className="mr-2 h-4 w-4" />
                                          {isActiveTenant ? 'Current Company' : 'Switch to Company'}
                                      </Button>
                                  </div>
                              </div>
                          );
                      })
                  )}
              </div>
          </div>
      </div>

      <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-10">
            {/* --- Branding Section --- */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">Comprehensive Branding</h3>
                    <div className="flex items-center gap-4">
                        <Label htmlFor="logo-upload" className="cursor-pointer bg-secondary px-3 py-1 rounded text-xs">Change Logo</Label>
                        <Input id="logo-upload" type="file" onChange={handleLogoChange} accept="image/*" className="hidden" />
                        {logoPreview && (
                            <div className="h-10 w-32 border rounded overflow-hidden bg-white flex items-center justify-center p-1">
                                <img src={logoPreview} alt="Logo" className="max-h-full max-w-full object-contain" />
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="space-y-6">
                    <ColorSection title="Main Theme" themeState={mainTheme} setter={setMainTheme} prefix="" />
                    <ColorSection title="Buttons" themeState={buttonTheme} setter={setButtonTheme} prefix="button-primary-" />
                    <ColorSection title="Header" themeState={headerTheme} setter={setHeaderTheme} prefix="header-" />
                    <ColorSection title="Swimlane Header" themeState={swimlaneTheme} setter={setSwimlaneTheme} prefix="swimlane-header-" />
                    <ColorSection title="Sidebar" themeState={sidebarTheme} setter={setSidebarTheme} prefix="sidebar-" />
                    <div className="space-y-1.5 p-4 border rounded-lg bg-background/50">
                        <Label htmlFor="tenant-sidebar-background-image" className="text-[10px] uppercase font-bold text-muted-foreground">
                            Sidebar Background Image URL
                        </Label>
                        <Input
                          id="tenant-sidebar-background-image"
                          type="text"
                          value={sidebarBackgroundImage}
                          onChange={(e) => setSidebarBackgroundImage(e.target.value)}
                          placeholder="https://example.com/sidebar-texture.jpg"
                        />
                    </div>
                    <ColorSection title="Cards" themeState={cardTheme} setter={setCardTheme} prefix="card-" />
                    <ColorSection title="Popovers & Dropdowns" themeState={popoverTheme} setter={setPopoverTheme} prefix="popover-" />
                </div>
            </div>
            
            <Separator />

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
