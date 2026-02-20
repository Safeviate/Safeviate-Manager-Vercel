'use client';

import { useState } from 'react';
import { collection, query, doc, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { deleteDocumentNonBlocking } from '@/firebase';
import type { MaintenanceLog } from '@/types/aircraft';
import { Skeleton } from '@/components/ui/skeleton';

interface AircraftSnagsProps {
  aircraftId: string;
  tenantId: string;
}

const NewSnagForm = ({ aircraftId, tenantId, onSnagAdded }: { aircraftId: string, tenantId: string, onSnagAdded: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [description, setDescription] = useState('');
    const [procedure, setProcedure] = useState('');
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleAddSnag = () => {
        if (!description.trim()) {
            toast({ variant: 'destructive', title: 'Description is required' });
            return;
        }

        if (!firestore) return;
        const snagsCollection = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`);
        
        addDocumentNonBlocking(snagsCollection, {
            aircraftId,
            date: new Date().toISOString(),
            description,
            procedure,
        });

        toast({ title: 'Snag Added' });
        setDescription('');
        setProcedure('');
        setIsOpen(false);
        onSnagAdded();
    };

    return (
         <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Snag
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Maintenance Snag</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <Textarea 
                        placeholder="Describe the snag or issue..." 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                    />
                    <Textarea 
                        placeholder="Describe the procedure taken (optional)..." 
                        value={procedure} 
                        onChange={(e) => setProcedure(e.target.value)} 
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleAddSnag}>Add Snag</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function AircraftSnags({ aircraftId, tenantId }: AircraftSnagsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const snagsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`), orderBy('date', 'desc'))
        : null,
    [firestore, tenantId, aircraftId]
  );
  
  const { data: snags, isLoading, error } = useCollection<MaintenanceLog>(snagsQuery);

  const handleDeleteSnag = (snagId: string) => {
    if (!firestore) return;
    const snagRef = doc(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/maintenanceLogs`, snagId);
    deleteDocumentNonBlocking(snagRef);
    toast({ title: "Snag Deleted" });
  };
  
  if (isLoading) {
    return (
        <Card>
            <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
            <CardContent>
                <Skeleton className="h-40 w-full" />
            </CardContent>
        </Card>
    );
  }

  if (error) {
      return <p className="text-destructive">Error loading snags: {error.message}</p>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle>Maintenance Snags</CardTitle>
            <NewSnagForm aircraftId={aircraftId} tenantId={tenantId} onSnagAdded={() => {}} />
        </div>
        <CardDescription>A log of reported maintenance issues and defects for this aircraft.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Procedure</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snags && snags.length > 0 ? (
              snags.map((snag) => (
                <TableRow key={snag.id}>
                  <TableCell>{format(new Date(snag.date), 'PPP')}</TableCell>
                  <TableCell>{snag.description}</TableCell>
                  <TableCell>{snag.procedure || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteSnag(snag.id)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No snags reported for this aircraft.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
