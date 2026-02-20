'use client';
import { useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Eye } from 'lucide-react';
import Link from 'next/link';
import { usePermissions } from '@/hooks/use-permissions';
import { AircraftActions } from './asset-actions';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EditAircraftForm } from './edit-asset-form';
import type { Aircraft as AircraftType } from '@/types/aircraft';


export type Aircraft = AircraftType;

export default function AssetsPage() {
    const firestore = useFirestore();
    const { hasPermission } = usePermissions();
    const tenantId = 'safeviate';

    const canCreate = hasPermission('assets-create');

    const [isAddFormOpen, setIsAddFormOpen] = useState(false);

    const aircraftsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'aircrafts')) : null),
        [firestore, tenantId]
    );

    const { data: aircrafts, isLoading, error } = useCollection<Aircraft>(aircraftsQuery);

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
                    <p className="text-muted-foreground">Manage all aircraft in your organization.</p>
                </div>
                {canCreate && (
                    <Button onClick={() => setIsAddFormOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Aircraft
                    </Button>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Tail Number</TableHead>
                            <TableHead>Model</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Current Hobbs</TableHead>
                            <TableHead>Current Tacho</TableHead>
                            <TableHead>View Details</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {isLoading && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                            </TableRow>
                        )}
                        {error && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-destructive">Error: {error.message}</TableCell>
                            </TableRow>
                        )}
                        {!isLoading && aircrafts && aircrafts.length > 0 ? (
                            aircrafts.map((aircraft) => (
                                <TableRow key={aircraft.id}>
                                <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
                                <TableCell>{aircraft.model}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary">{aircraft.type}</Badge>
                                </TableCell>
                                <TableCell>{aircraft.currentHobbs?.toFixed(1) || 'N/A'}</TableCell>
                                <TableCell>{aircraft.currentTacho?.toFixed(1) || 'N/A'}</TableCell>
                                <TableCell>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/assets/${aircraft.id}`}><Eye className="mr-2 h-4 w-4" /> View</Link>
                                    </Button>
                                </TableCell>
                                <TableCell className="text-right">
                                    <AircraftActions aircraft={aircraft} tenantId={tenantId} />
                                </TableCell>
                                </TableRow>
                            ))
                        ) : (
                           <TableRow>
                                <TableCell colSpan={7} className="text-center h-24">No aircraft found.</TableCell>
                           </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
                <DialogContent className="max-w-4xl">
                   <EditAircraftForm aircraft={{} as Aircraft} onCancel={() => setIsAddFormOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
    );
}
