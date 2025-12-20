'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Eye } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { ManagementOfChange } from '@/types/moc';


export default function ManagementOfChangePage() {
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    const mocsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'management-of-change'), orderBy('proposalDate', 'desc')) : null),
        [firestore, tenantId]
    );

    const { data: mocs, isLoading, error } = useCollection<ManagementOfChange>(mocsQuery);

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Management of Change</h1>
                    <p className="text-muted-foreground">
                        A formal process to proactively identify and manage risks associated with significant changes.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/safety/management-of-change/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Propose Change
                    </Link>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Proposed Changes</CardTitle>
                    <CardDescription>A list of all proposed and active changes within the organization.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading && (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    )}
                    {error && (
                        <div className="text-center py-10 text-destructive">
                            <p>Error loading records: {error.message}</p>
                        </div>
                    )}
                    {!isLoading && !error && mocs && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>MOC #</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Proposed</TableHead>
                                    <TableHead className='text-right'>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mocs.length > 0 ? (
                                    mocs.map(moc => (
                                        <TableRow key={moc.id}>
                                            <TableCell className="font-medium">{moc.mocNumber}</TableCell>
                                            <TableCell>{moc.title}</TableCell>
                                            <TableCell><Badge variant="secondary">{moc.status}</Badge></TableCell>
                                            <TableCell>{format(new Date(moc.proposalDate), 'PPP')}</TableCell>
                                            <TableCell className="text-right">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/safety/management-of-change/${moc.id}`}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            No MOC records found.
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
