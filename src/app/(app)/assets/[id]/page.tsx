'use client';

import { use, Suspense } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { AircraftComponents } from './aircraft-components';
import { AircraftOverview } from './aircraft-overview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import type { Aircraft } from '../page';

interface AircraftDetailPageProps {
    params: { id: string };
}

function AircraftDetailPageContent({ params }: AircraftDetailPageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const aircraftId = resolvedParams.id;

    const aircraftRef = useMemoFirebase(
        () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
        [firestore, tenantId, aircraftId]
    );

    const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftRef);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Card>
                    <Skeleton className="h-64 w-full" />
                </Card>
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
        <div className="space-y-6">
            <Button asChild variant="outline" className="w-fit">
                <Link href="/assets">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Fleet
                </Link>
            </Button>
            
            <Tabs defaultValue="overview">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="components">Components</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="mt-4">
                    <AircraftOverview aircraft={aircraft} />
                </TabsContent>
                <TabsContent value="components" className="mt-4">
                    <AircraftComponents aircraft={aircraft} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function AircraftDetailPage(props: AircraftDetailPageProps) {
    return (
        <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <AircraftDetailPageContent {...props} />
        </Suspense>
    );
}
