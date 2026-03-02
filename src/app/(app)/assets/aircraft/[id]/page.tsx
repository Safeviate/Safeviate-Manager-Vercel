
'use client';

import { use, useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plane } from 'lucide-react';
import Link from 'next/link';
import type { Aircraft } from '@/types/aircraft';
import { AircraftForm } from '../aircraft-form';
import { usePermissions } from '@/hooks/use-permissions';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const DetailItem = ({ label, value }: { label: string; value: string | number | undefined | null }) => (
  <div>
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <p className="text-xl font-bold">{value || '0.0'}</p>
  </div>
);

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const canEdit = hasPermission('assets-edit');

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftRef);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !aircraft) {
    return (
      <div className="text-center py-10">
        <p className="text-destructive mb-4">{error ? error.message : 'Aircraft not found.'}</p>
        <Button asChild variant="outline">
          <Link href="/assets/aircraft">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Fleet
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button asChild variant="outline">
          <Link href="/assets/aircraft">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Fleet
          </Link>
        </Button>
        {canEdit && <AircraftForm tenantId={tenantId} existingAircraft={aircraft} />}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Plane className="size-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-3xl font-black">{aircraft.tailNumber}</CardTitle>
            <CardDescription className="text-lg">{aircraft.make} {aircraft.model}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t">
          <DetailItem label="Type" value={aircraft.type} />
          <DetailItem label="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1)} />
          <DetailItem label="Current Tacho" value={aircraft.currentTacho?.toFixed(1)} />
        </CardContent>
      </Card>

      {/* Placeholder for future sections like Maintenance History, Components, etc. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Maintenance</CardTitle>
            <CardDescription>The last 5 maintenance log entries.</CardDescription>
          </CardHeader>
          <CardContent className="h-32 flex items-center justify-center border-t text-muted-foreground text-sm italic">
            No maintenance records available.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Required Documents</CardTitle>
            <CardDescription>Mandatory aircraft documentation status.</CardDescription>
          </CardHeader>
          <CardContent className="h-32 flex items-center justify-center border-t text-muted-foreground text-sm italic">
            No documents uploaded.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
