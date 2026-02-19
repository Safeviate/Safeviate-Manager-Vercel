'use client';

import { use, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil } from 'lucide-react';
import Link from 'next/link';
import type { Aircraft } from '@/types/aircraft';
import { AircraftDetails } from './aircraft-details';
import { AircraftComponents } from './aircraft-components';
import { AircraftDocuments } from './aircraft-documents';
import { MaintenanceLogs } from './maintenance-logs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AircraftDetailPageProps {
  params: { id: string };
}

function AircraftDetailPageContent({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;
  const [isEditing, setIsEditing] = useState(false);

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  
  const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftRef);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (error) {
    return <p className="text-destructive">Error: {error.message}</p>;
  }

  if (!aircraft) {
    return <p>Aircraft not found.</p>;
  }

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-start">
            <div>
                <Button asChild variant="outline">
                    <Link href="/assets">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Fleet
                    </Link>
                </Button>
            </div>
            <Button onClick={() => setIsEditing(!isEditing)}>
                <Pencil className="mr-2 h-4 w-4" />
                {isEditing ? 'Cancel' : 'Edit Aircraft'}
            </Button>
        </div>

        <Tabs defaultValue="details">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="components">Components</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            </TabsList>
            <TabsContent value="details">
                <AircraftDetails aircraft={aircraft} isEditing={isEditing} onCancel={() => setIsEditing(false)} />
            </TabsContent>
            <TabsContent value="components">
                <AircraftComponents aircraft={aircraft} />
            </TabsContent>
            <TabsContent value="documents">
                <AircraftDocuments aircraft={aircraft} />
            </TabsContent>
            <TabsContent value="maintenance">
                <MaintenanceLogs aircraftId={aircraft.id} />
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
    )
}
