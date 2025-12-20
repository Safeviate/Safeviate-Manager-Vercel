'use client';

import { Button } from '@/components/ui/button';
import { PlusCircle, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { SafetyReport } from '@/types/safety-report';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function SafetyReportsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now

  const reportsQuery = useMemoFirebase(
    () => 
      firestore 
        ? query(collection(firestore, 'tenants', tenantId, 'safety-reports'), orderBy('submittedAt', 'desc'))
        : null,
    [firestore]
  );
  
  const { data: reports, isLoading, error } = useCollection<SafetyReport>(reportsQuery);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Safety Reports</h1>
          <p className="text-muted-foreground">
            View and manage all filed safety reports.
          </p>
        </div>
        <Button asChild>
            <Link href="/safety/new-report">
                <PlusCircle className="mr-2 h-4 w-4" />
                File Safety Report
            </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Filed Reports</CardTitle>
            <CardDescription>A list of all submitted safety reports.</CardDescription>
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
                <p>Error loading reports: {error.message}</p>
              </div>
            )}
            {!isLoading && !error && reports && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Event Date</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length > 0 ? (
                    reports.map(report => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.reportNumber}</TableCell>
                        <TableCell>{report.reportType}</TableCell>
                        <TableCell><Badge variant="secondary">{report.status}</Badge></TableCell>
                        <TableCell>{format(new Date(report.eventDate), 'PPP')}</TableCell>
                        <TableCell>{report.submittedByName}</TableCell>
                        <TableCell className="text-right">
                           <Button asChild variant="outline" size="sm">
                                <Link href={`/safety/safety-reports/${report.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View
                                </Link>
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                        No safety reports have been filed.
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
