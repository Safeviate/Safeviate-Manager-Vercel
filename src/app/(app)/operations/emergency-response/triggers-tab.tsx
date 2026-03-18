'use client';

import { useState } from 'react';
import { collection, query, doc, deleteDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { ERPTrigger } from '@/types/erp';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';

interface TriggersTabProps {
  tenantId: string;
}

export function TriggersTab({ tenantId }: TriggersTabProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const canAdmin = hasPermission('operations-erp-admin');

  const triggersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/erp-triggers`)) : null),
    [firestore, tenantId]
  );
  const { data: triggers } = useCollection<ERPTrigger>(triggersQuery);

  const handleAddTrigger = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canAdmin) return;

    const formData = new FormData(e.currentTarget);
    const checklistRaw = formData.get('checklist') as string;
    const newTrigger = {
      eventType: formData.get('eventType') as string,
      criteria: formData.get('criteria') as string,
      checklist: checklistRaw.split('\n').filter(l => l.trim()),
    };

    if (!firestore) return;
    addDocumentNonBlocking(collection(firestore, `tenants/${tenantId}/erp-triggers`), newTrigger);
    setIsAddOpen(false);
    toast({ title: 'Trigger Defined' });
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !canAdmin) return;
    await deleteDoc(doc(firestore, `tenants/${tenantId}/erp-triggers`, id));
    toast({ title: 'Trigger Deleted' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-xl font-bold font-headline">Internal Activation Triggers</h2>
          <p className="text-sm text-muted-foreground">Internal company policies that dictate when the ERP must be initiated.</p>
        </div>
        {canAdmin && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Define Trigger</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Define Activation Trigger</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddTrigger} className="space-y-4">
                <div className="space-y-2"><Label>Event Type</Label><Input name="eventType" placeholder="e.g., Aircraft 30m Overdue" required /></div>
                <div className="space-y-2"><Label>Activation Criteria</Label><Textarea name="criteria" placeholder="Describe exactly what triggers this action..." required /></div>
                <div className="space-y-2"><Label>Initial Checklist (One per line)</Label><Textarea name="checklist" placeholder="1. Secure flight log&#10;2. Call Safety Manager..." required /></div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button type="submit">Define Trigger</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(triggers || []).map(trigger => (
          <Card key={trigger.id} className="shadow-none border border-amber-200 bg-amber-50/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-lg">{trigger.eventType}</CardTitle>
              </div>
              {canAdmin && <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(trigger.id)}><Trash2 className="h-4 w-4" /></Button>}
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm font-medium leading-relaxed">{trigger.criteria}</p>
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Immediate Actions</p>
                <ul className="space-y-1.5">
                  {trigger.checklist.map((item, i) => (
                    <li key={i} className="text-xs flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!triggers || triggers.length === 0) && (
          <div className="col-span-2 h-48 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
            No internal triggers defined yet.
          </div>
        )}
      </div>
    </div>
  );
}
