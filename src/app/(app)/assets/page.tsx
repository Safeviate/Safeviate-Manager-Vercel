'use client';
import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AircraftTable } from './aircraft-table';
import type { Aircraft } from '@/types/aircraft';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function AssetsPage() {
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    const aircraftQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
        [firestore, tenantId]
    );
    
    const { data: aircraft, isLoading, error } = useCollection<Aircraft>(aircraftQuery);

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
                    <p className="text-muted-foreground">Manage all aircraft in your organization.</p>
                </div>
                <Button asChild>
                    <Link href="/assets/add">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Aircraft
                    </Link>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Aircraft Summary</CardTitle>
                    <CardDescription>A list of all aircraft in your fleet.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AircraftTable data={aircraft || []} tenantId={tenantId} isLoading={isLoading} error={error} />
                </CardContent>
            </Card>
        </div>
    )
}
