'use client';

import { use, useState, Suspense } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Aircraft } from '../page';
import { EditAircraftForm } from '../edit-asset-form';
import { ViewAircraftDetails } from '../view-asset-details';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Pencil, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { usePermissions } from '@/hooks/use-permissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { AircraftComponents } from './aircraft-components';
import { AircraftDocuments } from './aircraft-documents';

interface AircraftDetailPageProps {
  params: { id: string };
}

function AircraftDetailPageContent({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;
  const { hasPermission } = usePermissions();

  const [isEditing, setIsEditing] = useState(false);
  const canEdit = hasPermission('assets-edit');

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
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
        {canEdit && !isEditing && (
            <Button onClick={() => setIsEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
        )}
      </div>

      {isEditing ? (
        <EditAircraftForm aircraft={aircraft} onCancel={() => setIsEditing(false)} />
      ) : (
        <Tabs defaultValue="overview" className="w-full">
            <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="components">Components</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
                <ViewAircraftDetails aircraft={aircraft} />
            </TabsContent>
            <TabsContent value="components">
                <AircraftComponents aircraft={aircraft} tenantId={tenantId} />
            </TabsContent>
            <TabsContent value="documents">
                <AircraftDocuments aircraft={aircraft} tenantId={tenantId} />
            </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default function AircraftDetailPage(props: AircraftDetailPageProps) {
  return (
    <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
      <AircraftDetailPageContent {...props} />
    </Suspense>
  )
}
