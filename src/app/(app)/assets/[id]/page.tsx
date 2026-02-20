
'use client';

import { use, useState, Suspense } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/use-permissions';
import { AircraftDetails } from './aircraft-details';
import { AircraftComponents } from './aircraft-components';
import { AircraftMaintenance } from './aircraft-maintenance';
import { AircraftDocuments } from './aircraft-documents';
import type { Aircraft } from '../../assets/page';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface AircraftDetailPageProps {
    params: { id: string };
}

function AircraftDetailContent({ params }: AircraftDetailPageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const { hasPermission } = usePermissions();
    const canEdit = hasPermission('assets-edit');
    const canDelete = hasPermission('assets-delete');

    const tenantId = 'safeviate'; // Hardcoding to fix the 'undefined' issue.
    const aircraftId = resolvedParams.id;

    const aircraftRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
        [firestore, tenantId, aircraftId]
    );
    const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftRef);

    const handleDelete = async () => {
        if (!firestore || !aircraft) return;
        try {
            await deleteDocumentNonBlocking(aircraftRef);
            toast({ title: 'Aircraft Deleted', description: `${aircraft.tailNumber} has been deleted.` });
            router.push('/assets');
        } catch(e: any) {
            toast({ variant: 'destructive', title: 'Error deleting aircraft', description: e.message });
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-[500px] w-full" />
            </div>
        );
    }
    
    if (error) {
        return <p className="text-destructive text-center p-8">Error: {error.message}</p>;
    }
    
    if (!aircraft) {
        return <p className="text-center p-8">Aircraft not found.</p>;
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
                <div className="flex gap-2">
                    {canEdit && (
                         <Button onClick={() => setIsEditing(!isEditing)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {isEditing ? 'Cancel' : 'Edit Aircraft'}
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
                                        This action cannot be undone. This will permanently delete the aircraft and all its associated data.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete}>
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </div>

            <Tabs defaultValue="details" className="w-full">
                <TabsList>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="components">Components</TabsTrigger>
                    <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="mt-4">
                    <AircraftDetails aircraft={aircraft} isEditing={isEditing} tenantId={tenantId} onSave={() => setIsEditing(false)} />
                </TabsContent>
                <TabsContent value="components" className="mt-4">
                    <AircraftComponents aircraft={aircraft} tenantId={tenantId} />
                </TabsContent>
                <TabsContent value="maintenance" className="mt-4">
                    <AircraftMaintenance aircraft={aircraft} />
                </TabsContent>
                <TabsContent value="documents" className="mt-4">
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
