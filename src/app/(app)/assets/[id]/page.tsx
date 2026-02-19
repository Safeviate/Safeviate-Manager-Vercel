'use client';

import { use, useMemo } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Aircraft } from '../page';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Pencil, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AircraftDetailsPageProps {
  params: { id: string };
}

const DetailItem = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-lg">{value ? `${value}` : 'N/A'}{typeof value === 'number' ? ' hrs' : ''}</p>
    </div>
);

function AircraftDetailsPage({ params }: AircraftDetailsPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;
  const router = useRouter();

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  
  const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftRef);

  if (isLoading) {
    return (
      <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">Error: {error.message}</p>;
  }

  if (!aircraft) {
    return <p>Aircraft not found.</p>;
  }

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <Button asChild variant="outline">
                <Link href="/assets">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Fleet
                </Link>
            </Button>
            <Button onClick={() => router.push(`/assets/${aircraft.id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Aircraft
            </Button>
        </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{aircraft.tailNumber}</CardTitle>
          <CardDescription>{aircraft.model}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DetailItem label="Type" value={aircraft.type} />
            <DetailItem label="Abbreviation" value={aircraft.abbreviation} />
            <DetailItem label="Frame Hours" value={aircraft.frameHours} />
            <DetailItem label="Engine Hours" value={aircraft.engineHours} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Hours & Inspections</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DetailItem label="Current Hobbs" value={aircraft.currentHobbs} />
            <DetailItem label="Current Tacho" value={aircraft.currentTacho} />
            <DetailItem label="Tacho to 50hr" value={aircraft.tachoAtNext50Inspection ? aircraft.tachoAtNext50Inspection - (aircraft.currentTacho || 0) : null} />
            <DetailItem label="Tacho to 100hr" value={aircraft.tachoAtNext100Inspection ? aircraft.tachoAtNext100Inspection - (aircraft.currentTacho || 0) : null} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div className='space-y-1.5'>
              <CardTitle>Documents & Maintenance</CardTitle>
              <CardDescription>Manage aircraft documents and maintenance logs.</CardDescription>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create document
            </Button>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Document and maintenance log display coming soon.</p>
        </CardContent>
      </Card>

    </div>
  );
}

export default AircraftDetailsPage;
