
'use client';

import { useState, useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import type { Aircraft } from '@/types/aircraft';
import { AircraftTable } from './aircraft-table';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AircraftForm } from './aircraft-form';
import { usePermissions } from '@/hooks/use-permissions';

export default function AircraftPage() {
  const [isCreateFormOpen, setCreateFormOpen] = useState(false);
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const canManage = hasPermission('assets-create');

  const aircraftsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts')) : null),
    [firestore, tenantId]
  );
  
  const { data: aircrafts, isLoading, error } = useCollection<Aircraft>(aircraftsQuery);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft</h1>
          <p className="text-muted-foreground">Manage all aircraft in your fleet.</p>
        </div>
        {canManage && (
          <Dialog open={isCreateFormOpen} onOpenChange={setCreateFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Aircraft
              </Button>
            </DialogTrigger>
            <DialogContent>
                <AircraftForm onFormSubmit={() => setCreateFormOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fleet</CardTitle>
          <CardDescription>A list of all aircraft in your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Loading aircraft...</p>}
          {error && <p className="text-destructive">Error: {error.message}</p>}
          {aircrafts && <AircraftTable data={aircrafts} />}
        </CardContent>
      </Card>
    </div>
  );
}
