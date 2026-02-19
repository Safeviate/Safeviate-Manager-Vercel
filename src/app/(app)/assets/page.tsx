
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';
import type { Aircraft as AircraftType } from '@/types/aircraft';


export default function AssetsPage() {
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    const aircraftsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
        [firestore, tenantId]
    );

    const { data: aircrafts, isLoading, error } = useCollection<AircraftType>(aircraftsQuery);

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Aircraft</h1>
                    <p className="text-muted-foreground">Manage all aircraft in your fleet.</p>
                </div>
                <AircraftForm tenantId={tenantId} />
            </div>

            <Card>
                <CardContent className="p-0">
                    {isLoading && (
                        <div className="p-6">
                            <Skeleton className="h-40 w-full" />
                        </div>
                    )}
                    {error && <p className="p-6 text-destructive">Error: {error.message}</p>}
                    {!isLoading && !error && aircrafts && (
                        <AircraftTable data={aircrafts} tenantId={tenantId} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
