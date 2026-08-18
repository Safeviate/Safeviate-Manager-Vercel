'use client';

import { useCallback, useEffect, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import type { ExternalOrganization } from '@/types/quality';
import { DeleteActionButton, EditActionButton } from '@/components/record-action-buttons';

const UPDATED_EVENT = 'safeviate-external-organizations-updated';

export default function ExternalSuppliersPage() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('admin-external-orgs-manage');
  const [suppliers, setSuppliers] = useState<ExternalOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<ExternalOrganization | null>(null);
  const [name, setName] = useState('');

  const loadSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/external-organizations?type=supplier', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      setSuppliers(Array.isArray(payload.organizations) ? payload.organizations : []);
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { void loadSuppliers(); window.addEventListener(UPDATED_EVENT, loadSuppliers); return () => window.removeEventListener(UPDATED_EVENT, loadSuppliers); }, [loadSuppliers]);

  const openForm = (supplier: ExternalOrganization | null = null) => { if (!canManage) return; setEditing(supplier); setName(supplier?.name || ''); setIsOpen(true); };

  const saveSupplier = async () => {
    if (!name.trim()) { toast({ variant: 'destructive', title: 'Name required', description: 'Enter the supplier name.' }); return; }
    const response = await fetch(editing ? `/api/external-organizations/${editing.id}` : '/api/external-organizations', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organization: { ...(editing || {}), name: name.trim(), recordType: 'supplier' }, ...(editing ? {} : { copyCoherenceMatrix: false }) }) });
    if (!response.ok) { toast({ variant: 'destructive', title: 'Save failed', description: 'The supplier could not be saved.' }); return; }
    setIsOpen(false); window.dispatchEvent(new Event(UPDATED_EVENT)); toast({ title: editing ? 'Supplier updated' : 'Supplier added' });
  };

  const deleteSupplier = async (id: string) => { const response = await fetch(`/api/external-organizations/${id}`, { method: 'DELETE' }); if (!response.ok) { toast({ variant: 'destructive', title: 'Delete failed', description: 'The supplier could not be deleted.' }); return; } window.dispatchEvent(new Event(UPDATED_EVENT)); toast({ title: 'Supplier deleted' }); };

  return <div className="mx-auto flex h-full min-h-0 w-full max-w-[1100px] flex-col gap-6 pt-4">
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden shadow-none"><CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20"><div><h1 className="text-lg font-black uppercase tracking-wide">External Suppliers</h1><p className="text-sm text-muted-foreground">Name-only register for third-party audit suppliers.</p></div>{canManage ? <Button onClick={() => openForm()}><PlusCircle className="mr-2 h-4 w-4" />Add Supplier</Button> : null}</CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-auto p-0"><div className="divide-y">{isLoading ? <p className="p-8 text-center text-muted-foreground">Loading...</p> : null}{!isLoading && suppliers.length === 0 ? <p className="p-8 text-center text-muted-foreground">No external suppliers found.</p> : null}{suppliers.map((supplier) => <div key={supplier.id} className="flex items-center justify-between gap-4 px-6 py-4"><span className="font-medium">{supplier.name}</span><div className="flex items-center gap-2">{canManage ? <EditActionButton onClick={() => openForm(supplier)} label="Edit supplier" /> : null}{canManage ? <DeleteActionButton description={`Delete external supplier ${supplier.name}?`} onDelete={() => deleteSupplier(supplier.id)} srLabel="Delete supplier" /> : null}</div></div>)}</div></CardContent>
    </Card><Dialog open={isOpen} onOpenChange={setIsOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} External Supplier</DialogTitle></DialogHeader><div className="space-y-2 py-4"><Label htmlFor="supplier-name">Supplier name</Label><Input id="supplier-name" value={name} onChange={(event) => setName(event.target.value)} autoFocus /></div><DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={() => void saveSupplier()}>Save Supplier</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
