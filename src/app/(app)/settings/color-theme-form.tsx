
'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import { useTheme, type SavedTheme } from '@/components/theme-provider';

export function ColorThemeForm() {
  const { toast } = useToast();
  const { 
    theme, 
    setThemeValue, 
    cardTheme, 
    setCardThemeValue, 
    sidebarTheme, 
    setSidebarThemeValue, 
    headerTheme, 
    setHeaderThemeValue,
    savedThemes,
    saveCurrentTheme,
    applySavedTheme,
    deleteSavedTheme,
    resetToDefaults,
  } = useTheme();
  
  const [themeName, setThemeName] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);


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
          <h3 className="text-lg font-medium mb-4">Card Theme</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <h3 className="text-lg font-medium mb-4">Sidebar Theme</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <h3 className="text-lg font-medium mb-4">Saved Themes</h3>
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
