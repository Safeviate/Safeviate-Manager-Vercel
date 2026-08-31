'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createClientId } from '@/lib/client/create-client-id';
import type { QualityChecklistSection, QualityChecklistTemplate } from '@/types/quality';

const newItem = () => ({ id: createClientId(), text: '', type: 'YesNoNA' as const });
const newSection = (): QualityChecklistSection => ({ id: createClientId(), title: '', items: [newItem()] });

export function ChecklistTemplateDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [sections, setSections] = useState<QualityChecklistSection[]>([newSection()]);
  const [saving, setSaving] = useState(false);

  const reset = () => { setTitle(''); setCategory('General'); setSections([newSection()]); };
  const updateSection = (sectionId: string, patch: Partial<QualityChecklistSection>) => setSections((current) => current.map((section) => section.id === sectionId ? { ...section, ...patch } : section));
  const updateItem = (sectionId: string, itemId: string, patch: Record<string, unknown>) => setSections((current) => current.map((section) => section.id === sectionId ? { ...section, items: section.items.map((item) => item.id === itemId ? { ...item, ...patch } : item) } : section));

  const save = async () => {
    const cleanedSections = sections.map((section) => ({ ...section, title: section.title.trim(), items: section.items.map((item) => ({ ...item, text: item.text.trim() })).filter((item) => item.text) })).filter((section) => section.title && section.items.length);
    if (!title.trim() || !cleanedSections.length) { toast({ variant: 'destructive', title: 'Add a title and at least one task' }); return; }
    setSaving(true);
    try {
      const template: QualityChecklistTemplate = { id: createClientId(), title: title.trim(), category, sections: cleanedSections };
      const response = await fetch('/api/quality-checklists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template }) });
      if (!response.ok) throw new Error('Unable to save checklist template.');
      window.dispatchEvent(new Event('safeviate-quality-checklists-updated'));
      toast({ title: 'Checklist template created', description: 'It is ready to start as a separate checklist run.' });
      reset(); setOpen(false);
    } catch (error) { toast({ variant: 'destructive', title: 'Unable to save template', description: error instanceof Error ? error.message : undefined }); } finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
    <DialogTrigger asChild><Button><Plus className="mr-1.5 h-4 w-4" />New Checklist Template</Button></DialogTrigger>
    <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[760px]">
      <DialogHeader><DialogTitle>New Checklist Template</DialogTitle><DialogDescription>Build a simple task checklist. It will create completion records only—never audit findings or corrective actions.</DialogDescription></DialogHeader>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-2 pr-1">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]"><div className="space-y-1.5"><Label htmlFor="checklist-title">Checklist name</Label><Input id="checklist-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Apron opening checklist" /></div><div className="space-y-1.5"><Label>Category</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="General">General</SelectItem><SelectItem value="Operations">Operations</SelectItem><SelectItem value="Safety">Safety</SelectItem><SelectItem value="Quality">Quality</SelectItem></SelectContent></Select></div></div>
        <div className="space-y-3"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold">Inspection questions</p><p className="text-xs text-muted-foreground">Every question is answered Yes, No, or Not Applicable. Add an optional note when the answer is No.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setSections((current) => [...current, newSection()])}><Plus className="mr-1.5 h-3.5 w-3.5" />Add section</Button></div>
          {sections.map((section, sectionIndex) => <div key={section.id} className="rounded-lg border bg-muted/10 p-4"><div className="flex gap-2"><div className="flex-1 space-y-1.5"><Label>Section {sectionIndex + 1}</Label><Input value={section.title} onChange={(event) => updateSection(section.id, { title: event.target.value })} placeholder="e.g. Apron readiness" /></div>{sections.length > 1 && <Button type="button" variant="ghost" size="icon" className="mt-6 text-destructive" onClick={() => setSections((current) => current.filter((item) => item.id !== section.id))}><Trash2 className="h-4 w-4" /></Button>}</div>
            <div className="mt-4 space-y-2">{section.items.map((item, itemIndex) => <div key={item.id} className="flex gap-2 rounded-md border bg-background p-3"><div className="flex-1 space-y-1.5"><Label className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Question {itemIndex + 1} <span className="normal-case font-normal">— answer: Yes / No / N/A</span></Label><Textarea value={item.text} onChange={(event) => updateItem(section.id, item.id, { text: event.target.value })} placeholder="e.g. Is the helipad free from obstacles?" className="min-h-16" /></div><Button type="button" variant="ghost" size="icon" className="mt-6 text-destructive" disabled={section.items.length === 1} onClick={() => updateSection(section.id, { items: section.items.filter((entry) => entry.id !== item.id) })}><Trash2 className="h-4 w-4" /></Button></div>)}</div>
            <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => updateSection(section.id, { items: [...section.items, newItem()] })}><Plus className="mr-1.5 h-3.5 w-3.5" />Add inspection question</Button>
          </div>)}
        </div>
      </div>
      <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="button" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Create checklist template'}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
