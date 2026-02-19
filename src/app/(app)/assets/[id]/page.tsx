
'use client';

import { use } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Aircraft } from '@/types/aircraft';

interface AircraftDetailPageProps {
    params: { id: string };
}

const DetailItem = ({ label, value, unit }: { label: string; value?: string | number | null; unit?: string }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">
            {value !== null && value !== undefined ? `${value} ${unit || ''}`.trim() : 'N/A'}
        </p>
    </div>
);

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
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
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-1/4 mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                        <Skeleton className="h-32 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (error) {
        return <p className="text-destructive">Error loading aircraft: {error.message}</p>;
    }

    if (!aircraft) {
        return <div>Aircraft not found.</div>;
    }

    const tachoToNext50 = aircraft.tachoAtNext50Inspection ? (aircraft.tachoAtNext50Inspection - (aircraft.currentTacho || 0)).toFixed(1) : 'N/A';
    const tachoToNext100 = aircraft.tachoAtNext100Inspection ? (aircraft.tachoAtNext100Inspection - (aircraft.currentTacho || 0)).toFixed(1) : 'N/A';

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
                    <CardTitle className="text-2xl">{aircraft.tailNumber}</CardTitle>
                    <CardDescription>{aircraft.model}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <DetailItem label="Type" value={aircraft.type} />
                        <DetailItem label="Abbreviation" value={aircraft.abbreviation} />
                        <DetailItem label="Frame Hours" value={aircraft.frameHours} unit="hrs" />
                        <DetailItem label="Engine Hours" value={aircraft.engineHours} unit="hrs" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Hours & Inspections</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
                     <DetailItem label="Current Hobbs" value={aircraft.currentHobbs} unit="hrs" />
                     <DetailItem label="Current Tacho" value={aircraft.currentTacho} unit="hrs" />
                     <DetailItem label="Tacho to 50hr" value={tachoToNext50} unit="hrs" />
                     <DetailItem label="Tacho to 100hr" value={tachoToNext100} unit="hrs" />
                </CardContent>
            </Card>

            {/* Placeholder for Documents and Maintenance */}
            <Card>
                 <CardHeader>
                    <CardTitle>Documents & Maintenance</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Document and maintenance log display coming soon.</p>
                </CardContent>
            </Card>
        </div>
    );
}
