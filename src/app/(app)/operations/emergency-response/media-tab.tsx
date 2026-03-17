'use client';

import { useState } from 'react';
import { collection, query, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Megaphone, Copy, Database, Printer, Pencil } from 'lucide-react';
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

const STANDARD_TEMPLATES: Omit<ERPMediaTemplate, 'id'>[] = [
  {
    type: 'Immediate',
    title: 'Initial Holding Statement (Crisis Start)',
    content: `FOR IMMEDIATE RELEASE

[ORGANIZATION NAME] confirms that one of its aircraft, a [AIRCRAFT TYPE], was involved in an occurrence at approximately [TIME] on [DATE] near [LOCATION].

Our emergency response protocols have been activated, and we are working closely with the relevant local authorities and emergency services.

Our primary concern at this time is the safety and well-being of the individuals involved. We are currently gathering further information and will provide updates as soon as confirmed facts are available.

Out of respect for the privacy of those involved and their families, no names or further details will be released until next of kin have been notified.

Media inquiries should be directed to the Media Relations Office at [PHONE NUMBER] or [EMAIL].

###`,
  },
  {
    type: 'Second Statement',
    title: 'Secondary Update (Ongoing Response)',
    content: `FOR IMMEDIATE RELEASE - UPDATE #1

[ORGANIZATION NAME] provides the following update regarding the aircraft occurrence involving a [AIRCRAFT TYPE] near [LOCATION] on [DATE].

At this time, we can confirm that [NUMBER] people were on board. We are working with [HOSPITAL/SERVICES] to ensure all individuals receive the necessary care. 

The aircraft was performing a [TRAINING/PRIVATE/MAINTENANCE] flight at the time of the event. [ORGANIZATION NAME] is cooperating fully with the [AVIATION AUTHORITY/INVESTIGATION BOARD] as they begin their inquiry.

We will provide further information as it becomes available and is confirmed by the appropriate authorities.

Media inquiries: [PHONE/EMAIL]

###`,
  },
  {
    type: 'Post-Incident',
    title: 'Final Closure Statement',
    content: `FOR IMMEDIATE RELEASE

[ORGANIZATION NAME] wishes to express its deepest gratitude to the emergency services, local authorities, and volunteers who responded to the aircraft occurrence on [DATE].

The local response phase of this event has now concluded. The [AVIATION AUTHORITY] has assumed control of the investigation, and [ORGANIZATION NAME] will continue to provide all necessary support to their team.

Our thoughts remain with the individuals and families affected by this event. We are providing internal support and counseling to our staff and students during this difficult time.

This will be the final statement from [ORGANIZATION NAME] regarding the immediate response. Future updates regarding the investigation will be issued by the [AVIATION AUTHORITY].

###`,
  }
];

export function MediaTab({ tenantId }: MediaTabProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ERPMediaTemplate | null>(null);

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

  const handleUpdateTemplate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTemplate || !firestore) return;
    const formData = new FormData(e.currentTarget);
    const updatedTemplate = {
      type: formData.get('type') as any,
      title: formData.get('title') as string,
      content: formData.get('content') as string,
    };

    const templateRef = doc(firestore, `tenants/${tenantId}/erp-media`, editingTemplate.id);
    updateDocumentNonBlocking(templateRef, updatedTemplate);
    setIsEditOpen(false);
    setEditingTemplate(null);
    toast({ title: 'Template Updated' });
  };

  const handleSeedStandardTemplates = async () => {
    if (!firestore) return;
    
    try {
      const batch = writeBatch(firestore);
      const colRef = collection(firestore, `tenants/${tenantId}/erp-media`);
      
      STANDARD_TEMPLATES.forEach(template => {
        const newDocRef = doc(colRef);
        batch.set(newDocRef, template);
      });

      await batch.commit();
      toast({ title: 'Standard Templates Added', description: 'Immediate, Secondary, and Closure statements have been added.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Seeding Failed', description: error.message });
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to Clipboard' });
  };

  const handlePrint = (template: ERPMediaTemplate) => {
    const printWindow = window.open('', '_blank', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Media Release</title>');
      printWindow.document.write('<style>body { font-family: serif; padding: 3rem; white-space: pre-wrap; line-height: 1.6; color: #000; } h1 { border-bottom: 2px solid #000; padding-bottom: 0.5rem; margin-bottom: 2rem; font-size: 1.5rem; } .footer { margin-top: 3rem; border-top: 1px solid #ccc; padding-top: 1rem; font-style: italic; font-size: 0.8rem; }</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write(`<h1>${template.title}</h1>`);
      printWindow.document.write(template.content);
      printWindow.document.write(`<div class="footer">Printed from Safeviate ERP on ${new Date().toLocaleString()}</div>`);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, `tenants/${tenantId}/erp-media`, id));
    toast({ title: 'Template Deleted' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-xl font-bold">Media Release Templates</h2>
          <p className="text-sm text-muted-foreground">Standardized statements for managing public information during a crisis.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSeedStandardTemplates}>
            <Database className="mr-2 h-4 w-4" /> Seed Standard Templates
          </Button>
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
                <Button variant="outline" size="sm" onClick={() => handlePrint(template)}><Printer className="h-4 w-4 mr-2" /> Print</Button>
                <Button variant="outline" size="sm" onClick={() => handleCopy(template.content)}><Copy className="h-4 w-4 mr-2" /> Copy</Button>
                <Button variant="ghost" size="icon" onClick={() => { setEditingTemplate(template); setIsEditOpen(true); }}><Pencil className="h-4 w-4" /></Button>
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
          <div className="h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground gap-4">
            <Megaphone className="h-10 w-10 opacity-20" />
            <p className="text-sm">No media templates found. Click "Seed Standard Templates" to load best practices.</p>
          </div>
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Media Statement Template</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateTemplate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Statement Type</Label>
                <Select name="type" defaultValue={editingTemplate?.type}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Immediate">Immediate Statement</SelectItem>
                    <SelectItem value="Second Statement">Secondary Update</SelectItem>
                    <SelectItem value="Post-Incident">Final Closure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Internal Title</Label>
                <Input name="title" defaultValue={editingTemplate?.title} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Statement Content</Label>
              <Textarea name="content" className="min-h-64" defaultValue={editingTemplate?.content} required />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Update Template</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
