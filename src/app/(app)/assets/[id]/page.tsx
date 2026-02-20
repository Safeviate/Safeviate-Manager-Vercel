
'use client';

import { useState, useMemo, Suspense, use } from 'react';
import { doc, collection, query, deleteDoc } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
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
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

interface AircraftDetailPageProps {
    params: { id: string };
}

const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base">{value ?? 'N/A'}</p>
    </div>
);


function AircraftDetailContent({ params }: AircraftDetailPageProps) {
    const resolvedParams = use(params);
    const { hasPermission } = usePermissions();
    const router = useRouter();
    const { toast } = useToast();
    const tenantId = 'safeviate';
    const aircraftId = resolvedParams.id;

    const [isEditing, setIsEditing] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const canEdit = hasPermission('assets-edit');
    const canDelete = hasPermission('assets-delete');

    const firestore = useFirestore();
    const aircraftDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
        [firestore, tenantId, aircraftId]
    );

    const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftDocRef);

    const handleDelete = async () => {
        if (!firestore) return;
        try {
            await deleteDocumentNonBlocking(aircraftDocRef!);
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
        return <Skeleton className="h-[500px] w-full" />;
    }

    if (error) {
        return <p className="text-destructive text-center p-8">Error loading aircraft details: {error.message}</p>;
    }

    if (!aircraft) {
        return <p className="text-center p-8">Aircraft not found.</p>;
    }

    if (isEditing) {
        return <AircraftDetailsForm aircraft={aircraft} onCancel={() => setIsEditing(false)} />;
    }
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
                    <p className="text-muted-foreground">{aircraft.model}</p>
                </div>
                <div className="flex gap-2">
                    {canEdit && <Button onClick={() => setIsEditing(true)}><Pencil className="mr-2 h-4 w-4" /> Edit</Button>}
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
                                        This action cannot be undone. This will permanently delete the aircraft
                                        &quot;{aircraft.tailNumber}&quot; and all its associated data.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                        Delete
                                    </AlertDialogAction>
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
                <TabsContent value="details" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Aircraft Details</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            <DetailItem label="Tail Number" value={aircraft.tailNumber} />
                            <DetailItem label="Model" value={aircraft.model} />
                            <DetailItem label="Type" value={aircraft.type} />
                            <DetailItem label="Current Hobbs" value={`${aircraft.currentHobbs || 0} hrs`} />
                            <DetailItem label="Current Tacho" value={`${aircraft.currentTacho || 0} hrs`} />
                            <DetailItem label="Next 50hr Insp." value={`${aircraft.tachoAtNext50Inspection || 'N/A'} tacho`} />
                            <DetailItem label="Next 100hr Insp." value={`${aircraft.tachoAtNext100Inspection || 'N/A'} tacho`} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="components" className="mt-4">
                    <AircraftComponents aircraftId={aircraftId} />
                </TabsContent>
                <TabsContent value="maintenance" className="mt-4">
                    <AircraftMaintenance aircraftId={aircraftId} />
                </TabsContent>
                 <TabsContent value="documents" className="mt-4">
                    <AircraftDocuments aircraft={aircraft} />
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default function AircraftDetailPage(props: AircraftDetailPageProps) {
  return (
    <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
      <AircraftDetailContent {...props} />
    </Suspense>
  )
}
