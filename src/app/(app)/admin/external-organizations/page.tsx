'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChevronsUpDown } from 'lucide-react';
import type { ExternalOrganization } from '@/types/quality';
import { DeleteActionButton, EditActionButton } from '@/components/record-action-buttons';
import { useUserProfile } from '@/hooks/use-user-profile';

export default function ExternalOrganizationsPage() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const isMobile = useIsMobile();
  const { tenantId } = useUserProfile();
  
  const canManage = hasPermission('admin-external-orgs-manage');

  const [organizations, setOrganizations] = useState<ExternalOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<ExternalOrganization | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const loadOrgs = useCallback(() => {
    setIsLoading(true);
    try {
        const stored = localStorage.getItem('safeviate.external-organizations');
        if (stored) {
            setOrganizations(JSON.parse(stored));
        }
    } catch (e) {
        console.error("Failed to load external orgs", e);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrgs();
    window.addEventListener('safeviate-external-orgs-updated', loadOrgs);
    return () => window.removeEventListener('safeviate-external-orgs-updated', loadOrgs);
  }, [loadOrgs]);

  const handleOpenForm = (org: ExternalOrganization | null = null) => {
    setEditingOrg(org);
    setName(org?.name || '');
    setEmail(org?.contactEmail || '');
    setAddress(org?.address || '');
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Organization name is required.' });
      return;
    }

    try {
        const stored = localStorage.getItem('safeviate.external-organizations');
        const orgs = stored ? JSON.parse(stored) as ExternalOrganization[] : [];
        
        let nextOrgs: ExternalOrganization[];
        if (editingOrg) {
            nextOrgs = orgs.map(o => o.id === editingOrg.id ? { ...o, name, contactEmail: email, address } : o);
        } else {
            const newOrg: ExternalOrganization = {
                id: crypto.randomUUID(),
                name,
                contactEmail: email,
                address,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            nextOrgs = [...orgs, newOrg];
        }

        localStorage.setItem('safeviate.external-organizations', JSON.stringify(nextOrgs));
        window.dispatchEvent(new Event('safeviate-external-orgs-updated'));
        toast({ title: editingOrg ? 'Organization Updated' : 'Organization Created' });
        setIsFormOpen(false);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save organization.' });
    }
  };

  const handleDelete = (id: string) => {
    try {
        const stored = localStorage.getItem('safeviate.external-organizations');
        if (stored) {
            const orgs = JSON.parse(stored) as ExternalOrganization[];
            const nextOrgs = orgs.filter(o => o.id !== id);
            localStorage.setItem('safeviate.external-organizations', JSON.stringify(nextOrgs));
            window.dispatchEvent(new Event('safeviate-external-orgs-updated'));
            toast({ title: 'Organization Deleted' });
        }
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete organization.' });
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">External Organizations</h1>
          <p className="text-xs text-muted-foreground italic font-medium">Manage external companies involved in quality audits.</p>
        </div>
        {canManage && (
          <Button
            onClick={() => handleOpenForm()}
            variant={isMobile ? "outline" : "default"}
            size={isMobile ? "sm" : "default"}
            className={isMobile ? "h-9 w-full justify-between border-slate-200 bg-white px-3 text-[10px] font-bold uppercase text-slate-900 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" : "font-black uppercase text-[10px] h-9 tracking-tight"}
          >
            <span className="flex items-center gap-2">
              <PlusCircle className={isMobile ? "h-3.5 w-3.5" : "mr-2 h-4 w-4"} /> Add Organization
            </span>
            {isMobile ? <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" /> : null}
          </Button>
        )}
      </div>

      <Card className="shadow-none border overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-wider">Organization Name</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-wider">Contact Email</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-wider">Address</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center p-8 text-[10px] font-black uppercase tracking-widest italic text-muted-foreground">Loading...</TableCell></TableRow>
              ) : (organizations || []).map(org => (
                <TableRow key={org.id} className="hover:bg-muted/5 transition-colors">
                  <TableCell className="font-bold text-sm uppercase tracking-tight">{org.name}</TableCell>
                  <TableCell className="text-xs font-medium">{org.contactEmail || 'N/A'}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{org.address || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <EditActionButton onClick={() => handleOpenForm(org)} label="Edit organization" />
                      <DeleteActionButton
                        description={`This will permanently delete external organization "${org.name}".`}
                        onDelete={() => handleDelete(org.id)}
                        srLabel="Delete organization"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!organizations || organizations.length === 0) && !isLoading && (
                <TableRow><TableCell colSpan={4} className="text-center h-48 text-[10px] font-black uppercase tracking-widest italic text-muted-foreground bg-muted/5">No external organizations found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOrg ? 'Edit' : 'Add'} Organization</DialogTitle>
            <DialogDescription>Define the details for the external company.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Contact Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave}>Save Organization</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
