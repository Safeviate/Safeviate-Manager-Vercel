'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { hexToHsl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

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


  useEffect(() => {
    // Load colors from localStorage or initial CSS
    const savedColors = localStorage.getItem('safeviate-theme');
    const savedCardColors = localStorage.getItem('safeviate-card-theme');
    const savedSidebarColors = localStorage.getItem('safeviate-sidebar-theme');
    const savedHeaderColors = localStorage.getItem('safeviate-header-theme');

    if (savedColors) {
      const parsedColors = JSON.parse(savedColors);
      setColors(parsedColors);
      Object.entries(parsedColors).forEach(([key, value]) => {
        const hslValue = hexToHsl(value as string);
        document.documentElement.style.setProperty(`--${key}`, hslValue);
      });
    } else {
        setColors({
            background: hslToHex(getCssVar('--background')),
            primary: hslToHex(getCssVar('--primary')),
            accent: hslToHex(getCssVar('--accent')),
        })
    }

    if (savedCardColors) {
        const parsedColors = JSON.parse(savedCardColors);
        setCardColors(parsedColors);
        Object.entries(parsedColors).forEach(([key, value]) => {
          const hslValue = hexToHsl(value as string);
          document.documentElement.style.setProperty(`--${key}`, hslValue);
        });
      } else {
          setCardColors({
              'card': hslToHex(getCssVar('--card')),
              'card-foreground': hslToHex(getCssVar('--card-foreground')),
          })
      }

    if (savedSidebarColors) {
      const parsedColors = JSON.parse(savedSidebarColors);
      setSidebarColors(parsedColors);
       Object.entries(parsedColors).forEach(([key, value]) => {
        const hslValue = hexToHsl(value as string);
        document.documentElement.style.setProperty(`--${key}`, hslValue);
      });
    } else {
        setSidebarColors({
            'sidebar-background': hslToHex(getCssVar('--sidebar-background')),
            'sidebar-foreground': hslToHex(getCssVar('--sidebar-foreground')),
            'sidebar-primary': hslToHex(getCssVar('--sidebar-primary')),
            'sidebar-primary-foreground': hslToHex(getCssVar('--sidebar-primary-foreground')),
            'sidebar-accent': hslToHex(getCssVar('--sidebar-accent')),
            'sidebar-accent-foreground': hslToHex(getCssVar('--sidebar-accent-foreground')),
            'sidebar-border': hslToHex(getCssVar('--sidebar-border')),
        })
    }
     if (savedHeaderColors) {
      const parsedColors = JSON.parse(savedHeaderColors);
      setHeaderColors(parsedColors);
       Object.entries(parsedColors).forEach(([key, value]) => {
        const hslValue = hexToHsl(value as string);
        document.documentElement.style.setProperty(`--${key}`, hslValue);
      });
    } else {
        setHeaderColors({
            'header-background': hslToHex(getCssVar('--header-background')),
            'header-foreground': hslToHex(getCssVar('--header-foreground')),
            'header-border': hslToHex(getCssVar('--header-border')),
        })
    }
  }, []);

  const handleColorChange = (name: keyof ThemeColors, value: string) => {
    const newColors = { ...colors, [name]: value };
    setColors(newColors);

    const hslValue = hexToHsl(value);
    document.documentElement.style.setProperty(`--${name}`, hslValue);
    localStorage.setItem('safeviate-theme', JSON.stringify(newColors));
  };
  
  const handleCardColorChange = (name: keyof CardThemeColors, value: string) => {
    const newColors = { ...cardColors, [name]: value };
    setCardColors(newColors);

    const hslValue = hexToHsl(value);
    document.documentElement.style.setProperty(`--${name}`, hslValue);
    localStorage.setItem('safeviate-card-theme', JSON.stringify(newColors));
  };

  const handleSidebarColorChange = (name: keyof SidebarThemeColors, value: string) => {
    const newColors = { ...sidebarColors, [name]: value };
    setSidebarColors(newColors);

    const hslValue = hexToHsl(value);
    document.documentElement.style.setProperty(`--${name}`, hslValue);
    localStorage.setItem('safeviate-sidebar-theme', JSON.stringify(newColors));
  };

  const handleHeaderColorChange = (name: keyof HeaderThemeColors, value: string) => {
    const newColors = { ...headerColors, [name]: value };
    setHeaderColors(newColors);

    const hslValue = hexToHsl(value);
    document.documentElement.style.setProperty(`--${name}`, hslValue);
    localStorage.setItem('safeviate-header-theme', JSON.stringify(newColors));
  };

  const resetColors = () => {
    localStorage.removeItem('safeviate-theme');
    localStorage.removeItem('safeviate-card-theme');
    localStorage.removeItem('safeviate-sidebar-theme');
    localStorage.removeItem('safeviate-header-theme');
    window.location.reload();
  }

  return (
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
        
        <Button onClick={resetColors} variant="outline">Reset to Defaults</Button>
      </CardContent>
    </Card>
  );
}
