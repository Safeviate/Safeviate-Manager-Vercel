'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { AssetForm } from './asset-form';
import { AssetActions } from './asset-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';

// Define Aircraft type directly here or import from types
export type AircraftComponent = {
    id: string;
    manufacturer?: string | null;
    name: string;
    partNumber: string;
    serialNumber?: string | null;
    installDate?: string | null; // ISO String
    installHours?: number | null;
    maxHours?: number | null;
    notes?: string | null;
    tsn?: number | null;
    tso?: number | null;
};

export type Aircraft = {
    id: string;
    tailNumber: string;
    model: string;
    abbreviation?: string;
    type?: 'Single-Engine' | 'Multi-Engine';
    currentHobbs?: number;
    currentTacho?: number;
    components?: AircraftComponent[];
    // other fields as per your backend.json
};

export default function AssetsPage() {
    const firestore = useFirestore();
    const { hasPermission } = usePermissions();
    const tenantId = 'safeviate';
    const canManageAssets = hasPermission('assets-create'); // Assuming a permission

    const aircraftsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
        [firestore, tenantId]
    );
    const bookingsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `tenants/${tenantId}/bookings`)) : null),
        [firestore, tenantId]
    );

    const { data: aircrafts, isLoading: isLoadingAircrafts, error: aircraftsError } = useCollection<Aircraft>(aircraftsQuery);
    const { data: bookings } = useCollection(bookingsQuery);

    const isLoading = isLoadingAircrafts;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
                    <p className="text-muted-foreground">Manage all aircraft in your organization.</p>
                </div>
                {canManageAssets && (
                    <AssetForm
                        tenantId={tenantId}
                        trigger={
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Aircraft
                            </Button>
                        }
                    />
                )}
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Fleet List</CardTitle>
                    <CardDescription>A list of all registered aircraft.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tail Number</TableHead>
                                <TableHead>Model</TableHead>
                                <TableHead>Hobbs</TableHead>
                                <TableHead>Tacho</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={5}><Skeleton className="h-8" /></TableCell>
                                    </TableRow>
                                ))
                            ) : aircraftsError ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-destructive">{aircraftsError.message}</TableCell>
                                </TableRow>
                            ) : aircrafts && aircrafts.length > 0 ? (
                                aircrafts.map((aircraft) => (
                                    <TableRow key={aircraft.id}>
                                        <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
                                        <TableCell>{aircraft.model}</TableCell>
                                        <TableCell>{aircraft.currentHobbs?.toFixed(1) || 'N/A'}</TableCell>
                                        <TableCell>{aircraft.currentTacho?.toFixed(1) || 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            <AssetActions aircraft={aircraft} bookings={bookings || []} tenantId={tenantId} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">No aircraft found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
