'use client';

import { useState, use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';

import { AircraftDashboard } from './aircraft-dashboard';
import { AircraftComponents } from './aircraft-components';
import { AircraftMaintenance } from './aircraft-maintenance';
import { AircraftDocuments } from './aircraft-documents';
import { AircraftChecklistHistory } from './aircraft-checklist-history';
import { PerformChecklist } from './perform-checklist';

import type { Aircraft } from '../page';

interface AircraftDetailPageProps {
  params: { id: string };
}

function AircraftDetailContent({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();

  const canDelete = hasPermission('assets-delete');

  const aircraftDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );
  
  const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftDocRef);

  const handleDelete = async () => {
    if (!firestore || !aircraft) return;
    try {
      await deleteDoc(doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id));
      toast({ title: "Aircraft Deleted" });
      router.push('/assets');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error deleting aircraft", description: e.message });
    }
    setIsDeleteDialogOpen(false);
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
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
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <p className="text-muted-foreground">{aircraft.model}</p>
        </div>
        <div className="flex gap-2">
            {canDelete && (
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Aircraft
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete the aircraft and all its associated data.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance & Tech Log</TabsTrigger>
          <TabsTrigger value="checklist-history">Checklist History</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="perform-checklist">Perform Checklist</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard">
          <AircraftDashboard aircraft={aircraft} tenantId={tenantId} />
        </TabsContent>
        <TabsContent value="maintenance">
          <AircraftMaintenance />
        </TabsContent>
        <TabsContent value="checklist-history">
          <AircraftChecklistHistory />
        </TabsContent>
        <TabsContent value="documentation">
           <AircraftDocuments documents={aircraft.documents || []} aircraftId={aircraftId} tenantId={tenantId} />
        </TabsContent>
        <TabsContent value="components">
           <AircraftComponents aircraft={aircraft} aircraftId={aircraftId} />
        </TabsContent>
         <TabsContent value="perform-checklist">
          <PerformChecklist />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AircraftDetailPage(props: AircraftDetailPageProps) {
  return (
    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
      <AircraftDetailContent {...props} />
    </Suspense>
  )
}
