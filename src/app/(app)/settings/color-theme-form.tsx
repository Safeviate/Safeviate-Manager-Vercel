'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FirebaseError } from 'firebase/app';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Globe, Save, ImagePlus, Loader2 } from 'lucide-react';
import { useTheme, type SavedTheme } from '@/components/theme-provider';
import { useCollection, useFirestore, useMemoFirebase, useStorage } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
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
  const firestore = useFirestore();
  const storage = useStorage();
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
  const [isUploadingSidebarImage, setIsUploadingSidebarImage] = useState(false);

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

  const handleSaveToOrganization = async () => {
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
        sidebarBackgroundImage,
        header: headerTheme,
        swimlane: swimlaneTheme,
        matrix: matrixTheme,
      }
    };

    try {
      await updateDoc(tenantRef, dataToSave);
      toast({
        title: "Organization Default Updated",
        description: "These branding settings have been saved as the default for all members of your organization."
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "The organization branding could not be saved."
      });
    }
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

  const handleSidebarBackgroundUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!tenantId) {
      toast({ variant: "destructive", title: "No Tenant Context", description: "Load your organization before uploading a sidebar background." });
      return;
    }

    setIsUploadingSidebarImage(true);
    try {
      const sanitizedFileName = file.name.replace(/\s+/g, '-').toLowerCase();
      const storageRef = ref(storage, `tenants/${tenantId}/branding/sidebar/${Date.now()}-${sanitizedFileName}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      setSidebarBackgroundImage(downloadUrl);
      toast({ title: "Sidebar Background Uploaded", description: "The image has been uploaded and applied to the sidebar preview." });
    } catch (error) {
      console.error(error);
      const isUnauthorized =
        error instanceof FirebaseError && error.code === 'storage/unauthorized';

      toast({
        variant: "destructive",
        title: isUnauthorized ? "Storage Rules Not Published" : "Upload Failed",
        description: isUnauthorized
          ? "Firebase Storage is blocking this upload. Publish the Storage rules in Firebase Console, then try again."
          : "The sidebar background image could not be uploaded."
      });
    } finally {
      setIsUploadingSidebarImage(false);
      event.target.value = '';
    }
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
            <p className='text-[10px] text-muted-foreground font-bold uppercase italic mb-4'>Adjust the overall size of the application interface.</p>
            <div className='flex items-center gap-6 bg-muted/5 p-4 border rounded-xl'>
                <Slider value={[scale]} onValueChange={(value) => setScale(value[0])} min={50} max={150} step={5} className="flex-1" />
                <span className='text-sm font-black text-primary w-12 text-right'>{scale}%</span>
            </div>
        </div>
        
        <Separator />

        {canManageOrganization && (
            <>
                <div className="bg-primary/5 p-5 rounded-2xl border border-primary/20 space-y-4">
                    <div className="space-y-1">
                        <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2 text-foreground">
                            <Globe className="h-4 w-4 text-primary" />
                            Organization Branding
                        </h3>
                        <p className='text-[10px] text-muted-foreground font-bold uppercase italic'>
                            Set the default branding for all members of your organization.
                        </p>
                    </div>
                    <Button onClick={handleSaveToOrganization} className="w-full sm:w-auto text-[10px] font-black uppercase h-9 px-6">
                        <Save className="mr-2 h-4 w-4" /> Save as Organization Default
                    </Button>
                </div>
                <Separator />
            </>
        )}

        <div>
            <h3 className="text-sm font-black uppercase tracking-tight mb-1 text-foreground">Set Theme from Tenant</h3>
            <p className='text-[10px] text-muted-foreground font-bold uppercase italic mb-4'>Override the current theme with a saved tenant configuration.</p>
            <Select onValueChange={handleApplyTenantTheme} disabled={isLoadingTenants}>
                <SelectTrigger className="w-full sm:w-[320px] h-11 font-bold">
                    <SelectValue placeholder={isLoadingTenants ? "Loading themes..." : "Select a tenant theme"} />
                </SelectTrigger>
                <SelectContent>
                    {(tenants || []).map(tenant => (
                        <SelectItem key={tenant.id} value={tenant.id} disabled={!tenant.theme} className="font-medium">
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
                <div className="space-y-4 p-5 border rounded-2xl bg-muted/5">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Primary Palette</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="primary" className="text-[9px] font-black uppercase">Primary</Label>
                            <Input id="primary" type="color" value={theme.primary} onChange={(e) => setThemeValue('primary', e.target.value)} className="p-1 h-12 w-full rounded-lg cursor-pointer" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="primary-foreground" className="text-[9px] font-black uppercase">Foreground</Label>
                            <Input id="primary-foreground" type="color" value={theme['primary-foreground']} onChange={(e) => setThemeValue('primary-foreground', e.target.value)} className="p-1 h-12 w-full rounded-lg cursor-pointer" />
                        </div>
                    </div>
                </div>
                <div className="space-y-4 p-5 border rounded-2xl bg-muted/5">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Base &amp; Accent</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="background" className="text-[9px] font-black uppercase">Background</Label>
                            <Input id="background" type="color" value={theme.background} onChange={(e) => setThemeValue('background', e.target.value)} className="p-1 h-12 w-full rounded-lg cursor-pointer" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="accent" className="text-[9px] font-black uppercase">Accent</Label>
                            <Input id="accent" type="color" value={theme.accent} onChange={(e) => setThemeValue('accent', e.target.value)} className="p-1 h-12 w-full rounded-lg cursor-pointer" />
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
                            <Input id={name} type="color" value={value} onChange={(e) => setButtonThemeValue(name as keyof typeof buttonTheme, e.target.value)} className="p-1 h-10 w-full rounded-md cursor-pointer" />
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
                            <Input id={name} type="color" value={value} onChange={(e) => setHeaderThemeValue(name as keyof typeof headerTheme, e.target.value)} className="p-1 h-10 w-full rounded-md cursor-pointer" />
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
                            <Input id={name} type="color" value={value} onChange={(e) => setSwimlaneThemeValue(name as keyof typeof swimlaneTheme, e.target.value)} className="p-1 h-10 w-full rounded-md cursor-pointer" />
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
                            <Input id={name} type="color" value={value} onChange={(e) => setMatrixThemeValue(name as keyof typeof matrixTheme, e.target.value)} className="p-1 h-10 w-full rounded-md cursor-pointer" />
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
                            <Input id={name} type="color" value={value} onChange={(e) => setCardThemeValue(name as keyof typeof cardTheme, e.target.value)} className="p-1 h-10 w-full rounded-md cursor-pointer" />
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
                            <Input id={name} type="color" value={value} onChange={(e) => (popoverTheme as any)[name] !== undefined ? setPopoverThemeValue(name as any, e.target.value) : setSidebarThemeValue(name as any, e.target.value)} className="p-1 h-10 w-full rounded-md cursor-pointer" />
                        </div>
                        ))}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="sidebar-background-image" className="text-[9px] font-black uppercase text-muted-foreground">
                            Sidebar Background Image URL
                        </Label>
                        <Input
                          id="sidebar-background-image"
                          type="text"
                          value={sidebarBackgroundImage}
                          onChange={(e) => setSidebarBackgroundImage(e.target.value)}
                          placeholder="https://example.com/sidebar-texture.jpg"
                          className="h-10"
                        />
                    </div>
                    <div className="space-y-3 rounded-xl border bg-muted/10 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Upload Sidebar Background</p>
                                <p className="text-xs text-muted-foreground">Upload an image to Firebase Storage and use it for the sidebar background.</p>
                            </div>
                            <Label
                              htmlFor="sidebar-background-upload"
                              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border px-4 text-[10px] font-black uppercase tracking-widest hover:bg-muted"
                            >
                              {isUploadingSidebarImage ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Uploading
                                </>
                              ) : (
                                <>
                                  <ImagePlus className="mr-2 h-4 w-4" />
                                  Choose Image
                                </>
                              )}
                            </Label>
                            <Input
                              id="sidebar-background-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleSidebarBackgroundUpload}
                              disabled={isUploadingSidebarImage}
                              className="hidden"
                            />
                        </div>
                        {sidebarBackgroundImage ? (
                          <div className="relative h-32 overflow-hidden rounded-lg border">
                            <Image
                              src={sidebarBackgroundImage}
                              alt="Sidebar background preview"
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                            No sidebar background image selected.
                          </div>
                        )}
                    </div>
                </section>
            </div>
        </div>

        <Separator />
        
        <div>
            <h3 className="text-sm font-black uppercase tracking-tight mb-4 text-foreground">Theme Storage</h3>
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <Input placeholder="Theme name..." value={themeName} onChange={(e) => setThemeName(e.target.value)} className="h-11 font-bold" />
                <Button onClick={handleSaveTheme} className="w-full sm:w-auto h-11 px-8 text-[10px] font-black uppercase">Save Personal Theme</Button>
            </div>
        </div>

        {isMounted && savedThemes.length > 0 && (
            <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Saved Personal Themes</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {savedThemes.map((theme) => (
                        <div key={theme.name} className="flex items-center justify-between p-3 border rounded-xl bg-background shadow-sm group">
                            <span className="font-bold text-xs uppercase">{theme.name}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="outline" size="sm" onClick={() => handleApplyTheme(theme)} className="h-7 text-[9px] font-black uppercase">Apply</Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteTheme(theme.name)} className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <Separator />

        <div className="flex justify-start">
            <Button onClick={handleReset} variant="outline" className="text-[10px] font-black uppercase h-10 px-8 border-slate-300">Reset My Browser Theme</Button>
        </div>
    </div>
  );

  if (!showHeader) {
      return content;
  }

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-none border">
      <CardHeader className="shrink-0 border-b bg-muted/10">
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize the look and feel of the application.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full">
          {content}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
