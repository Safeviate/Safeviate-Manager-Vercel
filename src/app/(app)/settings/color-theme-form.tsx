'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronDown, LayoutGrid, Sparkles, Trash2, Globe, Save } from 'lucide-react';
import { useTheme, type SavedTheme } from '@/components/theme-provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Tenant } from '@/types/quality';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';

interface ColorThemeFormProps {
  showHeader?: boolean;
}

type PalettePreset = {
  name: string;
  description: string;
  colors: {
    primary: string;
    'primary-foreground': string;
    background: string;
    accent: string;
  };
};

const HEADER_BANNER_RECOMMENDED_SIZE = '1600 x 240 px';
const SIDEBAR_BANNER_RECOMMENDED_SIZE = '900 x 1600 px';

const PALETTE_PRESETS: PalettePreset[] = [
  {
    name: 'Aero',
    description: 'Calm blue for aviation ops',
    colors: {
      primary: '#4a90c2',
      'primary-foreground': '#0f172a',
      background: '#f7fbfe',
      accent: '#7fb8d8',
    },
  },
  {
    name: 'Signal',
    description: 'Professional safety alert system',
    colors: {
      primary: '#23415d',
      'primary-foreground': '#ffffff',
      background: '#f7f9fc',
      accent: '#d79b2a',
    },
  },
  {
    name: 'Compliance',
    description: 'OHS-friendly yellow-grey compliance',
    colors: {
      primary: '#9a8d5a',
      'primary-foreground': '#1f2937',
      background: '#fbfaf4',
      accent: '#b9b39d',
    },
  },
  {
    name: 'Industrial',
    description: 'Strong contrast for admin dashboards',
    colors: {
      primary: '#2f3a4a',
      'primary-foreground': '#ffffff',
      background: '#f6f8fb',
      accent: '#8f99a8',
    },
  },
  {
    name: 'Harbour',
    description: 'Navy and ivory with a warm accent',
    colors: {
      primary: '#243c5a',
      'primary-foreground': '#ffffff',
      background: '#fbfcfe',
      accent: '#b8a15a',
    },
  },
];

const LOCAL_TENANT_CONFIG_KEY = 'safeviate:tenant-config-local-override';

function mergeTenantConfig(
  serverConfig: Record<string, unknown> | null,
  localConfig: Record<string, unknown> | null
) {
  if (!serverConfig && !localConfig) return null;
  if (!serverConfig) return localConfig;
  if (!localConfig) return serverConfig;

  const serverTheme =
    serverConfig.theme && typeof serverConfig.theme === 'object'
      ? (serverConfig.theme as Record<string, unknown>)
      : null;
  const localTheme =
    localConfig.theme && typeof localConfig.theme === 'object'
      ? (localConfig.theme as Record<string, unknown>)
      : null;

  return {
    ...localConfig,
    ...serverConfig,
    theme: serverTheme || localTheme
      ? {
          ...(localTheme || {}),
          ...(serverTheme || {}),
        }
      : undefined,
  };
}

