'use client';

import { useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Plane, ChevronRight, Activity, Gauge } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { Aircraft } from '@/types/aircraft';
import { usePermissions } from '@/hooks/use-permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const tenantId = 'safeviate';
  
  const canManage = hasPermission('assets-create');

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
    [firestore, tenantId]
  );

  const { data: fleet, isLoading } = useCollection<Aircraft>(aircraftQuery);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newAc, setNewAc] = useState({ tailNumber: '', make: '', model: '', type: 'Single-Engine' as const });

  const handleAddAircraft = () => {
    if (!newAc.tailNumber || !newAc.make || !newAc.model) {
        toast({ variant: "destructive", title: "Missing Fields" });
        return;
    }
    const colRef = collection(firestore!, `tenants/${tenantId}/aircrafts`);
    addDocumentNonBlocking(colRef, { 
        ...newAc, 
        currentHobbs: 0, 
        currentTacho: 0,
        id: newAc.tailNumber.replace(/\s+/g, '-').toLowerCase()
    });
    toast({ title: "Aircraft Added", description: `${newAc.tailNumber} has been added to the fleet.` });
    setIsAddOpen(false);
    setNewAc({ tailNumber: '', make: '', model: '', type: 'Single-Engine' });
  };

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage and monitor technical status across the entire fleet.</p>
        </div>
        {canManage && (
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Register New Aircraft</DialogTitle>
                        <DialogDescription>Add a new tail number to the organization's fleet.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2 col-span-2"><Label>Tail Number</Label><Input placeholder="e.g. ZS-FST" value={newAc.tailNumber} onChange={e => setNewAc({...newAc, tailNumber: e.target.value.toUpperCase()})} /></div>
                        <div className="space-y-2"><Label>Make</Label><Input placeholder="e.g. Piper" value={newAc.make} onChange={e => setNewAc({...newAc, make: e.target.value})} /></div>
                        <div className="space-y-2"><Label>Model</Label><Input placeholder="e.g. PA-28-180" value={newAc.model} onChange={e => setNewAc({...newAc, model: e.target.value})} /></div>
                        <div className="space-y-2 col-span-2">
                            <Label>Category</Label>
                            <Select value={newAc.type} onValueChange={(v: any) => setNewAc({...newAc, type: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Single-Engine">Single-Engine</SelectItem>
                                    <SelectItem value="Multi-Engine">Multi-Engine</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleAddAircraft}>Register Aircraft</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-1">
        {fleet?.map(ac => (
          <Link key={ac.id} href={`/assets/aircraft/${ac.id}`}>
            <Card className="hover:bg-muted/50 transition-all shadow-none border group">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Plane className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{ac.tailNumber}</CardTitle>
                      <CardDescription>{ac.model}</CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1"><Gauge className="h-3 w-3" /> Hobbs</p>
                        <p className="text-sm font-mono font-bold">{ac.currentHobbs?.toFixed(1) || '0.0'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> Tacho</p>
                        <p className="text-sm font-mono font-bold">{ac.currentTacho?.toFixed(1) || '0.0'}</p>
                    </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                    <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Airworthy</Badge>
                    <span className="text-[10px] text-muted-foreground font-medium">Next Insp: 50h</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {(!fleet || fleet.length === 0) && (
            <Card className="col-span-full h-48 flex items-center justify-center border-2 border-dashed shadow-none">
                <p className="text-muted-foreground">No aircraft registered in the fleet.</p>
            </Card>
        )}
      </div>
    </div>
  );
}
