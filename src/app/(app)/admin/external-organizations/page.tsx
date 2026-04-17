'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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

  const loadOrgs = useCallback(async () => {
    setIsLoading(true);
    try {
        const response = await fetch('/api/external-organizations', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({ organizations: [] }));
        setOrganizations(Array.isArray(payload.organizations) ? payload.organizations : []);
    } catch (e) {
        console.error('Failed to load external orgs', e);
        setOrganizations([]);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrgs();
    window.addEventListener('safeviate-external-organizations-updated', loadOrgs);
    return () => window.removeEventListener('safeviate-external-organizations-updated', loadOrgs);
  }, [loadOrgs]);

  const handleOpenForm = (org: ExternalOrganization | null = null) => {
    setEditingOrg(org);
    setName(org?.name || '');
    setEmail(org?.contactEmail || '');
    setAddress(org?.address || '');
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Organization name is required.' });
      return;
    }

    try {
        const payload = { organization: { ...(editingOrg || {}), name, contactEmail: email, address } };
        const response = await fetch(editingOrg ? `/api/external-organizations/${editingOrg.id}` : '/api/external-organizations', {
          method: editingOrg ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Failed to save organization.');
        window.dispatchEvent(new Event('safeviate-external-organizations-updated'));
        toast({ title: editingOrg ? 'Organization Updated' : 'Organization Created' });
        setIsFormOpen(false);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save organization.' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
        const response = await fetch(`/api/external-organizations/${id}`, { method: 'DELETE' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Failed to delete organization.');
        window.dispatchEvent(new Event('safeviate-external-organizations-updated'));
        toast({ title: 'Organization Deleted' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete organization.' });
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full p-6">
      <Card className="shadow-none border overflow-hidden">
        {canManage && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border bg-muted/5 px-4 py-3" style={{ borderBottomColor: 'hsl(var(--card-border))' }}>
            <Button
              onClick={() => handleOpenForm()}
              variant={isMobile ? 'outline' : 'default'}
              size={isMobile ? 'sm' : 'default'}
              className={isMobile ? 'h-9 w-full justify-between border-slate-200 bg-white px-3 text-[10px] font-bold uppercase text-slate-900 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100' : 'font-black uppercase text-[10px] h-9 tracking-tight'}
            >
              <span className="flex items-center gap-2">
                <PlusCircle className={isMobile ? 'h-3.5 w-3.5' : 'mr-2 h-4 w-4'} /> Add Organization
              </span>
              {isMobile ? <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" /> : null}
            </Button>
          </div>
        )}
        <CardContent className="p-0">
          <div className="border-b border-border bg-muted/30" style={{ borderBottomColor: 'hsl(var(--card-border))' }}>
            <Table>
              <TableHeader className="bg-transparent [&_tr]:border-0">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">Organization Name</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">Contact Email</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">Address</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
            </Table>
          </div>
          <Table>
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
