'use client';

import { useState } from 'react';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import type { ExternalOrganization } from '@/types/quality';

export default function ExternalOrganizationsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  
  const canManage = hasPermission('admin-external-orgs-manage');

  const orgsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/external-organizations`)) : null),
    [firestore, tenantId]
  );
  
  const { data: organizations, isLoading } = useCollection<ExternalOrganization>(orgsQuery);

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

    if (!firestore) return;

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
    if (!firestore) return;
    const orgRef = doc(firestore, `tenants/${tenantId}/external-organizations`, id);
    deleteDocumentNonBlocking(orgRef);
    toast({ title: 'Organization Deleted' });
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">External Companies</h1>
          <p className="text-muted-foreground">Manage external companies involved in quality audits and safety reporting.</p>
        </div>
        {canManage && (
          <Button onClick={() => handleOpenForm()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Company
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
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
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center p-8">Loading...</TableCell></TableRow>
              ) : (organizations || []).map(org => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>{org.contactEmail || 'N/A'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{org.address || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenForm(org)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(org.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!organizations || organizations.length === 0) && !isLoading && (
                <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No external companies found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
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