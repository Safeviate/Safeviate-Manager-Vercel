'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { hexToHsl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import PageHeader from '@/components/page-header';

type ThemeColors = {
  background: string;
  primary: string;
  accent: string;
};

type CardThemeColors = {
    card: string;
    'card-foreground': string;
}

type SidebarThemeColors = {
  'sidebar-background': string;
  'sidebar-foreground': string;
  'sidebar-primary': string;
  'sidebar-primary-foreground': string;
  'sidebar-accent': string;
  'sidebar-accent-foreground': string;
  'sidebar-border': string;
};

type HeaderThemeColors = {
  'header-background': string;
  'header-foreground': string;
  'header-border': string;
};

type SavedTheme = {
    name: string;
    colors: ThemeColors;
    cardColors: CardThemeColors;
    sidebarColors: SidebarThemeColors;
    headerColors: HeaderThemeColors;
};

// Helper to get CSS variable in HSL string format
const getCssVar = (name: string) => {
    if (typeof window === 'undefined') return '';
    const val = getComputedStyle(document.documentElement).getPropertyValue(name);
    // Convert from '205 67% 95%' to 'hsl(205, 67%, 95%)' for color input
    return `hsl(${val.trim().replace(/ /g, ', ')})`;
};

// Helper to convert HSL string to Hex
function hslToHex(hsl: string) {
    if (!hsl) return '#000000';
    let [h, s, l] = hsl.match(/\d+/g)!.map(Number);
    s /= 100;
    l /= 100;

    let c = (1 - Math.abs(2 * l - 1)) * s,
        x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
        m = l - c / 2,
        r = 0,
        g = 0,
        b = 0;

    if (0 <= h && h < 60) {
        r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
        r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
        r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
        r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
        r = c; g = 0; b = x;
    }
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    
    const toHex = (c: number) => ('0' + c.toString(16)).slice(-2);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}


