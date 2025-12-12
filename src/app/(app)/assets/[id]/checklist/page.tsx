
'use client';

import { use, useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Aircraft } from '../../../page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface ChecklistPageProps {
    params: { id: string };
}

export default function ChecklistPage({ params }: ChecklistPageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const aircraftId = resolvedParams.id;
    
    const aircraftDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
        [firestore, tenantId, aircraftId]
    );

    const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftDocRef);

    if (isLoading) {
        return (
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-10 w-1/4" />
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-10 w-32" />
          </div>
        );
    }
    
    if (error) {
        return <div className="text-destructive text-center">Error: {error.message}</div>;
    }

    if (!aircraft) {
        return <div className="text-center">Aircraft not found.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                 <Button asChild variant="outline" size="sm">
                    <Link href={`/assets/${aircraftId}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Aircraft
                    </Link>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Pre-Flight Checklist</CardTitle>
                    <CardDescription>
                        Complete the required checks for aircraft <span className='font-bold'>{aircraft.tailNumber}</span>.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Checklist items will go here.</p>
                </CardContent>
                <CardFooter>
                    <Button>Submit Checklist</Button>
                </CardFooter>
            </Card>
        </div>
    );
}
