
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft } from '@/types/aircraft';

export default function AssetsPage() {
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    const aircraftsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`)) : null),
        [firestore, tenantId]
    );

    const { data: aircrafts, isLoading } = useCollection<Aircraft>(aircraftsQuery);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
                    <p className="text-muted-foreground">
                        Manage all aircraft in your organization's fleet.
                    </p>
                </div>
                {/* <Button asChild>
                    <Link href="/assets/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Aircraft
                    </Link>
                </Button> */}
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>All Aircraft</CardTitle>
                    <CardDescription>A list of all registered aircraft.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tail Number</TableHead>
                                    <TableHead>Model</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {aircrafts && aircrafts.length > 0 ? (
                                    aircrafts.map((aircraft) => (
                                        <TableRow key={aircraft.id}>
                                            <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
                                            <TableCell>{aircraft.model}</TableCell>
                                            <TableCell>{aircraft.type || 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/assets/${aircraft.id}`}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">
                                            No aircraft found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
