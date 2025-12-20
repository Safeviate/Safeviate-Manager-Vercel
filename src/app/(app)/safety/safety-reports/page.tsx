
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export type SafetyProtocol = {
  id: string;
  name: string;
  description: string;
};

export default function SafetyReportsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now

  const protocolsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'safetyProtocols'))
        : null,
    [firestore, tenantId]
  );

  const {
    data: protocols,
    isLoading,
    error,
  } = useCollection<SafetyProtocol>(protocolsQuery);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Safety Reports</h1>
            <p className="text-muted-foreground">Review and manage safety protocols and compliance.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Protocol
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Safety Protocols</CardTitle>
          <CardDescription>
            A list of all safety protocols for your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Protocol Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                 Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={index}>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                 ))
              )}
              {!isLoading && error && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-destructive">
                    Error: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && protocols && protocols.length > 0 && (
                protocols.map((protocol) => (
                  <TableRow key={protocol.id}>
                    <TableCell className="font-medium">{protocol.name}</TableCell>
                    <TableCell>{protocol.description}</TableCell>
                    <TableCell className="text-right">
                       {/* Actions will be added here */}
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!isLoading && !error && (!protocols || protocols.length === 0) && (
                 <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">
                        No safety protocols found.
                    </TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
