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
import { RefreshCw, PlusCircle, Save } from 'lucide-react';
import type { Tenant } from '@/types/quality';

export function DatabaseForm() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // Existing tenants for loading
  const tenantsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'tenants') : null),
    [firestore]
  );
  const { data: tenants, isLoading: isLoadingTenants } = useCollection<Tenant>(tenantsQuery);

  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [primaryColour, setPrimaryColour] = useState('#7cc4f7');
  const [backgroundColour, setBackgroundColour] = useState('#ebf5fb');
  const [accentColour, setAccentColour] = useState('#63b2a7');
  
  // Menu visibility state
  const [enabledHrefs, setEnabledHrefs] = useState<Set<string>>(new Set());

  const handleLoadTenant = (tenantId: string) => {
    const t = tenants?.find(tenant => tenant.id === tenantId);
    if (!t) return;

    setSelectedTenantId(t.id);
    setTenantName(t.name);
    setLogoPreview(t.logoUrl || null);
    setPrimaryColour(t.theme?.primaryColour || '#7cc4f7');
    setBackgroundColour(t.theme?.backgroundColour || '#ebf5fb');
    setAccentColour(t.theme?.accentColour || '#63b2a7');
    setEnabledHrefs(new Set(t.enabledMenus || []));

    toast({
        title: 'Tenant Loaded',
        description: `Configuration for "${t.name}" is ready for editing.`,
    });
  };

  const handleClearForm = () => {
    setSelectedTenantId(null);
    setTenantName('');
    setLogo(null);
    setLogoPreview(null);
    setPrimaryColour('#7cc4f7');
    setBackgroundColour('#ebf5fb');
    setAccentColour('#63b2a7');
    setEnabledHrefs(new Set());
    
    const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogo(file);
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
      newEnabled.add(parentHref); // Ensure parent is enabled if child is
    }
    setEnabledHrefs(newEnabled);
  };

  const handleSaveTenant = () => {
    if (!tenantName) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide a Tenant Name.',
      });
      return;
    }
    
    const tenantId = selectedTenantId || tenantName.toLowerCase().replace(/\s+/g, '-');

    try {
      const tenantRef = doc(firestore, 'tenants', tenantId);
      const settingsRef = doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry');

      // Note: In a real app, you would upload the file to Firebase Storage first.
      // Here we use the preview URL or existing URL.
      const finalLogoUrl = logoPreview || '';

      setDocumentNonBlocking(
        tenantRef,
        {
          id: tenantId,
          name: tenantName,
          logoUrl: finalLogoUrl,
          theme: {
            primaryColour,
            backgroundColour,
            accentColour,
          },
          enabledMenus: Array.from(enabledHrefs),
        },
        { merge: true }
      );
      
      setDocumentNonBlocking(
        settingsRef,
        {
          id: 'document-expiry',
          warningPeriods: [
            { period: 30, color: '#facc15' },
            { period: 60, color: '#f97316' },
            { period: 90, color: '#3b82f6' }
          ],
          defaultColor: '#22c55e',
          expiredColor: '#ef4444'
        },
        { merge: true }
      );

      toast({
        title: selectedTenantId ? 'Tenant Updated' : 'Tenant Created',
        description: `"${tenantName}" has been ${selectedTenantId ? 'updated' : 'created'} with current menu visibility.`,
      });

      if (!selectedTenantId) {
          handleClearForm();
      }

    } catch (e: any) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: e.message || 'There was a problem saving the tenant.',
      });
    }
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-none border">
      <CardHeader className="shrink-0 border-b bg-muted/5">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle>Tenant Manager</CardTitle>
                <CardDescription>
                Create new tenants or modify existing ones with custom branding and granular menu visibility.
                </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearForm}>
                <PlusCircle className="mr-2 h-4 w-4" /> New Tenant
            </Button>
        </div>
      </CardHeader>
      
      <div className="p-6 pb-0 border-b bg-muted/10">
          <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
              <div className="space-y-2 flex-1">
                  <Label>Load Existing Tenant</Label>
                  <Select onValueChange={handleLoadTenant} value={selectedTenantId || undefined}>
                      <SelectTrigger>
                          <SelectValue placeholder={isLoadingTenants ? "Loading..." : "Choose a tenant to edit..."} />
                      </SelectTrigger>
                      <SelectContent>
                          {(tenants || []).map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
              <div className="space-y-2 flex-[2]">
                  <Label htmlFor="tenant-name">Tenant Name</Label>
                  <Input
                    id="tenant-name"
                    placeholder="e.g., Safeviate Inc."
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                  />
              </div>
          </div>
      </div>

      <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-8">
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Branding</h3>
                <div className="space-y-2">
                    <Label htmlFor="logo-upload">Company Logo</Label>
                    <div className="flex items-center gap-4">
                        <Input id="logo-upload" type="file" onChange={handleLogoChange} accept="image/*" className="max-w-xs" />
                        {logoPreview && (
                            <div className="h-10 w-32 border rounded overflow-hidden bg-white flex items-center justify-center p-1">
                                <img src={logoPreview} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                            </div>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="primary-color">Primary Color</Label>
                        <Input id="primary-color" type="color" value={primaryColour} onChange={(e) => setPrimaryColour(e.target.value)} className='p-1 h-10' />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="background-color">Background Color</Label>
                        <Input id="background-color" type="color" value={backgroundColour} onChange={(e) => setBackgroundColour(e.target.value)} className='p-1 h-10' />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="accent-color">Accent Color</Label>
                        <Input id="accent-color" type="color" value={accentColour} onChange={(e) => setAccentColour(e.target.value)} className='p-1 h-10' />
                    </div>
                </div>
            </div>
            
            <Separator />

            <div className="space-y-4">
                <h3 className="text-lg font-medium">Menu Configuration</h3>
                <p className="text-sm text-muted-foreground">Toggle the visibility of main menus and submenus for this tenant. Submenus will only be visible if their parent menu is enabled.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {menuConfig.map((menu) => {
                        const subHrefs = menu.subItems?.map(s => s.href) || [];
                        const isEnabled = enabledHrefs.has(menu.href);
                        
                        return (
                            <div key={menu.href} className="space-y-3 p-4 border rounded-lg bg-muted/10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`menu-${menu.href}`} 
                                            checked={isEnabled}
                                            onCheckedChange={() => toggleMenu(menu.href, subHrefs)}
                                        />
                                        <Label htmlFor={`menu-${menu.href}`} className="font-bold flex items-center gap-2 cursor-pointer">
                                            <menu.icon className="h-4 w-4" />
                                            {menu.label}
                                        </Label>
                                    </div>
                                </div>
                                
                                {menu.subItems && (
                                    <div className="pl-6 space-y-2 pt-2 border-l ml-2">
                                        {menu.subItems.map((sub) => (
                                            <div key={sub.href} className="flex items-center space-x-2">
                                                <Checkbox 
                                                    id={`sub-${sub.href}`} 
                                                    checked={enabledHrefs.has(sub.href)}
                                                    onCheckedChange={() => toggleSubMenu(menu.href, sub.href)}
                                                />
                                                <Label htmlFor={`sub-${sub.href}`} className="text-xs cursor-pointer">
                                                    {sub.label}
                                                </Label>
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
          <Button onClick={handleSaveTenant} size="lg">
              {selectedTenantId ? <><Save className="mr-2 h-4 w-4" /> Update Tenant</> : <><PlusCircle className="mr-2 h-4 w-4" /> Create Tenant</>}
          </Button>
      </div>
    </Card>
  );
}
