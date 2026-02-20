'use client';

import { useState, useMemo, use, Suspense } from 'react';
import { doc, collection, query, deleteDoc } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { usePermissions } from '@/hooks/use-permissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AircraftComponents } from './aircraft-components';
import { AircraftMaintenance } from './aircraft-maintenance';
import { AircraftDocuments } from './aircraft-documents';
import { AircraftDetailsForm } from './aircraft-details-form';
import type { Aircraft } from '../page';
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
import { useRouter } from 'next/navigation';

interface AircraftDetailPageProps {
    params: { id: string };
}


function AircraftDetailContent({ params }: AircraftDetailPageProps) {
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const { hasPermission } = usePermissions();
    const tenantId = 'safeviate';
    const aircraftId = params.id;
    
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    
    const canEdit = hasPermission('assets-edit');
    const canDelete = hasPermission('assets-delete');

    const aircraftDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
        [firestore, tenantId, aircraftId]
    );

    const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftDocRef);

    const handleDelete = async () => {
        if (!firestore || !aircraftDocRef) return;
        try {
            await deleteDocumentNonBlocking(aircraftDocRef);
            toast({
                title: 'Aircraft Deleted',
                description: `Aircraft ${aircraft?.tailNumber} has been deleted.`,
            });
            router.push('/assets');
        } catch (e) {
            toast({
                variant: 'destructive',
                title: 'Error Deleting Aircraft',
                description: 'An unexpected error occurred.',
            });
        } finally {
            setIsDeleteDialogOpen(false);
        }
    };


    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-1/4" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }
    
    if (error) {
        return <p className="text-destructive text-center">Error loading aircraft: {error.message}</p>;
    }

    if (!aircraft) {
        return <p className="text-center">Aircraft not found.</p>;
    }
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Button asChild variant="outline">
                    <Link href="/assets">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Aircraft
                    </Link>
                </Button>
                <div className="flex items-center gap-2">
                    {canEdit && !isEditing && (
                        <Button onClick={() => setIsEditing(true)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Aircraft
                        </Button>
                    )}
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
                                        This action cannot be undone. This will permanently delete aircraft {aircraft.tailNumber}.
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

            {isEditing ? (
                <AircraftDetailsForm 
                    aircraft={aircraft}
                    tenantId={tenantId}
                    onFormSubmit={() => setIsEditing(false)}
                />
            ) : (
                <Tabs defaultValue="details">
                    <TabsList>
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="components">Components</TabsTrigger>
                        <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                        <TabsTrigger value="documents">Documents</TabsTrigger>
                    </TabsList>
                    <TabsContent value="details" className="mt-4">
                        {/* Details View Here - to be created */}
                        <p>Details view coming soon.</p>
                    </TabsContent>
                    <TabsContent value="components" className="mt-4">
                         <AircraftComponents aircraft={aircraft} tenantId={tenantId} />
                    </TabsContent>
                    <TabsContent value="maintenance" className="mt-4">
                        <AircraftMaintenance aircraftId={aircraftId} tenantId={tenantId} />
                    </TabsContent>
                    <TabsContent value="documents" className="mt-4">
                         <AircraftDocuments aircraftId={aircraftId} tenantId={tenantId} />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    )
}


export default function AircraftDetailPage(props: AircraftDetailPageProps) {
    return (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <AircraftDetailContent {...props} />
        </Suspense>
    )
}
