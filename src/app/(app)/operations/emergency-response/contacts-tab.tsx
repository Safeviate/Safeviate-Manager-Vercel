'use client';

import { useState } from 'react';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Phone, Mail, Trash2, Pencil } from 'lucide-react';
import type { ERPContact, ERPContactCategory } from '@/types/erp';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';

interface ContactsTabProps {
  tenantId: string;
}

const CATEGORIES: ERPContactCategory[] = ['Internal', 'Aviation Authorities', 'Emergency Services', 'External Partners'];

export function ContactsTab({ tenantId }: ContactsTabProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ERPContact | null>(null);

  const canAdmin = hasPermission('operations-erp-admin');

  const contactsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/erp-contacts`), orderBy('priority', 'asc')) : null),
    [firestore, tenantId]
  );
  const { data: contacts } = useCollection<ERPContact>(contactsQuery);

  const handleOpenDialog = (contact: ERPContact | null = null) => {
    setEditingContact(contact);
    setIsDialogOpen(true);
  };

  const handleSaveContact = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canAdmin) return;

    const formData = new FormData(e.currentTarget);
    const contactData = {
      name: formData.get('name') as string,
      role: formData.get('role') as string,
      organization: formData.get('organization') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      priority: parseInt(formData.get('priority') as string) || 1,
      category: formData.get('category') as ERPContactCategory,
    };

    if (!firestore) return;

    if (editingContact) {
      const contactRef = doc(firestore, `tenants/${tenantId}/erp-contacts`, editingContact.id);
      updateDocumentNonBlocking(contactRef, contactData);
      toast({ title: 'Contact Updated' });
    } else {
      const colRef = collection(firestore, `tenants/${tenantId}/erp-contacts`);
      addDocumentNonBlocking(colRef, contactData);
      toast({ title: 'Contact Added' });
    }

    setIsDialogOpen(false);
    setEditingContact(null);
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !canAdmin) return;
    if (!window.confirm("Are you sure you want to delete this contact?")) return;
    await deleteDoc(doc(firestore, `tenants/${tenantId}/erp-contacts`, id));
    toast({ title: 'Contact Deleted' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xl font-bold font-headline">Emergency Call List</h2>
        {canAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) setEditingContact(null); setIsDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4" /> Add Emergency Contact</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingContact ? 'Edit' : 'New'} Emergency Contact</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveContact} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input name="name" defaultValue={editingContact?.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input name="role" defaultValue={editingContact?.role} required />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Organization</Label>
                    <Input name="organization" defaultValue={editingContact?.organization} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input name="phone" defaultValue={editingContact?.phone} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input name="email" type="email" defaultValue={editingContact?.email} />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select name="category" defaultValue={editingContact?.category || 'Internal'}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority (1-10)</Label>
                    <Input name="priority" type="number" defaultValue={editingContact?.priority || 1} />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button type="submit">Save Contact</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="shadow-none border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Numbers</TableHead>
                {canAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(contacts || []).map(contact => (
                <TableRow key={contact.id}>
                  <TableCell className="font-bold text-muted-foreground">{contact.priority}</TableCell>
                  <TableCell><Badge variant="outline">{contact.category}</Badge></TableCell>
                  <TableCell>
                    <div>
                      <p className="font-bold text-sm">{contact.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">{contact.role}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{contact.organization}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <a href={`tel:${contact.phone}`} className="text-[11px] flex items-center gap-1 hover:text-primary font-medium"><Phone className="h-2.5 w-2.5" /> {contact.phone}</a>
                      {contact.email && <a href={`mailto:${contact.email}`} className="text-[11px] flex items-center gap-1 hover:text-primary font-medium"><Mail className="h-2.5 w-2.5" /> {contact.email}</a>}
                    </div>
                  </TableCell>
                  {canAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(contact)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(contact.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {(!contacts || contacts.length === 0) && (
                <TableRow><TableCell colSpan={canAdmin ? 6 : 5} className="h-24 text-center text-muted-foreground italic">No contacts registered.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
