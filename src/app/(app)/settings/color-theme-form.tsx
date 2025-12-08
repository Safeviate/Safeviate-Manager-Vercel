'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { hexToHsl } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type ThemeColors = {
  background: string;
  primary: string;
  accent: string;
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

  useEffect(() => {
    // Load colors from localStorage or initial CSS
    const savedColors = localStorage.getItem('safeviate-theme');
    if (savedColors) {
      const parsedColors = JSON.parse(savedColors);
      setColors(parsedColors);
      Object.entries(parsedColors).forEach(([key, value]) => {
        const hslValue = hexToHsl(value as string);
        document.documentElement.style.setProperty(`--${key}`, hslValue);
      });
    } else {
        // If no saved theme, read from CSS variables
        setColors({
            background: hslToHex(getCssVar('--background')),
            primary: hslToHex(getCssVar('--primary')),
            accent: hslToHex(getCssVar('--accent')),
        })
    }
  }, []);

  const handleColorChange = (name: keyof ThemeColors, value: string) => {
    const newColors = { ...colors, [name]: value };
    setColors(newColors);

    // Update CSS variable
    const hslValue = hexToHsl(value);
    document.documentElement.style.setProperty(`--${name}`, hslValue);

    // Save to localStorage
    localStorage.setItem('safeviate-theme', JSON.stringify(newColors));
  };
  
  const resetColors = () => {
    const defaultColors = {
        background: '#ebf5fb',
        primary: '#7cc4f7',
        accent: '#63b2a7',
    };
    setColors(defaultColors);
    localStorage.removeItem('safeviate-theme');
    // Reload to apply CSS file styles
    window.location.reload();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize the look and feel of the application.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
        <Button onClick={resetColors} variant="outline">Reset to Defaults</Button>
      </CardContent>
    </Card>
  );
}
