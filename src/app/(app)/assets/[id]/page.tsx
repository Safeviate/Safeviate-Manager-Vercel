'use client';

import { use, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, collection, deleteDoc } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
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
import { usePermissions } from '@/hooks/use-permissions';


interface AircraftDetailPageProps {
    params: { id: string };
}

function AircraftDetailContent({ params }: AircraftDetailPageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const { hasPermission } = usePermissions();
    const tenantId = 'safeviate';
    const aircraftId = resolvedParams.id;
    
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const canEdit = hasPermission('assets-edit');
    const canDelete = hasPermission('assets-delete');

    const aircraftDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
        [firestore, tenantId, aircraftId]
    );

    const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftDocRef);

    const handleDeleteAircraft = async () => {
        if (!firestore) return;
        try {
            await deleteDocumentNonBlocking(aircraftDocRef!);
            toast({
                title: 'Aircraft Deleted',
                description: `Aircraft ${aircraft?.tailNumber} has been successfully deleted.`,
            });
            router.push('/assets');
        } catch (e) {
            toast({
                variant: 'destructive',
                title: 'Error Deleting Aircraft',
                description: 'There was an issue deleting the aircraft.',
            });
        }
    };


    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-3/4 mt-2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-48 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return <div className="text-destructive">Error: {error.message}</div>;
    }

    if (!aircraft) {
        return <div>Aircraft not found.</div>;
    }
    
    if (isEditing) {
        return <AircraftDetailsForm aircraft={aircraft} tenantId={tenantId} onCancel={() => setIsEditing(false)} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <Button asChild variant="outline" className="mb-4">
                        <Link href="/assets">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Fleet
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
                    <p className="text-muted-foreground">{aircraft.model}</p>
                </div>
                <div className="flex gap-2">
                    {canEdit && <Button onClick={() => setIsEditing(true)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>}
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
                                        This action cannot be undone. This will permanently delete the aircraft and all its associated data.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteAircraft}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </div>

            <Tabs defaultValue="details">
                <TabsList>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="components">Components</TabsTrigger>
                    <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="pt-4">
                     <Card>
                        <CardHeader><CardTitle>Aircraft Details</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <div className="font-medium">Tail Number: <span className="font-normal">{aircraft.tailNumber}</span></div>
                            <div className="font-medium">Model: <span className="font-normal">{aircraft.model}</span></div>
                            <div className="font-medium">Current Hobbs: <span className="font-normal">{aircraft.currentHobbs}</span></div>
                            <div className="font-medium">Current Tacho: <span className="font-normal">{aircraft.currentTacho}</span></div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="components">
                    <AircraftComponents aircraft={aircraft} tenantId={tenantId} aircraftId={aircraft.id} />
                </TabsContent>
                <TabsContent value="maintenance">
                    <AircraftMaintenance aircraftId={aircraft.id} tenantId={tenantId} />
                </TabsContent>
                <TabsContent value="documents">
                    <AircraftDocuments aircraft={aircraft} tenantId={tenantId} />
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
