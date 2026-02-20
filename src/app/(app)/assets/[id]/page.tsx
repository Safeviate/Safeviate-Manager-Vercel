'use client';

import { use, Suspense, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Aircraft } from '../page';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil } from 'lucide-react';
import Link from 'next/link';
import { usePermissions } from '@/hooks/use-permissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ViewAircraftDetails } from './view-asset-details';
import { EditAircraftForm } from '../edit-asset-form';
import { AircraftDocuments } from './aircraft-documents';
import { AircraftComponents } from './aircraft-components';
import { AircraftSnags } from './aircraft-snags';

interface AircraftDetailPageProps {
  params: { id: string };
}

function AircraftDetailPageContent({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const [isEditing, setIsEditing] = useState(false);
  const { hasPermission } = usePermissions();

  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const aircraftDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  
  const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftDocRef);

  const canEdit = hasPermission('assets-edit');
  const canDelete = hasPermission('assets-delete');

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive text-center p-8">Error: {error.message}</div>;
  }

  if (!aircraft) {
    return <div className="text-center p-8">Aircraft not found.</div>;
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
                <Pencil className='mr-2 h-4 w-4' /> Edit Aircraft
            </Button>
        )}
      </div>

       {isEditing ? (
        <EditAircraftForm existingAircraft={aircraft} onSave={() => {}} onCancel={() => setIsEditing(false)} />
      ) : (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
            <TabsTrigger value="snags">Snags</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-4">
            <ViewAircraftDetails aircraft={aircraft} />
          </TabsContent>
          <TabsContent value="documents" className="mt-4">
            <AircraftDocuments aircraft={aircraft} tenantId={tenantId} canEdit={canEdit} />
          </TabsContent>
           <TabsContent value="components" className="mt-4">
            <AircraftComponents aircraft={aircraft} tenantId={tenantId} canEdit={canEdit} />
          </TabsContent>
           <TabsContent value="snags" className="mt-4">
            <AircraftSnags aircraftId={aircraftId} tenantId={tenantId} />
          </TabsContent>
        </Tabs>
      )}
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
