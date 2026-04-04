'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Globe, Save } from 'lucide-react';
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
    headerTheme, 
    setHeaderThemeValue,
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
  const [sidebarImageUrl, setSidebarImageUrl] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(true);

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

        if (tenant) {
          setTenants([{ ...tenant, ...(tenantConfig || {}) }]);
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
    try {
        const updatedTenant = {
            id: tenantId || 'safeviate',
            theme: {
                primaryColour: theme.primary,
                backgroundColour: theme.background,
                accentColour: theme.accent,
                main: theme,
                button: buttonTheme,
                card: cardTheme,
                popover: popoverTheme,
                sidebar: sidebarTheme,
                sidebarBackgroundImage,
                header: headerTheme,
                swimlane: swimlaneTheme,
                matrix: matrixTheme,
            }
        };

        const response = await fetch('/api/tenant-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: updatedTenant }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || 'Could not save tenant configuration.');
        }

        window.dispatchEvent(new Event('safeviate-tenant-config-updated'));
        loadTenants();

        toast({
            title: "Organization Default Updated",
            description: "These branding settings have been saved as the default for all members of your organization."
        });
    } catch (e) {
      toast({ variant: "destructive", title: "Save Failed", description: "The organization branding could not be saved." });
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
    if (!tenant?.theme) {
        toast({ variant: "destructive", title: "Theme Not Found", description: "The selected tenant does not have a configured theme." });
        return;
    }
    
    const themeToApply: SavedTheme = {
        name: tenant.name,
        colors: (tenant.theme.main as any) || {
            primary: tenant.theme.primaryColour || theme.primary,
            'primary-foreground': theme['primary-foreground'],
            background: tenant.theme.backgroundColour || theme.background,
            accent: tenant.theme.accentColour || theme.accent,
        },
        buttonColors: (tenant.theme.button as any) || {
            'button-primary-background': tenant.theme.primaryColour || buttonTheme['button-primary-background'],
            'button-primary-foreground': buttonTheme['button-primary-foreground'],
            'button-primary-accent': tenant.theme.accentColour || buttonTheme['button-primary-accent'],
            'button-primary-accent-foreground': buttonTheme['button-primary-accent-foreground'],
        },
        cardColors: (tenant.theme.card as any) || { 
            card: tenant.theme.backgroundColour || cardTheme.card, 
            'card-foreground': cardTheme['card-foreground'],
            'card-border': cardTheme['card-border']
        },
        popoverColors: (tenant.theme.popover as any) || { 
            popover: tenant.theme.backgroundColour || popoverTheme.popover, 
            'popover-foreground': popoverTheme['popover-foreground'],
            'popover-accent': popoverTheme['popover-accent'],
            'popover-accent-foreground': popoverTheme['popover-accent-foreground'],
        },
        sidebarColors: (tenant.theme.sidebar as any) || {
            'sidebar-background': tenant.theme.backgroundColour || sidebarTheme['sidebar-background'],
            'sidebar-foreground': sidebarTheme['sidebar-foreground'],
            'sidebar-accent': tenant.theme.accentColour || sidebarTheme['sidebar-accent'],
            'sidebar-accent-foreground': sidebarTheme['sidebar-accent-foreground'],
            'sidebar-border': sidebarTheme['sidebar-border'],
        },
        sidebarBackgroundImage: tenant.theme.sidebarBackgroundImage || sidebarBackgroundImage,
        headerColors: (tenant.theme.header as any) || { 
            'header-background': tenant.theme.backgroundColour || headerTheme['header-background'], 
            'header-foreground': headerTheme['header-foreground'], 
            'header-border': headerTheme['header-border'] 
        },
        swimlaneColors: (tenant.theme.swimlane as any) || swimlaneTheme,
        matrixColors: (tenant.theme.matrix as any) || matrixTheme,
        scale: scale,
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
    toast({ title: "Browser Theme Reset", description: "Your local browser theme overrides have been cleared for this company." });
  }

  const handleApplySidebarBackgroundUrl = () => {
    const trimmed = sidebarImageUrl.trim();
    if (!trimmed) {
      toast({ variant: 'destructive', title: 'No Image URL', description: 'Paste a direct image URL first.' });
      return;
    }

    setSidebarBackgroundImage(trimmed);
    setSidebarImageUrl('');
    toast({ title: 'Sidebar Background Applied', description: 'The image URL has been applied to the sidebar preview.' });
  };

  const formatLabel = (key: string) => {
    const clean = key.replace('popover-', '').replace('button-primary-', '').replace('sidebar-', '').replace('header-', '').replace('swimlane-header-', '');
    if (clean === 'popover' || clean === 'card' || clean === 'background') return 'Background';
    if (clean === 'foreground') return 'Text';
    if (clean === 'accent') return 'Selection / Hover';
    if (clean === 'accent-foreground') return 'Selection Text';
    return clean.replace(/-/g, ' ');
  };

  const content = (
    <div className="p-6 space-y-8 pb-24">
        <div>
            <h3 className="text-sm font-black uppercase tracking-tight mb-1 text-foreground">UI Scaling</h3>
            <p className='text-[10px] text-muted-foreground font-black uppercase italic mb-4 opacity-70'>Adjust the overall size of the application interface.</p>
            <div className='flex items-center gap-6 bg-muted/5 p-4 border rounded-xl'>
                <Slider value={[scale]} onValueChange={(value) => setScale(value[0])} min={50} max={150} step={5} className="flex-1" />
                <span className='text-sm font-black text-primary w-12 text-right'>{scale}%</span>
            </div>
        </div>
        
        <Separator />

        {canManageOrganization && (
            <>
                <div className="bg-primary/5 p-5 rounded-2xl border border-primary/20 space-y-4 shadow-sm">
                    <div className="space-y-1">
                        <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                            <Globe className="h-4 w-4" />
                            Organization Branding
                        </h3>
                        <p className='text-[9px] text-muted-foreground font-black uppercase italic opacity-75'>
                            Set the default branding for all members of your organization.
                        </p>
                    </div>
                    <Button onClick={handleSaveToOrganization} className="w-full sm:w-auto text-[10px] font-black uppercase h-9 px-8 shadow-md">
                        <Save className="mr-2 h-4 w-4" /> Save as Organization Default
                    </Button>
                </div>
                <Separator />
            </>
        )}

        <div>
            <h3 className="text-sm font-black uppercase tracking-tight mb-1 text-foreground">Set Theme from Tenant</h3>
            <p className='text-[10px] text-muted-foreground font-black uppercase italic mb-4 opacity-70'>Override the current theme with a saved tenant configuration.</p>
            <Select onValueChange={handleApplyTenantTheme} disabled={isLoadingTenants || tenants.length === 0}>
                <SelectTrigger className="w-full sm:w-[320px] h-11 font-black uppercase text-[10px] border-2">
                    <SelectValue placeholder={isLoadingTenants ? "Loading themes..." : (tenants.length === 0 ? "No tenant config found" : "Select a tenant theme")} />
                </SelectTrigger>
                <SelectContent>
                    {(tenants || []).map(tenant => (
                        <SelectItem key={tenant.id} value={tenant.id} disabled={!tenant.theme} className="font-bold text-[10px] uppercase">
                            {tenant.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        <Separator />
      
        <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-tight text-foreground">Main Theme Colors</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 p-5 border rounded-2xl bg-muted/5 shadow-inner">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-70">Primary Palette</h4>
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
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-70">Base &amp; Accent</h4>
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
            <h3 className="text-sm font-black uppercase tracking-tight mb-4 text-foreground">Advanced Component Theming</h3>
            <div className="space-y-10">
                <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-2">Primary Buttons</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(buttonTheme).map(([name, value]) => (
                        <div key={name} className="space-y-1.5">
                            <Label htmlFor={name} className="text-[9px] font-black uppercase text-muted-foreground">{formatLabel(name)}</Label>
                            <Input id={name} type="color" value={value} onChange={(e) => setButtonThemeValue(name as keyof typeof buttonTheme, e.target.value)} className="p-1 h-10 w-full rounded-md cursor-pointer border shadow-sm" />
                        </div>
                        ))}
                    </div>
                </section>

                <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-2">Headers</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(headerTheme).map(([name, value]) => (
                        <div key={name} className="space-y-1.5">
                            <Label htmlFor={name} className="text-[9px] font-black uppercase text-muted-foreground">{formatLabel(name)}</Label>
                            <Input id={name} type="color" value={value} onChange={(e) => setHeaderThemeValue(name as keyof typeof headerTheme, e.target.value)} className="p-1 h-10 w-full rounded-md cursor-pointer border shadow-sm" />
                        </div>
                        ))}
                    </div>
                </section>

                <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-2">Swimlanes</h4>
                    <div className="grid grid-cols-2 gap-4">
                        {Object.entries(swimlaneTheme).map(([name, value]) => (
                        <div key={name} className="space-y-1.5">
                            <Label htmlFor={name} className="text-[9px] font-black uppercase text-muted-foreground">{formatLabel(name)}</Label>
                            <Input id={name} type="color" value={value} onChange={(e) => setSwimlaneThemeValue(name as keyof typeof swimlaneTheme, e.target.value)} className="p-1 h-10 w-full rounded-md cursor-pointer border shadow-sm" />
                        </div>
                        ))}
                    </div>
                </section>

                <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-2">Matrix Hierarchy</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(matrixTheme).map(([name, value]) => (
                        <div key={name} className="space-y-1.5">
                            <Label htmlFor={name} className="text-[9px] font-black uppercase text-muted-foreground">{formatLabel(name)}</Label>
                            <Input id={name} type="color" value={value} onChange={(e) => setMatrixThemeValue(name as keyof typeof matrixTheme, e.target.value)} className="p-1 h-10 w-full rounded-md cursor-pointer border shadow-sm" />
                        </div>
                        ))}
                    </div>
                </section>

                <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-2">Cards</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(cardTheme).map(([name, value]) => (
                        <div key={name} className="space-y-1.5">
                            <Label htmlFor={name} className="text-[9px] font-black uppercase text-muted-foreground">{formatLabel(name)}</Label>
                            <Input id={name} type="color" value={value} onChange={(e) => setCardThemeValue(name as keyof typeof cardTheme, e.target.value)} className="p-1 h-10 w-full rounded-md cursor-pointer border shadow-sm" />
                        </div>
                        ))}
                    </div>
                </section>

                <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-2">Popovers &amp; Sidebar</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[...Object.entries(popoverTheme), ...Object.entries(sidebarTheme)].map(([name, value]) => (
                        <div key={name} className="space-y-1.5">
                            <Label htmlFor={name} className="text-[9px] font-black uppercase text-muted-foreground">{formatLabel(name)}</Label>
                            <Input id={name} type="color" value={value} onChange={(e) => (popoverTheme as any)[name] !== undefined ? setPopoverThemeValue(name as any, e.target.value) : setSidebarThemeValue(name as any, e.target.value)} className="p-1 h-10 w-full rounded-md cursor-pointer border shadow-sm" />
                        </div>
                        ))}
                    </div>
                    <div className="space-y-3 rounded-2xl border bg-muted/10 p-5 shadow-inner mt-4">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Sidebar Background Image</p>
                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-tight opacity-75">Paste a direct image URL to use it for the sidebar background.</p>
                            <div className="flex flex-col gap-2 sm:flex-row mt-2">
                                <Input
                                value={sidebarImageUrl}
                                onChange={(e) => setSidebarImageUrl(e.target.value)}
                                placeholder="https://example.com/texture.jpg"
                                className="h-11 flex-1 font-bold text-sm bg-background"
                                />
                                <Button type="button" variant="outline" className="h-11 px-6 font-black uppercase text-[10px] border-slate-300 shadow-sm" onClick={handleApplySidebarBackgroundUrl}>
                                Apply URL
                                </Button>
                            </div>
                        </div>
                        {sidebarBackgroundImage ? (
                            <div className="relative h-40 overflow-hidden rounded-xl border-2 shadow-sm mt-2">
                                <Image
                                src={sidebarBackgroundImage}
                                alt="Sidebar background preview"
                                fill
                                className="object-cover"
                                unoptimized
                                />
                                <div className='absolute top-2 right-2'>
                                    <Button size="icon" variant="destructive" onClick={() => setSidebarBackgroundImage('')} className="h-8 w-8 shadow-lg"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        ) : (
                        <div className="rounded-xl border-2 border-dashed p-8 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-background/50">
                            No sidebar background selected
                        </div>
                        )}
                    </div>
                </section>
            </div>
        </div>

        <Separator />
        
        <div>
            <h3 className="text-sm font-black uppercase tracking-tight mb-1 text-foreground">Personal Theme Storage</h3>
            <p className='text-[10px] text-muted-foreground font-black uppercase italic mb-4 opacity-70'>Save your current overrides as a personal theme for later use.</p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <Input placeholder="Personal theme name..." value={themeName} onChange={(e) => setThemeName(e.target.value)} className="h-11 font-black text-sm uppercase placeholder:font-black placeholder:text-[10px] placeholder:italic" />
                <Button onClick={handleSaveTheme} className="w-full sm:w-auto h-11 px-10 text-[10px] font-black uppercase shadow-lg tracking-tight">Save Personal Theme</Button>
            </div>
        </div>

        {isMounted && savedThemes.length > 0 && (
            <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-70">Saved Personal Themes</h4>
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
            <Button onClick={handleReset} variant="outline" className="text-[10px] font-black uppercase h-11 px-10 border-slate-300 hover:bg-muted/50 shadow-sm">Reset Browser Overrides</Button>
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
