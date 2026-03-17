'use client';

import { useState } from 'react';
import { collection, query, doc, deleteDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Megaphone, Copy, Printer } from 'lucide-react';
import type { ERPMediaTemplate } from '@/types/erp';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface MediaTabProps {
  tenantId: string;
}

export function MediaTab({ tenantId }: MediaTabProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const mediaQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/erp-media`)) : null),
    [firestore, tenantId]
  );
  const { data: templates } = useCollection<ERPMediaTemplate>(mediaQuery);

  const handleAddTemplate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newTemplate = {
      type: formData.get('type') as any,
      title: formData.get('title') as string,
      content: formData.get('content') as string,
    };

    if (!firestore) return;
    addDocumentNonBlocking(collection(firestore, `tenants/${tenantId}/erp-media`), newTemplate);
    setIsAddOpen(false);
    toast({ title: 'Template Saved' });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to Clipboard' });
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, `tenants/${tenantId}/erp-media`, id));
    toast({ title: 'Template Deleted' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xl font-bold">Media Release Templates</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> New Template</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Media Statement Template</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddTemplate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Statement Type</Label>
                  <Select name="type" defaultValue="Immediate">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Immediate">Immediate Statement</SelectItem>
                      <SelectItem value="Second Statement">Secondary Update</SelectItem>
                      <SelectItem value="Post-Incident">Final Closure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Internal Title</Label><Input name="title" required /></div>
              </div>
              <div className="space-y-2">
                <Label>Statement Content</Label>
                <Textarea name="content" className="min-h-64" placeholder="Use placeholders like [DATE], [LOCATION], [AIRCRAFT]..." required />
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Save Template</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {(templates || []).map(template => (
          <Card key={template.id} className="shadow-none border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">{template.title}</CardTitle>
                <CardDescription>Type: {template.type}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleCopy(template.content)}><Copy className="h-4 w-4 mr-2" /> Copy</Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(template.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted/30 rounded-md border border-dashed font-serif text-sm leading-relaxed whitespace-pre-wrap italic">
                {template.content}
              </div>
            </CardContent>
          </Card>
        ))}
        {(!templates || templates.length === 0) && (
          <div className="h-48 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
            No media templates found.
          </div>
        )}
      </div>
    </div>
  );
}