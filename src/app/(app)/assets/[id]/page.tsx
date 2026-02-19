'use client';

import { use, useMemo, useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Aircraft } from '@/types/aircraft';

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
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }
    
    if (error) {
        return <p className="text-destructive">Error: {error.message}</p>
    }

    if (!aircraft) {
        return <p>Aircraft not found.</p>
    }

    return (
        <div className="space-y-6">
             <Button asChild variant="outline">
                <Link href="/assets">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Fleet
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>{aircraft.tailNumber}</CardTitle>
                    <CardDescription>{aircraft.model}</CardDescription>
                </CardHeader>
            </Card>

            <Tabs defaultValue="dashboard">
                <TabsList>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="maintenance">Maintenance & Tech Log</TabsTrigger>
                    <TabsTrigger value="checklist-history">Checklist History</TabsTrigger>
                    <TabsTrigger value="documentation">Documentation</TabsTrigger>
                    <TabsTrigger value="components">Components</TabsTrigger>
                    <TabsTrigger value="perform-checklist">Perform Checklist</TabsTrigger>
                </TabsList>
                <TabsContent value="dashboard" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Dashboard</CardTitle></CardHeader>
                        <CardContent><p>Dashboard content will go here.</p></CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="maintenance" className="mt-4">
                     <Card>
                        <CardHeader><CardTitle>Maintenance & Tech Log</CardTitle></CardHeader>
                        <CardContent><p>Maintenance logs and technical records will be displayed here.</p></CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="checklist-history" className="mt-4">
                     <Card>
                        <CardHeader><CardTitle>Checklist History</CardTitle></CardHeader>
                        <CardContent><p>A history of performed checklists will be shown here.</p></CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="documentation" className="mt-4">
                     <Card>
                        <CardHeader><CardTitle>Documentation</CardTitle></CardHeader>
                        <CardContent><p>Aircraft-specific documents (POH, registration, etc.) will be managed here.</p></CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="components" className="mt-4">
                     <Card>
                        <CardHeader><CardTitle>Components</CardTitle></CardHeader>
                        <CardContent><p>Trackable aircraft components will be listed here.</p></CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="perform-checklist" className="mt-4">
                     <Card>
                        <CardHeader><CardTitle>Perform Checklist</CardTitle></CardHeader>
                        <CardContent><p>An interactive checklist interface will be here.</p></CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default function AircraftDetailPage(props: AircraftDetailPageProps) {
    return <AircraftDetailPageContent {...props} />;
}
