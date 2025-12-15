
'use client';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import { useTheme, type SavedTheme } from '@/components/theme-provider';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

// Define a type for the tenant's theme from Firestore
type TenantTheme = {
    id: string;
    name: string;
    theme?: {
        primaryColour?: string;
        backgroundColour?: string;
        accentColour?: string;
    }
}

export function ColorThemeForm() {
  const { toast } = useToast();
  const firestore = useFirestore();
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

  // Fetch tenants to use as themes
  const tenantsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'tenants') : null),
    [firestore]
  );
  const { data: tenants, isLoading: isLoadingTenants } = useCollection<TenantTheme>(tenantsQuery);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleApplyTenantTheme = (tenantId: string) => {
    const tenant = tenants?.find(t => t.id === tenantId);
    if (!tenant?.theme) {
        toast({
            variant: "destructive",
            title: "Theme Not Found",
            description: "The selected tenant does not have a configured theme.",
        });
        return;
    }
    
    // Create a theme object that matches the structure `applySavedTheme` expects
    const themeToApply: Partial<SavedTheme> = {
        name: tenant.name,
        colors: {
            primary: tenant.theme.primaryColour || theme.primary,
            background: tenant.theme.backgroundColour || theme.background,
            accent: tenant.theme.accentColour || theme.accent,
        },
        buttonColors: {
            'button-primary-background': tenant.theme.primaryColour || buttonTheme['button-primary-background'],
            'button-primary-foreground': buttonTheme['button-primary-foreground'],
            'button-primary-accent': tenant.theme.accentColour || buttonTheme['button-primary-accent'],
            'button-primary-accent-foreground': buttonTheme['button-primary-accent-foreground'],
        },
        cardColors: { card: tenant.theme.backgroundColour || cardTheme.card, 'card-foreground': cardTheme['card-foreground'] },
        popoverColors: { popover: tenant.theme.backgroundColour || popoverTheme.popover, 'popover-foreground': popoverTheme['popover-foreground'] },
        sidebarColors: sidebarTheme, // Keep sidebar as is or define in tenant
        headerColors: { 'header-background': tenant.theme.backgroundColour || headerTheme['header-background'], 'header-foreground': headerTheme['header-foreground'], 'header-border': headerTheme['header-border'] },
        swimlaneColors: swimlaneTheme,
        scale: scale,
    };

    applySavedTheme(themeToApply as SavedTheme);
    
    toast({
        title: "Tenant Theme Applied",
        description: `The theme for "${tenant.name}" has been applied.`,
    });
  };

  const handleSaveTheme = () => {
    if (!themeName.trim()) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Please enter a name for the theme.",
        });
        return;
    }
    saveCurrentTheme(themeName);
    setThemeName('');
    toast({
        title: "Theme Saved",
        description: `The theme "${themeName}" has been saved.`,
    });
  };

  const handleApplyTheme = (themeToApply: SavedTheme) => {
    applySavedTheme(themeToApply);
    toast({
        title: "Theme Applied",
        description: `The "${themeToApply.name}" theme has been loaded.`,
    });
  };

  const handleDeleteTheme = (themeNameToDelete: string) => {
    deleteSavedTheme(themeNameToDelete);
    toast({
        title: "Theme Deleted",
        description: `The theme "${themeNameToDelete}" has been deleted.`,
    });
  };
  
  const handleReset = () => {
    resetToDefaults();
    toast({
        title: "Theme Reset",
        description: "The theme has been reset to its default values.",
    });
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize the look and feel of the application.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
            <h3 className="text-lg font-medium mb-2">UI Scaling</h3>
            <p className='text-sm text-muted-foreground mb-4'>Adjust the overall size of the application interface.</p>
            <div className='flex items-center gap-4'>
                <Slider
                    value={[scale]}
                    onValueChange={(value) => setScale(value[0])}
                    min={75}
                    max={150}
                    step={5}
                />
                <span className='text-sm font-medium text-muted-foreground w-16 text-center'>{scale}%</span>
            </div>
        </div>
        
        <Separator />

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
          <h3 className="text-lg font-medium mb-4">Main Theme</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(theme).map(([name, value]) => (
              <div key={name} className="space-y-2">
                <Label htmlFor={name} className="capitalize">{name}</Label>
                <div className='relative'>
                  <Input
                    id={name}
                    type="color"
                    value={value}
                    onChange={(e) => setThemeValue(name as keyof typeof theme, e.target.value)}
                    className="p-1 h-10"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
            <h3 className="text-lg font-medium mb-4">Primary Button Theme</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(buttonTheme).map(([name, value]) => (
                <div key={name} className="space-y-2">
                    <Label htmlFor={name} className="capitalize">{name.replace('button-primary-', '').replace('-', ' ')}</Label>
                    <div className='relative'>
                    <Input
                        id={name}
                        type="color"
                        value={value}
                        onChange={(e) => setButtonThemeValue(name as keyof typeof buttonTheme, e.target.value)}
                        className="p-1 h-10"
                    />
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
                <Label htmlFor={name} className="capitalize">{name.replace('header-', '')}</Label>
                <div className='relative'>
                  <Input
                    id={name}
                    type="color"
                    value={value}
                    onChange={(e) => setHeaderThemeValue(name as keyof typeof headerTheme, e.target.value)}
                    className="p-1 h-10"
                  />
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
                <Label htmlFor={name} className="capitalize">{name.replace('swimlane-header-', '')}</Label>
                <div className='relative'>
                  <Input
                    id={name}
                    type="color"
                    value={value}
                    onChange={(e) => setSwimlaneThemeValue(name as keyof typeof swimlaneTheme, e.target.value)}
                    className="p-1 h-10"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <Separator />

        <div>
          <h3 className="text-lg font-medium mb-4">Card Theme</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(cardTheme).map(([name, value]) => (
              <div key={name} className="space-y-2">
                <Label htmlFor={name} className="capitalize">{name.replace('card-', '')}</Label>
                <div className='relative'>
                  <Input
                    id={name}
                    type="color"
                    value={value}
                    onChange={(e) => setCardThemeValue(name as keyof typeof cardTheme, e.target.value)}
                    className="p-1 h-10"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />
        
        <div>
          <h3 className="text-lg font-medium mb-4">Popover & Dropdown Theme</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(popoverTheme).map(([name, value]) => (
              <div key={name} className="space-y-2">
                <Label htmlFor={name} className="capitalize">{name.replace('popover-', '')}</Label>
                <div className='relative'>
                  <Input
                    id={name}
                    type="color"
                    value={value}
                    onChange={(e) => setPopoverThemeValue(name as keyof typeof popoverTheme, e.target.value)}
                    className="p-1 h-10"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <Separator />

        <div>
          <h3 className="text-lg font-medium mb-4">Sidebar Theme</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(sidebarTheme).map(([name, value]) => (
              <div key={name} className="space-y-2">
                <Label htmlFor={name} className="capitalize">{name.replace('sidebar-', '')}</Label>
                <div className='relative'>
                  <Input
                    id={name}
                    type="color"
                    value={value}
                    onChange={(e) => setSidebarThemeValue(name as keyof typeof sidebarTheme, e.target.value)}
                    className="p-1 h-10"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />
        
        <div>
            <h3 className="text-lg font-medium mb-4">Save Current Theme</h3>
            <div className="flex items-center gap-2">
                <Input 
                    placeholder="Enter theme name" 
                    value={themeName} 
                    onChange={(e) => setThemeName(e.target.value)}
                />
                <Button onClick={handleSaveTheme}>Save Theme</Button>
            </div>
        </div>

        {isMounted && savedThemes.length > 0 && <Separator />}

        {isMounted && savedThemes.length > 0 && (
            <div>
                <h3 className="text-lg font-medium mb-4">Saved Themes (Local)</h3>
                <div className="space-y-2">
                    {savedThemes.map((theme) => (
                        <div key={theme.name} className="flex items-center justify-between p-2 border rounded-lg">
                            <span className="font-medium">{theme.name}</span>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleApplyTheme(theme)}>Apply</Button>
                                <Button variant="destructive" size="icon" onClick={() => handleDeleteTheme(theme.name)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <Separator />

        <Button onClick={handleReset} variant="outline">Reset to Defaults</Button>
      </CardContent>
    </Card>
  );
}
