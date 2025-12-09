'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { PilotProfile } from '../personnel/page';
import { PilotsTable } from '../pilots/pilots-table';

export default function PrivatePilotsPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate'; // Hardcoded for now

  const pilotsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'tenants', tenantId, 'pilots'), where('userType', '==', 'Private Pilot'))
        : null,
    [firestore]
  );
  
  const { data: pilots, isLoading: isLoadingPilots, error: pilotsError } = useCollection<PilotProfile>(pilotsQuery);

  const isLoading = isLoadingPilots;
  const error = pilotsError;

  return (
    <div className="flex flex-col gap-6 h-full">
      <Card>
        <CardHeader>
          <CardTitle>Private Pilots</CardTitle>
          <CardDescription>
            A list of all private pilots within your organization. This is now managed on the main Users page.
          </CardDescription>
        </CardHeader>
        <CardContent>
           {isLoading && (
              <div className="text-center p-4">Loading private pilots...</div>
            )}
            {!isLoading && error && (
              <div className="text-center p-4 text-destructive">Error: {error.message}</div>
            )}
            {!isLoading && !error && pilots && (
              <PilotsTable data={pilots} tenantId={tenantId} />
            )}
        </CardContent>
      </Card>
    </div>
  );
}
