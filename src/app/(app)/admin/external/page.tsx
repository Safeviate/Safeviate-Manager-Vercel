'use client';

import { useState } from 'react';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ExternalOrganization } from '@/types/quality';
import { ChevronsUpDown } from 'lucide-react';
import { DeleteActionButton, EditActionButton } from '@/components/record-action-buttons';
import { useUserProfile } from '@/hooks/use-user-profile';

export default function ExternalCompaniesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const isMobile = useIsMobile();
  const { tenantId } = useUserProfile();
  
  const canManage = hasPermission('admin-external-orgs-manage');

  const orgsQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/external-organizations`)) : null),
    [firestore, tenantId]
  );
  
  const { data: organizations, isLoading: isLoadingOrgs } = useCollection<ExternalOrganization>(orgsQuery);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<ExternalOrganization | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

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

    if (!firestore || !tenantId) return;

    const data = { name, contactEmail: email, address };

    if (editingOrg) {
      const orgRef = doc(firestore, `tenants/${tenantId}/external-organizations`, editingOrg.id);
      updateDocumentNonBlocking(orgRef, data);
      toast({ title: 'Organization Updated' });
    } else {
      const colRef = collection(firestore, `tenants/${tenantId}/external-organizations`);
      addDocumentNonBlocking(colRef, data);
      toast({ title: 'Organization Created' });
    }

    setIsFormOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!firestore || !tenantId) return;
    const orgRef = doc(firestore, `tenants/${tenantId}/external-organizations`, id);
    deleteDocumentNonBlocking(orgRef);
    toast({ title: 'Organization Deleted' });
  };

  return (
    <div className="flex flex-col gap-6 h-full min-h-0 max-w-[1200px] mx-auto w-full">
      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden shadow-none border">
        <CardHeader className="shrink-0 border-b bg-muted/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4">
          <CardTitle>External Companies</CardTitle>
          {canManage && (
            <div className="flex flex-col gap-1 sm:items-end w-full sm:w-auto">
              <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Company Control</p>
              <Button
                onClick={() => handleOpenForm()}
                variant={isMobile ? 'outline' : 'default'}
                size={isMobile ? 'sm' : 'default'}
                className={isMobile ? 'h-9 w-full justify-between border-slate-200 bg-white px-3 text-[10px] font-bold uppercase text-slate-900 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100' : undefined}
              >
                <span className="flex items-center gap-2">
                  <PlusCircle className={isMobile ? 'h-3.5 w-3.5' : 'mr-2 h-4 w-4'} />
                  Add Company
                </span>
                {isMobile ? <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" /> : null}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Contact Email</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingOrgs ? (
                    <TableRow><TableCell colSpan={4} className="text-center p-8">Loading...</TableCell></TableRow>
                  ) : (organizations || []).map(org => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>{org.contactEmail || 'N/A'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{org.address || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <EditActionButton onClick={() => handleOpenForm(org)} label="Edit company" />
                          <DeleteActionButton
                            description={`This will permanently delete external company "${org.name}".`}
                            onDelete={() => handleDelete(org.id)}
                            srLabel="Delete company"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!organizations || organizations.length === 0) && !isLoadingOrgs && (
                    <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No external companies found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOrg ? 'Edit' : 'Add'} Company</DialogTitle>
            <DialogDescription>Define the details for the external company.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
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
            <Button onClick={handleSave}>Save Company</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