function readLocalTenantOverride() {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem(LOCAL_TENANT_CONFIG_KEY);
    return stored ? (JSON.parse(stored) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function ColorThemeForm({ showHeader = true }: ColorThemeFormProps) {
  const { toast } = useToast();
  const { tenantId } = useUserProfile();
  const { hasPermission } = usePermissions();
  const { 
    theme, 
    setThemeValue, 
    buttonTheme,
    setButtonThemeValue,
    cardTheme, 
    setCardThemeValue,
    popoverTheme,
    setPopoverThemeValue, 
    sidebarTheme, 
    setSidebarThemeValue, 
    sidebarBackgroundImage,
    setSidebarBackgroundImage,
    sidebarBackgroundOpacity,
    setSidebarBackgroundOpacity,
    headerTheme, 
    setHeaderThemeValue,
    headerBackgroundImage,
    setHeaderBackgroundImage,
    headerBackgroundOpacity,
    setHeaderBackgroundOpacity,
    swimlaneTheme,
    setSwimlaneThemeValue,
    matrixTheme,
    setMatrixThemeValue,
    scale,
    setScale,
    savedThemes,
    saveCurrentTheme,
    applySavedTheme,
    deleteSavedTheme,
    resetToDefaults,
  } = useTheme();

  const [themeName, setThemeName] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [isUploadingSidebarImage, setIsUploadingSidebarImage] = useState(false);
  const [isUploadingHeaderImage, setIsUploadingHeaderImage] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(true);
  const [isSavingOrganization, setIsSavingOrganization] = useState(false);
  const [openAdvancedSections, setOpenAdvancedSections] = useState<string[]>(['buttons', 'headers']);

  const canManageOrganization = hasPermission('admin-settings-manage');

  const loadTenants = useCallback(() => {
    setIsLoadingTenants(true);
    const load = async () => {
      try {
        const [meResponse, configResponse] = await Promise.all([
          fetch('/api/me', { cache: 'no-store' }),
          fetch('/api/tenant-config', { cache: 'no-store' }),
        ]);
        const mePayload = await meResponse.json();
        const configPayload = await configResponse.json().catch(() => ({}));
        const tenant = mePayload?.tenant;
        const tenantConfig = configPayload?.config ?? null;
        const localOverride = readLocalTenantOverride();

        if (tenant) {
          const mergedConfig = mergeTenantConfig(
            tenantConfig && typeof tenantConfig === 'object'
              ? (tenantConfig as Record<string, unknown>)
              : null,
            localOverride
          );
          const mergedTenant = { ...tenant, ...(mergedConfig || {}) } as Tenant;
          setTenants([mergedTenant]);
        } else {
          setTenants([]);
        }
      } catch (e) {
        console.error("Failed to load tenants", e);
        setTenants([]);
      } finally {
        setIsLoadingTenants(false);
      }
    };
    void load();
  }, []);

  const handleSaveToOrganization = async () => {
    setIsSavingOrganization(true);
    const updatedTheme = {
      primaryColour: theme.primary,
      backgroundColour: theme.background,
      accentColour: theme.accent,
      scale,
      main: theme,
      button: buttonTheme,
      card: cardTheme,
      popover: popoverTheme,
      sidebar: sidebarTheme,
      sidebarBackgroundImage,
      sidebarBackgroundOpacity,
      header: headerTheme,
      headerBackgroundImage,
      headerBackgroundOpacity,
      swimlane: swimlaneTheme,
      matrix: matrixTheme,
    };

    const configUpdate = {
        id: tenantId || 'safeviate',
        theme: updatedTheme
    };

    try {
        const response = await fetch('/api/tenant-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: configUpdate }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || 'Could not save tenant configuration.');
        }

        try {
          window.localStorage.setItem(LOCAL_TENANT_CONFIG_KEY, JSON.stringify(configUpdate));
          window.dispatchEvent(new Event('storage'));
        } catch {
          // Ignore browser storage failures and rely on the server copy.
        }

        window.dispatchEvent(new Event('safeviate-tenant-config-updated'));
        loadTenants();

        toast({
            title: "Branding Saved to Cloud",
            description: "Organization default colors have been synchronized with the database for all users."
        });
    } catch (e) {
      try {
        window.localStorage.setItem(LOCAL_TENANT_CONFIG_KEY, JSON.stringify(configUpdate));
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('safeviate-tenant-config-updated'));
        loadTenants();
      } catch {
        // Ignore browser storage failures.
      }

      toast({
        title: "Saved Locally",
        description: e instanceof Error ? `${e.message} The branding was kept in this browser.` : "The organization branding could not be saved to the server, but the changes were kept in this browser.",
      });
    } finally {
        setIsSavingOrganization(false);
    }
  };

  useEffect(() => {
    loadTenants();
    window.addEventListener('safeviate-tenant-config-updated', loadTenants);
    return () => window.removeEventListener('safeviate-tenant-config-updated', loadTenants);
  }, [loadTenants]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleApplyTenantTheme = (tenantId: string) => {
    const tenant = tenants?.find(t => t.id === tenantId);
    const effectiveTheme = tenant?.theme;
    if (!effectiveTheme) {
        toast({ variant: "destructive", title: "Theme Not Found", description: "The selected tenant does not have a configured theme." });
        return;
    }
    
    const themeToApply: SavedTheme = {
        name: tenant.name,
        colors: (effectiveTheme.main as SavedTheme['colors']) || {
            primary: effectiveTheme.primaryColour || theme.primary,
            'primary-foreground': theme['primary-foreground'],
            background: effectiveTheme.backgroundColour || theme.background,
            accent: effectiveTheme.accentColour || theme.accent,
        },
        buttonColors: (effectiveTheme.button as SavedTheme['buttonColors']) || {
            'button-primary-background': effectiveTheme.primaryColour || buttonTheme['button-primary-background'],
            'button-primary-foreground': buttonTheme['button-primary-foreground'],
            'button-primary-accent': effectiveTheme.accentColour || buttonTheme['button-primary-accent'],
            'button-primary-accent-foreground': buttonTheme['button-primary-accent-foreground'],
        },
        cardColors: (effectiveTheme.card as SavedTheme['cardColors']) || { 
            card: effectiveTheme.backgroundColour || cardTheme.card, 
            'card-foreground': cardTheme['card-foreground'],
            'card-border': cardTheme['card-border']
        },
        popoverColors: (effectiveTheme.popover as SavedTheme['popoverColors']) || { 
            popover: effectiveTheme.backgroundColour || popoverTheme.popover, 
            'popover-foreground': popoverTheme['popover-foreground'],
            'popover-accent': popoverTheme['popover-accent'],
            'popover-accent-foreground': popoverTheme['popover-accent-foreground'],
        },
        sidebarColors: (effectiveTheme.sidebar as SavedTheme['sidebarColors']) || {
            'sidebar-background': effectiveTheme.backgroundColour || sidebarTheme['sidebar-background'],
            'sidebar-foreground': sidebarTheme['sidebar-foreground'],
            'sidebar-button-background': sidebarTheme['sidebar-button-background'],
            'sidebar-accent': effectiveTheme.accentColour || sidebarTheme['sidebar-accent'],
            'sidebar-accent-foreground': sidebarTheme['sidebar-accent-foreground'],
            'sidebar-border': sidebarTheme['sidebar-border'],
        },
        sidebarBackgroundImage:
          effectiveTheme.sidebarBackgroundImage !== undefined
            ? effectiveTheme.sidebarBackgroundImage
            : sidebarBackgroundImage,
        sidebarBackgroundOpacity:
          typeof effectiveTheme.sidebarBackgroundOpacity === 'number'
            ? effectiveTheme.sidebarBackgroundOpacity
            : sidebarBackgroundOpacity,
        headerColors: (effectiveTheme.header as SavedTheme['headerColors']) || { 
            'header-background': effectiveTheme.backgroundColour || headerTheme['header-background'], 
            'header-foreground': headerTheme['header-foreground'], 
            'header-border': headerTheme['header-border'] 
        },
        headerBackgroundImage:
          effectiveTheme.headerBackgroundImage !== undefined
            ? effectiveTheme.headerBackgroundImage
            : headerBackgroundImage,
        headerBackgroundOpacity:
          typeof effectiveTheme.headerBackgroundOpacity === 'number'
            ? effectiveTheme.headerBackgroundOpacity
            : headerBackgroundOpacity,
        swimlaneColors: (effectiveTheme.swimlane as SavedTheme['swimlaneColors']) || swimlaneTheme,
        matrixColors: (effectiveTheme.matrix as SavedTheme['matrixColors']) || matrixTheme,
        scale: typeof effectiveTheme.scale === 'number' ? effectiveTheme.scale : scale,
    };

    applySavedTheme(themeToApply);
    
    toast({ title: "Tenant Theme Applied", description: `The theme for "${tenant.name}" has been applied.` });
  };

  const handleSaveTheme = () => {
    if (!themeName.trim()) {
        toast({ variant: "destructive", title: "Error", description: "Please enter a name for the theme." });
        return;
    }
    saveCurrentTheme(themeName);
    setThemeName('');
    toast({ title: "Theme Saved", description: `The theme "${themeName}" has been saved.` });
  };

  const handleApplyTheme = (themeToApply: SavedTheme) => {
    applySavedTheme(themeToApply);
    toast({ title: "Theme Applied", description: `The "${themeToApply.name}" theme has been loaded.` });
  };

  const handleDeleteTheme = (themeNameToDelete: string) => {
    deleteSavedTheme(themeNameToDelete);
    toast({ title: "Theme Deleted", description: `The theme "${themeNameToDelete}" has been deleted.` });
  };
  
  const handleReset = () => {
    resetToDefaults();
    toast({ title: "Tenant Branding Restored", description: "This device has been reset to the shared organization branding." });
  }

  const uploadThemeImage = async (
    file: File,
    displayName: string
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('displayName', displayName);

    const response = await fetch('/api/uploads', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(payload.error || 'Upload failed');
    }

    return response.json() as Promise<{ url: string }>;
  };

  const handleThemeImageUpload = async (
    file: File | undefined,
    target: 'sidebar' | 'header'
  ) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Please upload an image file.' });
      return;
    }

    const setLoading = target === 'sidebar' ? setIsUploadingSidebarImage : setIsUploadingHeaderImage;
    const setImage = target === 'sidebar' ? setSidebarBackgroundImage : setHeaderBackgroundImage;
    const label = target === 'sidebar' ? 'Sidebar' : 'Header';

    try {
      setLoading(true);
      const uploaded = await uploadThemeImage(file, `${target}-banner`);
      setImage(uploaded.url);
      toast({ title: `${label} image uploaded`, description: `${label} background preview updated.` });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: `${label} upload failed`,
        description: error instanceof Error ? error.message : 'Could not upload image.',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyPalettePreset = (preset: PalettePreset) => {
    setThemeValue('primary', preset.colors.primary);
    setThemeValue('primary-foreground', preset.colors['primary-foreground']);
    setThemeValue('background', preset.colors.background);
    setThemeValue('accent', preset.colors.accent);
    setButtonThemeValue('button-primary-background', preset.colors.primary);
    setButtonThemeValue('button-primary-foreground', preset.colors['primary-foreground']);
    setButtonThemeValue('button-primary-accent', preset.colors.accent);
    setPopoverThemeValue('popover', preset.colors.background);
    setPopoverThemeValue('popover-accent', preset.colors.primary);
    setSidebarThemeValue('sidebar-background', preset.colors.background);
    setSidebarThemeValue('sidebar-button-background', preset.colors.background);
    setSidebarThemeValue('sidebar-accent', preset.colors.accent);
    setCardThemeValue('card', preset.colors.background);
    toast({
      title: `${preset.name} palette applied`,
      description: 'The core brand colors, button accents, and supporting surfaces were updated together.',
    });
  };

  const toggleAdvancedSection = (section: string) => {
    setOpenAdvancedSections((current) =>
      current.includes(section) ? current.filter((item) => item !== section) : [...current, section]
    );
  };

  const isSectionOpen = (section: string) => openAdvancedSections.includes(section);
  const activePaletteName = PALETTE_PRESETS.find((preset) => (
    preset.colors.primary === theme.primary &&
    preset.colors.background === theme.background &&
    preset.colors.accent === theme.accent
  ))?.name;

  const formatLabel = (key: string) => {
    if (key === 'header-button-background') return 'Header Button Fill';
    if (key === 'header-button-foreground') return 'Header Button Text';
    if (key === 'header-button-border') return 'Header Button Border';
    if (key === 'header-button-hover') return 'Header Button Hover';
    const clean = key.replace('popover-', '').replace('button-primary-', '').replace('sidebar-', '').replace('header-', '').replace('swimlane-header-', '');
    if (clean === 'popover' || clean === 'card' || clean === 'background') return 'Background';
    if (clean === 'button-background') return 'Sidebar Menu Surface';
    if (clean === 'foreground') return 'Text';
    if (clean === 'accent') return 'Selection / Hover';
    if (clean === 'accent-foreground') return 'Selection Text';
    return clean.replace(/-/g, ' ');
  };

  const content = (
    <div className="p-6 space-y-8 pb-24">
        <div>
            <h2 className="text-sm font-black uppercase tracking-tight mb-1 text-foreground">UI Scaling</h2>
            <p className='mb-4 text-[10px] font-black uppercase italic text-foreground/75'>Set the global interface scale for the whole app.</p>
            <div className='flex items-center gap-6 bg-muted/5 p-4 border rounded-xl'>
                <Slider aria-label="UI scale" value={[scale]} onValueChange={(value) => setScale(value[0])} min={50} max={150} step={5} className="flex-1" />
                <span className='text-sm font-black text-primary w-12 text-right'>{scale}%</span>
            </div>
        </div>
        
        <Separator />

        {canManageOrganization && (
            <>
                <div className="bg-primary/5 p-5 rounded-2xl border border-primary/20 space-y-4 shadow-sm">
                    <div className="space-y-1">
                        <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                            <Globe className="h-4 w-4" />
                            Organization Branding
                        </h2>
                        <p className='text-[9px] font-black uppercase italic text-foreground/75'>
                            Save these colors as the shared default for everyone in the tenant.
                        </p>
                    </div>
                    <Button onClick={handleSaveToOrganization} disabled={isSavingOrganization} className="w-full sm:w-auto text-[10px] font-black uppercase h-9 px-8 shadow-md">
                        {isSavingOrganization ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save as Organization Default</>}
                    </Button>
                </div>
                <Separator />
            </>
        )}

        <div>
            <h2 className="text-sm font-black uppercase tracking-tight mb-1 text-foreground">Apply Tenant Branding</h2>
            <p className='mb-4 text-[10px] font-black uppercase italic text-foreground/75'>Load a saved organization theme and use it as your starting point.</p>
            <Select onValueChange={handleApplyTenantTheme} disabled={isLoadingTenants || tenants.length === 0}>
                <SelectTrigger className="w-full sm:w-[320px] h-11 font-black uppercase text-[10px] border-2">
                    <SelectValue placeholder={isLoadingTenants ? "Loading themes..." : (tenants.length === 0 ? "No tenant config found" : "Select a tenant theme")} />
                </SelectTrigger>
                <SelectContent>
                    {(tenants || []).map(tenant => (
                        <SelectItem key={tenant.id} value={tenant.id} className="font-bold text-[10px] uppercase">
                            {tenant.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        <Separator />
      
        <div className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-tight text-foreground">Main Theme Colors</h2>
            <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-primary">
                            <Sparkles className="h-4 w-4" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest">Live Preview</h3>
                        </div>
                        <p className="text-[9px] font-black uppercase italic text-foreground/75">A quick read on how the current theme will feel in the app.</p>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {[theme.primary, theme.background, theme.accent, buttonTheme['button-primary-background']].map((value, index) => (
                            <div key={value + index} className="group h-10 w-10 overflow-hidden rounded-xl border shadow-sm">
                                <div className="h-full w-full transition-transform group-hover:scale-110" style={{ backgroundColor: value }} />
                            </div>
                        ))}
                    </div>
                </div>
                <div
                    className="mt-4 overflow-hidden rounded-2xl border shadow-sm"
                    style={{
                        borderColor: cardTheme['card-border'],
                    }}
                >
                    <div
                        className="flex items-center justify-between border-b px-4 py-3"
                        style={{
                            backgroundColor: headerTheme['header-background'],
                            color: headerTheme['header-foreground'],
                            borderColor: headerTheme['header-border'],
                        }}
                    >
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-widest">Header Preview</p>
                            <p className="text-[9px] font-bold uppercase tracking-tight opacity-80">Top bars and key framing</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div
                                className="rounded-md border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest shadow-sm"
                                style={{
                                    backgroundColor: headerTheme['header-button-background'],
                                    color: headerTheme['header-button-foreground'],
                                    borderColor: headerTheme['header-button-border'],
                                }}
                            >
                                Header Button
                            </div>
                            <LayoutGrid className="h-5 w-5 opacity-70" />
                        </div>
                    </div>
                    <div className="grid gap-0 md:grid-cols-[180px_1fr]">
                        <div
                            className="space-y-3 p-4"
                            style={{
                                backgroundColor: sidebarTheme['sidebar-background'],
                                color: sidebarTheme['sidebar-foreground'],
                            }}
                        >
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest">Sidebar</p>
                                <p className="text-[9px] font-bold uppercase tracking-tight opacity-80">Navigation and shell color</p>
                            </div>
                            <div className="space-y-2">
                                <div className="rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest" style={{ backgroundColor: sidebarTheme['sidebar-accent'], color: sidebarTheme['sidebar-accent-foreground'] }}>
                                    Selected item
                                </div>
                                <div className="rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest" style={{ backgroundColor: sidebarTheme['sidebar-button-background'], color: sidebarTheme['sidebar-foreground'] }}>
                                    Sidebar menu surface
                                </div>
                                <div className="rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-widest" style={{ borderColor: sidebarTheme['sidebar-border'] }}>
                                    Border sample
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3 p-4" style={{ backgroundColor: theme.background, color: theme['primary-foreground'] }}>
                            <div
                                className="rounded-2xl border p-4 shadow-sm"
                                style={{
                                    backgroundColor: cardTheme.card,
                                    color: cardTheme['card-foreground'],
                                    borderColor: cardTheme['card-border'],
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest">Card Preview</p>
                                        <p className="text-[9px] font-bold uppercase tracking-tight opacity-80">Buttons, accents, and surfaces together</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.primary }} />
                                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.accent }} />
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <span className="rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest" style={{ backgroundColor: theme.primary, color: theme['primary-foreground'] }}>
                                        Primary
                                    </span>
                                    <span className="rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest" style={{ backgroundColor: theme.accent, color: theme['primary-foreground'] }}>
                                        Accent
                                    </span>
                                    <span className="rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest" style={{ backgroundColor: buttonTheme['button-primary-background'], color: buttonTheme['button-primary-foreground'] }}>
                                        Button
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className="rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest" style={{ backgroundColor: popoverTheme.popover, color: popoverTheme['popover-foreground'], border: `1px solid ${popoverTheme['popover-accent']}` }}>
                                    Popover
                                </span>
                                <span className="rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest" style={{ backgroundColor: swimlaneTheme['swimlane-header-background'], color: swimlaneTheme['swimlane-header-foreground'] }}>
                                    Swimlane
                                </span>
                                <span className="rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest" style={{ backgroundColor: matrixTheme['matrix-header-background'], color: matrixTheme['matrix-header-foreground'] }}>
                                    Matrix
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="rounded-2xl border bg-muted/5 p-4 shadow-inner space-y-4">
                <div className="space-y-1">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">Quick Palettes</h3>
                    <p className="text-[9px] font-black uppercase italic text-foreground/75">Pick a starting palette, then fine-tune the individual swatches below.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleReset}
                        className="h-8 rounded-full border-primary/20 bg-background px-3 text-[9px] font-black uppercase tracking-widest shadow-sm"
                    >
                        Reset to defaults
                    </Button>
                    <span className="text-[9px] font-bold uppercase tracking-tight text-muted-foreground">
                        Restores the shared base brand palette on this device.
                    </span>
                </div>
                {activePaletteName && (
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-primary/30 bg-primary/5 text-[9px] font-black uppercase tracking-widest">
                            Active: {activePaletteName}
                        </Badge>
                    </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {PALETTE_PRESETS.map((preset) => (
                        <Button
                            key={preset.name}
                            type="button"
                            variant="outline"
                            onClick={() => applyPalettePreset(preset)}
                            className={`h-auto justify-start gap-3 rounded-2xl border-2 bg-background p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:bg-muted/40 ${
                                activePaletteName === preset.name ? 'border-primary ring-1 ring-primary/30 bg-primary/5' : ''
                            }`}
                            aria-pressed={activePaletteName === preset.name}
                        >
                            <span className="flex h-10 w-10 shrink-0 overflow-hidden rounded-xl border">
                                <span className="flex-1" style={{ backgroundColor: preset.colors.primary }} />
                                <span className="flex-1" style={{ backgroundColor: preset.colors.background }} />
                                <span className="flex-1" style={{ backgroundColor: preset.colors.accent }} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                    <span className="block text-[10px] font-black uppercase tracking-tight text-foreground">{preset.name}</span>
                                    {activePaletteName === preset.name && (
                                        <Badge variant="outline" className="h-5 gap-1 border-primary/30 bg-primary/10 px-2 text-[8px] font-black uppercase tracking-widest">
                                            <Check className="h-3 w-3" />
                                            Selected
                                        </Badge>
                                    )}
                                </span>
                                <span className="block text-[9px] font-bold uppercase tracking-tight text-muted-foreground">{preset.description}</span>
                            </span>
                        </Button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 p-5 border rounded-2xl bg-muted/5 shadow-inner">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground/75">Primary Palette</h4>
                    <p className="text-[9px] font-black uppercase italic text-foreground/60">Used for primary actions, key emphasis, and brand identity.</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="primary" className="text-[9px] font-black uppercase">Primary</Label>
                            <Input id="primary" type="color" value={theme.primary} onChange={(e) => setThemeValue('primary', e.target.value)} className="p-1 h-12 w-full rounded-lg cursor-pointer border-2" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="primary-foreground" className="text-[9px] font-black uppercase">Foreground</Label>
                            <Input id="primary-foreground" type="color" value={theme['primary-foreground']} onChange={(e) => setThemeValue('primary-foreground', e.target.value)} className="p-1 h-12 w-full rounded-lg cursor-pointer border-2" />
                        </div>
                    </div>
                </div>
                <div className="space-y-4 p-5 border rounded-2xl bg-muted/5 shadow-inner">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground/75">Base &amp; Accent</h4>
                    <p className="text-[9px] font-black uppercase italic text-foreground/60">Sets the app canvas and the secondary accent used for highlights.</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="background" className="text-[9px] font-black uppercase">Background</Label>
                            <Input id="background" type="color" value={theme.background} onChange={(e) => setThemeValue('background', e.target.value)} className="p-1 h-12 w-full rounded-lg cursor-pointer border-2" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="accent" className="text-[9px] font-black uppercase">Accent</Label>
                            <Input id="accent" type="color" value={theme.accent} onChange={(e) => setThemeValue('accent', e.target.value)} className="p-1 h-12 w-full rounded-lg cursor-pointer border-2" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <Separator />

        <div>
            <h2 className="text-sm font-black uppercase tracking-tight mb-4 text-foreground">Advanced Component Theming</h2>
            <p className="mb-5 text-[10px] font-black uppercase italic text-foreground/75">These controls fine-tune how specific surfaces, headers, and panels behave.</p>
            <div className="space-y-10">
                <Collapsible open={isSectionOpen('buttons')} onOpenChange={() => toggleAdvancedSection('buttons')}>
                    <section className="space-y-4">
                        <CollapsibleTrigger className="flex w-full items-center justify-between border-b pb-2 text-left">
                            <span className="text-[10px] font-black uppercase text-primary tracking-widest">Primary Buttons</span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${isSectionOpen('buttons') ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4">
                            <p className="text-[9px] font-black uppercase italic text-foreground/60">Controls button fill, text, and hover states.</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.entries(buttonTheme).map(([name, value]) => (
                                <div key={name} className="space-y-1.5">
                                    <Label htmlFor={name} className="text-[9px] font-black uppercase text-foreground">{formatLabel(name)}</Label>
                                    <Input id={name} type="color" value={value} onChange={(e) => setButtonThemeValue(name as keyof typeof buttonTheme, e.target.value)} className="p-1 h-10 w-full rounded-md cursor-pointer border shadow-sm" />
                                </div>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </section>
                </Collapsible>

                <Collapsible open={isSectionOpen('headers')} onOpenChange={() => toggleAdvancedSection('headers')}>
                    <section className="space-y-4">
                        <CollapsibleTrigger className="flex w-full items-center justify-between border-b pb-2 text-left">
                            <span className="text-[10px] font-black uppercase text-primary tracking-widest">Headers</span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${isSectionOpen('headers') ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4">
                            <p className="text-[9px] font-black uppercase italic text-foreground/60">Affects top bars, section headers, and border contrast.</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {Object.entries(headerTheme).map(([name, value]) => (
                                <div key={name} className="space-y-1.5">
                                    <Label htmlFor={name} className="text-[9px] font-black uppercase text-foreground">{formatLabel(name)}</Label>
                                    <Input id={name} type="color" value={value} onChange={(e) => setHeaderThemeValue(name as keyof typeof headerTheme, e.target.value)} className="p-1 h-10 w-full rounded-md cursor-pointer border shadow-sm" />
                                </div>
                                ))}
                            </div>
                            <Separator />
                            <div className="space-y-3 pt-2">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Header Banner</h4>
                                <p className="text-[9px] font-black uppercase italic text-foreground/60">Upload an image for the top menu background.</p>
                                <p className="text-[9px] font-black uppercase tracking-tight text-foreground/55">Recommended size: {HEADER_BANNER_RECOMMENDED_SIZE}</p>
                                <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                                    <div className="overflow-hidden rounded-2xl border bg-muted/10">
                                        {headerBackgroundImage ? (
                                            <Image src={headerBackgroundImage} alt="Header banner preview" width={440} height={180} className="h-28 w-full object-cover" unoptimized />
                                        ) : (
                                            <div className="flex h-28 items-center justify-center text-[9px] font-black uppercase tracking-widest text-foreground/50">
                                                No header image
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => void handleThemeImageUpload(e.target.files?.[0], 'header')}
                                            className="cursor-pointer"
                                        />
                                        <div className="flex gap-3">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="text-[10px] font-black uppercase"
                                                disabled={isUploadingHeaderImage}
                                                onClick={() => setHeaderBackgroundImage('')}
                                            >
                                                Remove Header Image
                                            </Button>
                                            {isUploadingHeaderImage && (
                                                <span className="text-[10px] font-black uppercase text-foreground/60">Uploading...</span>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase text-foreground">Header Image Opacity</Label>
                                            <div className="flex items-center gap-4 rounded-xl border bg-muted/5 px-4 py-3">
                                                <Slider
                                                    aria-label="Header image opacity"
                                                    value={[Math.round(headerBackgroundOpacity * 100)]}
                                                    onValueChange={(value) => setHeaderBackgroundOpacity(value[0] / 100)}
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    className="flex-1"
                                                />
                                                <span className="w-10 text-right text-[10px] font-black uppercase text-foreground/70">
                                                    {Math.round(headerBackgroundOpacity * 100)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-3 pt-2">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Glass Opacity</h4>
                                <p className="text-[9px] font-black uppercase italic text-foreground/60">Blends the background and blur level of the top bar.</p>
                                <div className="flex items-center gap-6 bg-muted/5 p-4 border rounded-xl">
                                    <Slider 
                                        aria-label="Glass Opacity" 
                                        value={[parseFloat(localStorage.getItem('safeviate-header-opacity') || '0.8') * 100]} 
                                        onValueChange={(value) => {
                                            const opacity = value[0] / 100;
                                            localStorage.setItem('safeviate-header-opacity', opacity.toString());
                                            window.dispatchEvent(new Event('storage'));
                                            // We need to trigger a re-render in AppHeader
                                            window.dispatchEvent(new Event('safeviate-header-opacity-updated'));
                                        }} 
                                        min={10} 
                                        max={100} 
                                        step={5} 
                                        className="flex-1" 
                                    />
                                    <span className="text-sm font-black text-primary w-12 text-right">
                                        {Math.round(parseFloat(localStorage.getItem('safeviate-header-opacity') || '0.8') * 100)}%
                                    </span>
                                </div>
                            </div>
                        </CollapsibleContent>
                    </section>
                </Collapsible>

                <Collapsible open={isSectionOpen('sidebar')} onOpenChange={() => toggleAdvancedSection('sidebar')}>
                    <section className="space-y-4">
                        <CollapsibleTrigger className="flex w-full items-center justify-between border-b pb-2 text-left">
                            <span className="text-[10px] font-black uppercase text-primary tracking-widest">Sidebar</span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${isSectionOpen('sidebar') ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4">
                            <p className="text-[9px] font-black uppercase italic text-foreground/60">Controls the sidebar base surface, button surface, and navigation contrast.</p>
                            {(() => {
                                const sidebarMenuSurface =
                                    sidebarTheme['sidebar-button-background'] ??
                                    sidebarTheme['sidebar-background'] ??
                                    '#e8f1fa';

                                return (
                            <div className="rounded-2xl border bg-muted/10 p-4 shadow-inner">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Sidebar Menu Surface</p>
                                    <p className="text-[9px] font-black uppercase tracking-tight text-foreground/75">Sets the fill behind each sidebar menu row.</p>
                                </div>
                                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="sidebar-button-background" className="text-[9px] font-black uppercase text-foreground">Sidebar Menu Surface</Label>
                                        <Input
                                            id="sidebar-button-background"
                                            type="color"
                                            value={sidebarMenuSurface}
                                            onChange={(e) => setSidebarThemeValue('sidebar-button-background', e.target.value)}
                                            className="p-1 h-10 w-full rounded-md cursor-pointer border shadow-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                                );
                            })()}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {Object.entries(sidebarTheme).map(([name, value]) => (
                                <div key={name} className="space-y-1.5">
                                    <Label htmlFor={name} className="text-[9px] font-black uppercase text-foreground">{formatLabel(name)}</Label>
                                    <Input id={name} type="color" value={value} onChange={(e) => setSidebarThemeValue(name as keyof typeof sidebarTheme, e.target.value)} className="p-1 h-10 w-full rounded-md cursor-pointer border shadow-sm" />
                                </div>
                                ))}
                            </div>
                            <Separator />
                            <div className="space-y-3 pt-2">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Sidebar Banner</h4>
                                <p className="text-[9px] font-black uppercase italic text-foreground/60">Upload an image for the sidebar background.</p>
                                <p className="text-[9px] font-black uppercase tracking-tight text-foreground/55">Recommended size: {SIDEBAR_BANNER_RECOMMENDED_SIZE}</p>
                                <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                                    <div className="overflow-hidden rounded-2xl border bg-muted/10">
                                        {sidebarBackgroundImage ? (
                                            <Image src={sidebarBackgroundImage} alt="Sidebar banner preview" width={440} height={320} className="h-36 w-full object-cover" unoptimized />
                                        ) : (
                                            <div className="flex h-36 items-center justify-center text-[9px] font-black uppercase tracking-widest text-foreground/50">
                                                No sidebar image
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => void handleThemeImageUpload(e.target.files?.[0], 'sidebar')}
                                            className="cursor-pointer"
                                        />
                                        <div className="flex gap-3">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="text-[10px] font-black uppercase"
                                                disabled={isUploadingSidebarImage}
                                                onClick={() => setSidebarBackgroundImage('')}
                                            >
                                                Remove Sidebar Image
                                            </Button>
                                            {isUploadingSidebarImage && (
                                                <span className="text-[10px] font-black uppercase text-foreground/60">Uploading...</span>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase text-foreground">Sidebar Image Opacity</Label>
                                            <div className="flex items-center gap-4 rounded-xl border bg-muted/5 px-4 py-3">
                                                <Slider
                                                    aria-label="Sidebar image opacity"
                                                    value={[Math.round(sidebarBackgroundOpacity * 100)]}
                                                    onValueChange={(value) => setSidebarBackgroundOpacity(value[0] / 100)}
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    className="flex-1"
                                                />
                                                <span className="w-10 text-right text-[10px] font-black uppercase text-foreground/70">
                                                    {Math.round(sidebarBackgroundOpacity * 100)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CollapsibleContent>
                    </section>
                </Collapsible>

                <Collapsible open={isSectionOpen('swimlanes')} onOpenChange={() => toggleAdvancedSection('swimlanes')}>
                    <section className="space-y-4">
                        <CollapsibleTrigger className="flex w-full items-center justify-between border-b pb-2 text-left">
                            <span className="text-[10px] font-black uppercase text-primary tracking-widest">Swimlanes</span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${isSectionOpen('swimlanes') ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4">
                            <p className="text-[9px] font-black uppercase italic text-foreground/60">Used in swimlane rows and table-like group headers.</p>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(swimlaneTheme).map(([name, value]) => (
                                <div key={name} className="space-y-1.5">
                                    <Label htmlFor={name} className="text-[9px] font-black uppercase text-foreground">{formatLabel(name)}</Label>
                                    <Input id={name} type="color" value={value} onChange={(e) => setSwimlaneThemeValue(name as keyof typeof swimlaneTheme, e.target.value)} className="p-1 h-10 w-full rounded-md cursor-pointer border shadow-sm" />
                                </div>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </section>
                </Collapsible>

                <Collapsible open={isSectionOpen('matrix')} onOpenChange={() => toggleAdvancedSection('matrix')}>
                    <section className="space-y-4">
                        <CollapsibleTrigger className="flex w-full items-center justify-between border-b pb-2 text-left">
                            <span className="text-[10px] font-black uppercase text-primary tracking-widest">Matrix Hierarchy</span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${isSectionOpen('matrix') ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4">
                            <p className="text-[9px] font-black uppercase italic text-foreground/60">Affects matrix headings and nested structure rows.</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.entries(matrixTheme).map(([name, value]) => (
                                <div key={name} className="space-y-1.5">
                                    <Label htmlFor={name} className="text-[9px] font-black uppercase text-foreground">{formatLabel(name)}</Label>
                                    <Input id={name} type="color" value={value} onChange={(e) => setMatrixThemeValue(name as keyof typeof matrixTheme, e.target.value)} className="p-1 h-10 w-full rounded-md cursor-pointer border shadow-sm" />
                                </div>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </section>
                </Collapsible>

                <Collapsible open={isSectionOpen('cards')} onOpenChange={() => toggleAdvancedSection('cards')}>
                    <section className="space-y-4">
                        <CollapsibleTrigger className="flex w-full items-center justify-between border-b pb-2 text-left">
                            <span className="text-[10px] font-black uppercase text-primary tracking-widest">Cards</span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${isSectionOpen('cards') ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4">
                            <p className="text-[9px] font-black uppercase italic text-foreground/60">Controls panels, cards, and their border treatment.</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {Object.entries(cardTheme).map(([name, value]) => (
                                <div key={name} className="space-y-1.5">
                                    <Label htmlFor={name} className="text-[9px] font-black uppercase text-foreground">{formatLabel(name)}</Label>
                                    <Input id={name} type="color" value={value} onChange={(e) => setCardThemeValue(name as keyof typeof cardTheme, e.target.value)} className="p-1 h-10 w-full rounded-md cursor-pointer border shadow-sm" />
                                </div>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </section>
                </Collapsible>

                <Collapsible open={isSectionOpen('popover')} onOpenChange={() => toggleAdvancedSection('popover')}>
                    <section className="space-y-4">
                        <CollapsibleTrigger className="flex w-full items-center justify-between border-b pb-2 text-left">
                            <span className="text-[10px] font-black uppercase text-primary tracking-widest">Popovers</span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${isSectionOpen('popover') ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4">
                            <p className="text-[9px] font-black uppercase italic text-foreground/60">Used by dropdowns, tooltips, and overlay surfaces.</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.entries(popoverTheme).map(([name, value]) => (
                                <div key={name} className="space-y-1.5">
                                    <Label htmlFor={name} className="text-[9px] font-black uppercase text-foreground">{formatLabel(name)}</Label>
                                    <Input id={name} type="color" value={value} onChange={(e) => setPopoverThemeValue(name as keyof typeof popoverTheme, e.target.value)} className="p-1 h-10 w-full rounded-md cursor-pointer border shadow-sm" />
                                </div>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </section>
                </Collapsible>

            </div>
        </div>

        <Separator />
        
        <div>
            <h2 className="text-sm font-black uppercase tracking-tight mb-1 text-foreground">Personal Browser Theme</h2>
            <p className='mb-4 text-[10px] font-black uppercase italic text-foreground/75'>Save your current look as a browser-only preset for this device.</p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <Input placeholder="Personal theme name..." value={themeName} onChange={(e) => setThemeName(e.target.value)} className="h-11 font-black text-sm uppercase placeholder:font-black placeholder:text-[10px] placeholder:italic" />
                <Button onClick={handleSaveTheme} className="w-full sm:w-auto h-11 px-10 text-[10px] font-black uppercase shadow-lg tracking-tight">Save Browser Preset</Button>
            </div>
        </div>

        {isMounted && savedThemes.length > 0 && (
            <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground/75">Saved Browser Presets</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedThemes.map((theme) => (
                        <div key={theme.name} className="flex items-center justify-between p-4 border rounded-2xl bg-background shadow-sm group hover:border-primary/20 transition-all">
                            <span className="font-black text-[10px] uppercase tracking-tight text-foreground">{theme.name}</span>
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="outline" size="sm" onClick={() => handleApplyTheme(theme)} className="h-8 px-4 text-[9px] font-black uppercase border-slate-300">Apply</Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteTheme(theme.name)} className="h-8 w-8 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <Separator />

        <div className="flex justify-start">
            <Button onClick={handleReset} variant="outline" className="text-[10px] font-black uppercase h-11 px-10 border-slate-300 hover:bg-muted/50 shadow-sm">Reset This Device Only</Button>
        </div>
    </div>
  );

  if (!showHeader) {
      return content;
  }

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-none border">
      <CardHeader className="shrink-0 border-b bg-muted/10">
        <CardTitle className="text-xl font-black uppercase tracking-tight">Appearance Customization</CardTitle>
        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tailor the visual environment to your organization's brand identity.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full">
          {content}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
