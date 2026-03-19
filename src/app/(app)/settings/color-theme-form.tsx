'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Globe, Save } from 'lucide-react';
import { useTheme, type SavedTheme } from '@/components/theme-provider';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Tenant } from '@/types/quality';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';

export function ColorThemeForm() {
  const { toast } = useToast();
  const firestore = useFirestore();
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
    headerTheme, 
    setHeaderThemeValue,
    swimlaneTheme,
    setSwimlaneThemeValue,
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

  const canManageOrganization = hasPermission('admin-settings-manage');

  // Fetch tenants to use as themes
  const tenantsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'tenants') : null),
    [firestore]
  );
  const { data: tenants, isLoading: isLoadingTenants } = useCollection<Tenant>(tenantsQuery);

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
        headerColors: (tenant.theme.header as any) || { 
            'header-background': tenant.theme.backgroundColour || headerTheme['header-background'], 
            'header-foreground': headerTheme['header-foreground'], 
            'header-border': headerTheme['header-border'] 
        },
        swimlaneColors: (tenant.theme.swimlane as any) || swimlaneTheme,
        scale: scale,
    };

    applySavedTheme(themeToApply);
    
    toast({ title: "Tenant Theme Applied", description: `The theme for "${tenant.name}" has been applied.` });
  };

  const handleSaveToOrganization = () => {
    if (!firestore || !tenantId) return;
    
    const tenantRef = doc(firestore, 'tenants', tenantId);
    
    const dataToSave = {
      theme: {
        primaryColour: theme.primary,
        backgroundColour: theme.background,
        accentColour: theme.accent,
        main: theme,
        button: buttonTheme,
        card: cardTheme,
        popover: popoverTheme,
        sidebar: sidebarTheme,
        header: headerTheme,
        swimlane: swimlaneTheme,
      }
    };

    updateDocumentNonBlocking(tenantRef, dataToSave);
    
    toast({
      title: "Organization Default Updated",
      description: "These branding settings have been saved as the default for all members of your organization."
    });
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
    toast({ title: "Theme Reset", description: "The theme has been reset to its default values." });
  }

  const formatLabel = (key: string) => {
    const clean = key.replace('popover-', '').replace('button-primary-', '').replace('sidebar-', '').replace('header-', '').replace('swimlane-header-', '');
    if (clean === 'popover' || clean === 'card' || clean === 'background') return 'Background';
    if (clean === 'foreground') return 'Text';
    if (clean === 'accent') return 'Selection / Hover';
    if (clean === 'accent-foreground') return 'Selection Text';
    return clean.replace(/-/g, ' ');
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-none border">
      <CardHeader className="shrink-0 border-b bg-muted/10">
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize the look and feel of the application.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-8 pb-24">
            <div>
                <h3 className="text-lg font-medium mb-2">UI Scaling</h3>
                <p className='text-sm text-muted-foreground mb-4'>Adjust the overall size of the application interface. Supports scaling down to 50% for high-density mobile views.</p>
                <div className='flex items-center gap-4'>
                    <Slider value={[scale]} onValueChange={(value) => setScale(value[0])} min={50} max={150} step={5} />
                    <span className='text-sm font-medium text-muted-foreground w-16 text-center'>{scale}%</span>
                </div>
            </div>
            
            <Separator />

            {canManageOrganization && (
                <>
                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                            <Globe className="h-5 w-5 text-primary" />
                            Organization Branding
                        </h3>
                        <p className='text-sm text-muted-foreground mb-4'>
                            As an administrator, you can set the default branding for all members of your organization.
                        </p>
                        <Button onClick={handleSaveToOrganization} className="w-full sm:w-auto">
                            <Save className="mr-2 h-4 w-4" /> Save as Organization Default
                        </Button>
                    </div>
                    <Separator />
                </>
            )}

            <div>
                <h3 className="text-lg font-medium mb-2">Set Theme from Tenant</h3>
                <p className='text-sm text-muted-foreground mb-4'>Override the current theme with a saved tenant configuration.</p>
                <Select onValueChange={handleApplyTenantTheme} disabled={isLoadingTenants}>
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder={isLoadingTenants ? "Loading themes..." : "Select a tenant theme"} />
                    </SelectTrigger>
                    <SelectContent>
                        {(tenants || []).map(tenant => (
                            <SelectItem key={tenant.id} value={tenant.id} disabled={!tenant.theme}>
                                {tenant.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Separator />
          
            <div>
                <h3 className="text-lg font-medium mb-2">Main Theme</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4 p-4 border rounded-lg">
                        <h4 className="font-semibold">Primary Colors</h4>
                        <div className="space-y-2">
                            <Label htmlFor="primary">Primary</Label>
                            <Input id="primary" type="color" value={theme.primary} onChange={(e) => setThemeValue('primary', e.target.value)} className="p-1 h-10" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="primary-foreground">Primary Foreground</Label>
                            <Input id="primary-foreground" type="color" value={theme['primary-foreground']} onChange={(e) => setThemeValue('primary-foreground', e.target.value)} className="p-1 h-10" />
                        </div>
                    </div>
                    <div className="space-y-4 p-4 border rounded-lg">
                        <h4 className="font-semibold">Accent &amp; Background</h4>
                        <div className="space-y-2">
                            <Label htmlFor="background">Background</Label>
                            <Input id="background" type="color" value={theme.background} onChange={(e) => setThemeValue('background', e.target.value)} className="p-1 h-10" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="accent">Accent</Label>
                            <Input id="accent" type="color" value={theme.accent} onChange={(e) => setThemeValue('accent', e.target.value)} className="p-1 h-10" />
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            <div>
                <h3 className="text-lg font-medium mb-4">Primary Button Theme</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(buttonTheme).map(([name, value]) => (
                    <div key={name} className="space-y-2">
                        <Label htmlFor={name} className="capitalize">{formatLabel(name)}</Label>
                        <div className='relative'>
                        <Input id={name} type="color" value={value} onChange={(e) => setButtonThemeValue(name as keyof typeof buttonTheme, e.target.value)} className="p-1 h-10" />
                        </div>
                    </div>
                    ))}
                </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-4">Header Theme</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(headerTheme).map(([name, value]) => (
                  <div key={name} className="space-y-2">
                    <Label htmlFor={name} className="capitalize">{formatLabel(name)}</Label>
                    <div className='relative'>
                      <Input id={name} type="color" value={value} onChange={(e) => setHeaderThemeValue(name as keyof typeof headerTheme, e.target.value)} className="p-1 h-10" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-medium mb-4">Swimlane Header Theme</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(swimlaneTheme).map(([name, value]) => (
                  <div key={name} className="space-y-2">
                    <Label htmlFor={name} className="capitalize">{formatLabel(name)}</Label>
                    <div className='relative'>
                      <Input id={name} type="color" value={value} onChange={(e) => setSwimlaneThemeValue(name as keyof typeof swimlaneTheme, e.target.value)} className="p-1 h-10" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-4">Card Theme</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(cardTheme).map(([name, value]) => (
                  <div key={name} className="space-y-2">
                    <Label htmlFor={name} className="capitalize">{formatLabel(name)}</Label>
                    <div className='relative'>
                      <Input id={name} type="color" value={value} onChange={(e) => setCardThemeValue(name as keyof typeof cardTheme, e.target.value)} className="p-1 h-10" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />
            
            <div>
              <h3 className="text-lg font-medium mb-4">Popover &amp; Dropdown Theme</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(popoverTheme).map(([name, value]) => (
                  <div key={name} className="space-y-2">
                    <Label htmlFor={name} className="capitalize">{formatLabel(name)}</Label>
                    <div className='relative'>
                      <Input id={name} type="color" value={value} onChange={(e) => setPopoverThemeValue(name as keyof typeof popoverTheme, e.target.value)} className="p-1 h-10" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-4">Sidebar Theme</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(sidebarTheme).map(([name, value]) => (
                  <div key={name} className="space-y-2">
                    <Label htmlFor={name} className="capitalize">{formatLabel(name)}</Label>
                    <div className='relative'>
                      <Input id={name} type="color" value={value} onChange={(e) => setSidebarThemeValue(name as keyof typeof sidebarTheme, e.target.value)} className="p-1 h-10" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />
            
            <div>
                <h3 className="text-lg font-medium mb-4">Save Current Theme (Personal)</h3>
                <div className="flex items-center gap-2">
                    <Input placeholder="Enter theme name" value={themeName} onChange={(e) => setThemeName(e.target.value)} />
                    <Button onClick={handleSaveTheme}>Save Personal Theme</Button>
                </div>
            </div>

            {isMounted && savedThemes.length > 0 && <Separator />}

            {isMounted && savedThemes.length > 0 && (
                <div>
                    <h3 className="text-lg font-medium mb-4">Saved Personal Themes</h3>
                    <div className="space-y-2">
                        {savedThemes.map((theme) => (
                            <div key={theme.name} className="flex items-center justify-between p-2 border rounded-lg">
                                <span className="font-medium">{theme.name}</span>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => handleApplyTheme(theme)}>Apply</Button>
                                    <Button variant="destructive" size="icon" onClick={() => handleDeleteTheme(theme.name)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Separator />

            <Button onClick={handleReset} variant="outline">Reset to Defaults</Button>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
