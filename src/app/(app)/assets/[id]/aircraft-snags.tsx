'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import type { MaintenanceLog } from '@/types/maintenance';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface AircraftSnagsProps {
  aircraftId: string;
  tenantId: string;
}

const NewSnagForm = ({ onAddSnag }: { onAddSnag: (description: string, procedure: string) => void }) => {
    const [description, setDescription] = useState('');
    const [procedure, setProcedure] = useState('');
    const { toast } = useToast();

    const handleAdd = () => {
        if (!description.trim()) {
            toast({ variant: 'destructive', title: 'Missing Description', description: 'Please describe the snag.' });
            return;
        }
        onAddSnag(description, procedure);
    }

    return (
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="snag-description">Description of Snag</Label>
            <Textarea id="snag-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="snag-procedure">Rectification / Procedure</Label>
            <Textarea id="snag-procedure" value={procedure} onChange={(e) => setProcedure(e.target.value)} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleAdd}>Save Snag</Button>
          </DialogFooter>
        </div>
    )
}

export function AircraftSnags({ aircraftId, tenantId }: AircraftSnagsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const snagsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc')) : null),
    [firestore, tenantId, aircraftId]
  );
  const { data: snags, isLoading } = useCollection<MaintenanceLog>(snagsQuery);

  const handleAddSnag = (description: string, procedure: string) => {
    if (!firestore) return;
    const newSnag: Omit<MaintenanceLog, 'id'> = {
        aircraftId,
        date: new Date().toISOString(),
        description,
        procedure
    };
    const snagsCollection = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
    addDocumentNonBlocking(snagsCollection, newSnag);
    toast({ title: 'Snag Logged' });
    setIsOpen(false);
  };

  const handleRemoveSnag = (snagId: string) => {
    if (!firestore) return;
    const snagRef = doc(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`, snagId);
    deleteDocumentNonBlocking(snagRef);
    toast({ title: 'Snag Removed' });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
            <CardTitle>Maintenance Snags</CardTitle>
            <CardDescription>A log of reported defects and maintenance actions for this aircraft.</CardDescription>
        </div>
         <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Snag
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log New Snag</DialogTitle>
                    <DialogDescription>Describe the defect or maintenance action taken.</DialogDescription>
                </DialogHeader>
                <NewSnagForm onAddSnag={handleAddSnag} />
            </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
        ) : (
            <div className="space-y-4">
                {(snags || []).map(snag => (
                    <div key={snag.id} className="flex justify-between items-start p-4 border rounded-md">
                        <div>
                            <p className="font-semibold">{snag.description}</p>
                            <p className="text-sm text-muted-foreground mt-1">{snag.procedure}</p>
                            <p className="text-xs text-muted-foreground mt-2">{format(new Date(snag.date), 'PPP p')}</p>
                        </div>
                        <Button variant="destructive" size="icon" className="flex-shrink-0" onClick={() => handleRemoveSnag(snag.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                {(snags || []).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No snags logged for this aircraft.</p>
                )}
            </div>
        )}
      </CardContent>
    </Card>
  );
}
