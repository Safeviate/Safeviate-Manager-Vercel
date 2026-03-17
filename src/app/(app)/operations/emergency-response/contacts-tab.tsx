'use client';

import { useState } from 'react';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Phone, Mail, Trash2 } from 'lucide-react';
import type { ERPContact, ERPContactCategory } from '@/types/erp';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface ContactsTabProps {
  tenantId: string;
}

const CATEGORIES: ERPContactCategory[] = ['Internal', 'Aviation Authorities', 'Emergency Services', 'External Partners'];

export function ContactsTab({ tenantId }: ContactsTabProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const contactsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/erp-contacts`), orderBy('priority', 'asc')) : null),
    [firestore, tenantId]
  );
  const { data: contacts, isLoading } = useCollection<ERPContact>(contactsQuery);

  const handleAddContact = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newContact = {
      name: formData.get('name') as string,
      role: formData.get('role') as string,
      organization: formData.get('organization') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      priority: parseInt(formData.get('priority') as string) || 1,
      category: formData.get('category') as ERPContactCategory,
    };

    if (!firestore) return;
    const colRef = collection(firestore, `tenants/${tenantId}/erp-contacts`);
    addDocumentNonBlocking(colRef, newContact);
    setIsAddOpen(false);
    toast({ title: 'Contact Added' });
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, `tenants/${tenantId}/erp-contacts`, id));
    toast({ title: 'Contact Deleted' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xl font-bold">Emergency Call List</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Emergency Contact</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Emergency Contact</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddContact} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Name</Label><Input name="name" required /></div>
                <div className="space-y-2"><Label>Role</Label><Input name="role" required /></div>
                <div className="space-y-2 col-span-2"><Label>Organization</Label><Input name="organization" required /></div>
                <div className="space-y-2"><Label>Phone</Label><Input name="phone" required /></div>
                <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" /></div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select name="category" defaultValue="Internal">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Priority (1-10)</Label><Input name="priority" type="number" defaultValue="1" /></div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Save Contact</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(contacts || []).map(contact => (
                <TableRow key={contact.id}>
                  <TableCell className="font-bold text-muted-foreground">{contact.priority}</TableCell>
                  <TableCell><Badge variant="outline">{contact.category}</Badge></TableCell>
                  <TableCell>
                    <div>
                      <p className="font-bold">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">{contact.role}</p>
                    </div>
                  </TableCell>
                  <TableCell>{contact.organization}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <a href={`tel:${contact.phone}`} className="text-xs flex items-center gap-1 hover:text-primary"><Phone className="h-3 w-3" /> {contact.phone}</a>
                      {contact.email && <a href={`mailto:${contact.email}`} className="text-xs flex items-center gap-1 hover:text-primary"><Mail className="h-3 w-3" /> {contact.email}</a>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(contact.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!contacts || contacts.length === 0) && (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">No contacts registered.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}