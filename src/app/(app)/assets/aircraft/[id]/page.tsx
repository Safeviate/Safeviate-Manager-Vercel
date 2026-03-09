
'use client';

import { use } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft } from '@/types/aircraft';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, resolvedParams.id) : null),
    [firestore, resolvedParams.id]
  );

  const { data: aircraft, isLoading } = useDoc<Aircraft>(aircraftRef);

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <Button asChild variant="outline" size="sm">
        <Link href="/assets/aircraft">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Fleet
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{aircraft?.tailNumber}</CardTitle>
          <CardDescription>{aircraft?.make} {aircraft?.model}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