export function ColorThemeForm() {
  const { toast } = useToast();
  const [themeName, setThemeName] = useState('');
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>([]);

  const [colors, setColors] = useState<ThemeColors>({
    background: '#ebf5fb',
    primary: '#7cc4f7',
    accent: '#63b2a7',
  });
  const [cardColors, setCardColors] = useState<CardThemeColors>({
    card: '#ebf5fb',
    'card-foreground': '#1e293b',
  });
  const [sidebarColors, setSidebarColors] = useState<SidebarThemeColors>({
    'sidebar-background': '#dbeafb',
    'sidebar-foreground': '#1e293b',
    'sidebar-primary': '#bfdbfe',
    'sidebar-primary-foreground': '#1e293b',
    'sidebar-accent': '#f1f5f9',
    'sidebar-accent-foreground': '#1e293b',
    'sidebar-border': '#94a3b8',
  });
  const [headerColors, setHeaderColors] = useState<HeaderThemeColors>({
    'header-background': '#ebf5fb',
    'header-foreground': '#1e293b',
    'header-border': '#e2e8f0',
  });

  const loadCurrentColorsFromDOM = () => {
    setColors({
      background: hslToHex(getCssVar('--background')),
      primary: hslToHex(getCssVar('--primary')),
      accent: hslToHex(getCssVar('--accent')),
    });
    setCardColors({
      'card': hslToHex(getCssVar('--card')),
      'card-foreground': hslToHex(getCssVar('--card-foreground')),
    });
    setSidebarColors({
      'sidebar-background': hslToHex(getCssVar('--sidebar-background')),
      'sidebar-foreground': hslToHex(getCssVar('--sidebar-foreground')),
      'sidebar-primary': hslToHex(getCssVar('--sidebar-primary')),
      'sidebar-primary-foreground': hslToHex(getCssVar('--sidebar-primary-foreground')),
      'sidebar-accent': hslToHex(getCssVar('--sidebar-accent')),
      'sidebar-accent-foreground': hslToHex(getCssVar('--sidebar-accent-foreground')),
      'sidebar-border': hslToHex(getCssVar('--sidebar-border')),
    });
    setHeaderColors({
      'header-background': hslToHex(getCssVar('--header-background')),
      'header-foreground': hslToHex(getCssVar('--header-foreground')),
      'header-border': hslToHex(getCssVar('--header-border')),
    });
  }
  
  const applyTheme = (theme: SavedTheme) => {
    handleColorChange('background', theme.colors.background, false);
    handleColorChange('primary', theme.colors.primary, false);
    handleColorChange('accent', theme.colors.accent);

    handleCardColorChange('card', theme.cardColors.card, false);
    handleCardColorChange('card-foreground', theme.cardColors['card-foreground']);

    handleSidebarColorChange('sidebar-background', theme.sidebarColors['sidebar-background'], false);
    handleSidebarColorChange('sidebar-foreground', theme.sidebarColors['sidebar-foreground'], false);
    handleSidebarColorChange('sidebar-primary', theme.sidebarColors['sidebar-primary'], false);
    handleSidebarColorChange('sidebar-primary-foreground', theme.sidebarColors['sidebar-primary-foreground'], false);
    handleSidebarColorChange('sidebar-accent', theme.sidebarColors['sidebar-accent'], false);
    handleSidebarColorChange('sidebar-accent-foreground', theme.sidebarColors['sidebar-accent-foreground'], false);
    handleSidebarColorChange('sidebar-border', theme.sidebarColors['sidebar-border']);

    handleHeaderColorChange('header-background', theme.headerColors['header-background'], false);
    handleHeaderColorChange('header-foreground', theme.headerColors['header-foreground'], false);
    handleHeaderColorChange('header-border', theme.headerColors['header-border']);

    toast({
        title: "Theme Applied",
        description: `The "${theme.name}" theme has been loaded.`,
    });
  }

  useEffect(() => {
    const savedThemesStr = localStorage.getItem('safeviate-saved-themes');
    if (savedThemesStr) {
        setSavedThemes(JSON.parse(savedThemesStr));
    }

    const savedColors = localStorage.getItem('safeviate-theme');
    const savedCardColors = localStorage.getItem('safeviate-card-theme');
    const savedSidebarColors = localStorage.getItem('safeviate-sidebar-theme');
    const savedHeaderColors = localStorage.getItem('safeviate-header-theme');

    if (savedColors || savedCardColors || savedSidebarColors || savedHeaderColors) {
        if (savedColors) {
            const parsed = JSON.parse(savedColors);
            setColors(parsed);
            Object.entries(parsed).forEach(([key, value]) => {
                document.documentElement.style.setProperty(`--${key}`, hexToHsl(value as string));
            });
        }
        if (savedCardColors) {
            const parsed = JSON.parse(savedCardColors);
            setCardColors(parsed);
            Object.entries(parsed).forEach(([key, value]) => {
                document.documentElement.style.setProperty(`--${key}`, hexToHsl(value as string));
            });
        }
        if (savedSidebarColors) {
            const parsed = JSON.parse(savedSidebarColors);
            setSidebarColors(parsed);
            Object.entries(parsed).forEach(([key, value]) => {
                document.documentElement.style.setProperty(`--${key}`, hexToHsl(value as string));
            });
        }
        if (savedHeaderColors) {
            const parsed = JSON.parse(savedHeaderColors);
            setHeaderColors(parsed);
            Object.entries(parsed).forEach(([key, value]) => {
                document.documentElement.style.setProperty(`--${key}`, hexToHsl(value as string));
            });
        }
    } else {
        loadCurrentColorsFromDOM();
    }
  }, []);

  const updateAndStore = (key: string, data: any, stateSetter: Function, value: string, name: string) => {
    const newColors = { ...data, [name]: value };
    stateSetter(newColors);
    const hslValue = hexToHsl(value);
    document.documentElement.style.setProperty(`--${name}`, hslValue);
    localStorage.setItem(key, JSON.stringify(newColors));
  }

  const handleColorChange = (name: keyof ThemeColors, value: string, shouldStore:boolean = true) => {
    const newColors = { ...colors, [name]: value };
    setColors(newColors);
    const hslValue = hexToHsl(value);
    document.documentElement.style.setProperty(`--${name}`, hslValue);
    if(shouldStore) localStorage.setItem('safeviate-theme', JSON.stringify(newColors));
  };
  
  const handleCardColorChange = (name: keyof CardThemeColors, value: string, shouldStore:boolean = true) => {
    const newColors = { ...cardColors, [name]: value };
    setCardColors(newColors);
    const hslValue = hexToHsl(value);
    document.documentElement.style.setProperty(`--${name}`, hslValue);
    if(shouldStore) localStorage.setItem('safeviate-card-theme', JSON.stringify(newColors));
  };

  const handleSidebarColorChange = (name: keyof SidebarThemeColors, value: string, shouldStore:boolean = true) => {
    const newColors = { ...sidebarColors, [name]: value };
    setSidebarColors(newColors);
    const hslValue = hexToHsl(value);
    document.documentElement.style.setProperty(`--${name}`, hslValue);
    if(shouldStore) localStorage.setItem('safeviate-sidebar-theme', JSON.stringify(newColors));
  };

  const handleHeaderColorChange = (name: keyof HeaderThemeColors, value: string, shouldStore:boolean = true) => {
    const newColors = { ...headerColors, [name]: value };
    setHeaderColors(newColors);
    const hslValue = hexToHsl(value);
    document.documentElement.style.setProperty(`--${name}`, hslValue);
    if(shouldStore) localStorage.setItem('safeviate-header-theme', JSON.stringify(newColors));
  };

  const resetColors = () => {
    localStorage.removeItem('safeviate-theme');
    localStorage.removeItem('safeviate-card-theme');
    localStorage.removeItem('safeviate-sidebar-theme');
    localStorage.removeItem('safeviate-header-theme');
    window.location.reload();
  }
  
  const saveTheme = () => {
    if (!themeName.trim()) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Please enter a name for the theme.",
        });
        return;
    }

    const newTheme: SavedTheme = {
        name: themeName,
        colors,
        cardColors,
        sidebarColors,
        headerColors,
    };

    const updatedSavedThemes = [...savedThemes, newTheme];
    setSavedThemes(updatedSavedThemes);
    localStorage.setItem('safeviate-saved-themes', JSON.stringify(updatedSavedThemes));
    setThemeName('');
    toast({
        title: "Theme Saved",
        description: `The theme "${themeName}" has been saved.`,
    });
  };

  const deleteTheme = (themeNameToDelete: string) => {
    const updatedSavedThemes = savedThemes.filter(theme => theme.name !== themeNameToDelete);
    setSavedThemes(updatedSavedThemes);
    localStorage.setItem('safeviate-saved-themes', JSON.stringify(updatedSavedThemes));
    toast({
        title: "Theme Deleted",
        description: `The theme "${themeNameToDelete}" has been deleted.`,
    });
  };


  return (
    <div className='space-y-6'>
    <PageHeader title="Settings" description="Manage application settings, permissions, and appearance." />
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize the look and feel of the application.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Main Theme</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(colors).map(([name, value]) => (
              <div key={name} className="space-y-2">
                <Label htmlFor={name} className="capitalize">{name}</Label>
                <div className='relative'>
                  <Input
                    id={name}
                    type="color"
                    value={value}
                    onChange={(e) => handleColorChange(name as keyof ThemeColors, e.target.value)}
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
            {Object.entries(headerColors).map(([name, value]) => (
              <div key={name} className="space-y-2">
                <Label htmlFor={name} className="capitalize">{name.replace('header-', '')}</Label>
                <div className='relative'>
                  <Input
                    id={name}
                    type="color"
                    value={value}
                    onChange={(e) => handleHeaderColorChange(name as keyof HeaderThemeColors, e.target.value)}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(cardColors).map(([name, value]) => (
              <div key={name} className="space-y-2">
                <Label htmlFor={name} className="capitalize">{name.replace('card-', '')}</Label>
                <div className='relative'>
                  <Input
                    id={name}
                    type="color"
                    value={value}
                    onChange={(e) => handleCardColorChange(name as keyof CardThemeColors, e.target.value)}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(sidebarColors).map(([name, value]) => (
              <div key={name} className="space-y-2">
                <Label htmlFor={name} className="capitalize">{name.replace('sidebar-', '')}</Label>
                <div className='relative'>
                  <Input
                    id={name}
                    type="color"
                    value={value}
                    onChange={(e) => handleSidebarColorChange(name as keyof SidebarThemeColors, e.target.value)}
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
                <Button onClick={saveTheme}>Save Theme</Button>
            </div>
        </div>

        {savedThemes.length > 0 && <Separator />}

        {savedThemes.length > 0 && (
            <div>
                <h3 className="text-lg font-medium mb-4">Saved Themes</h3>
                <div className="space-y-2">
                    {savedThemes.map((theme) => (
                        <div key={theme.name} className="flex items-center justify-between p-2 border rounded-lg">
                            <span className="font-medium">{theme.name}</span>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => applyTheme(theme)}>Apply</Button>
                                <Button variant="destructive" size="icon" onClick={() => deleteTheme(theme.name)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <Separator />

        <Button onClick={resetColors} variant="outline">Reset to Defaults</Button>
      </CardContent>
    </Card>
    </div>
  );
}
