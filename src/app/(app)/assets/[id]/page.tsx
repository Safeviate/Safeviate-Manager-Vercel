
'use client';

import { Suspense, useState, useMemo, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, doc, query, where, deleteDoc } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Edit, Pencil, Trash2 } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"
import { AircraftMaintenance } from './aircraft-maintenance';
import { AircraftDocuments } from './aircraft-documents';
import { AircraftDetailsForm } from './aircraft-details-form';
import type { Aircraft } from '../page';
import { AircraftComponents } from './aircraft-components';
import { AircraftDetails } from './aircraft-details';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';

interface AircraftDetailPageProps {
    params: { id: string };
}

function AircraftDetailContent({ params }: AircraftDetailPageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const { hasPermission } = usePermissions();
    const tenantId = 'safeviate';
    const aircraftId = resolvedParams.id;

    const { toast } = useToast();
    const router = useRouter();
    
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const canEdit = hasPermission('assets-edit');
    const canDelete = hasPermission('assets-delete');

    const aircraftRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
        [firestore, tenantId, aircraftId]
    );

    const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftRef);
    
    const handleDelete = async () => {
        if (!firestore || !aircraftRef) return;
        await deleteDocumentNonBlocking(aircraftRef);
        toast({
            title: 'Aircraft Deleted',
            description: `Aircraft ${aircraft?.tailNumber} has been deleted.`,
        });
        router.push('/assets');
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error) {
        return <div className="text-destructive">Error loading aircraft: {error.message}</div>;
    }

    if (!aircraft) {
        return <div>Aircraft not found.</div>;
    }

    return (
        <div className='space-y-6'>
            {isEditing ? (
                <AircraftDetailsForm 
                    aircraft={aircraft}
                    tenantId={tenantId}
                    onFormSubmit={() => setIsEditing(false)}
                />
            ) : (
             <>
                <div className="flex justify-end gap-2">
                    {canEdit && (
                         <Button onClick={() => setIsEditing(true)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Aircraft
                        </Button>
                    )}
                    {canDelete && (
                        <AlertDialog>
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
                                        This action cannot be undone. This will permanently delete the aircraft &quot;{aircraft.tailNumber}&quot;.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>

                <Tabs defaultValue="details" className="w-full">
                    <TabsList>
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="components">Components</TabsTrigger>
                        <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                        <TabsTrigger value="documents">Documents</TabsTrigger>
                    </TabsList>
                    <TabsContent value="details" className="mt-6">
                        <AircraftDetails aircraft={aircraft} />
                    </TabsContent>
                    <TabsContent value="components" className="mt-6">
                        <AircraftComponents aircraftId={aircraftId} tenantId={tenantId} />
                    </TabsContent>
                    <TabsContent value="maintenance" className="mt-6">
                        <AircraftMaintenance aircraftId={aircraftId} tenantId={tenantId} />
                    </TabsContent>
                     <TabsContent value="documents" className="mt-6">
                        <AircraftDocuments aircraft={aircraft} tenantId={tenantId} />
                    </TabsContent>
                </Tabs>
            </>
            )}
        </div>
    );
}


export default function AircraftDetailPage(props: AircraftDetailPageProps) {
  return (
    <Suspense fallback={<Skeleton className="h-[70vh] w-full" />}>
      <AircraftDetailContent {...props} />
    </Suspense>
  )
}
