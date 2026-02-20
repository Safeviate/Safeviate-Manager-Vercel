
'use client';

import { use, useMemo } from 'react';
import { useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Aircraft } from '@/types/aircraft';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ArrowLeft, HardDrive } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AircraftComponents } from './aircraft-components';
import { useToast } from '@/hooks/use-toast';

interface AircraftDetailPageProps {
    params: { id: string };
}

const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base">{value || 'N/A'}</p>
    </div>
);

function AircraftDetailContent({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleUpdate = (updatedData: Partial<Aircraft>) => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore not available.',
      });
      return;
    }
    const aircraftRef = doc(firestore, 'tenants', tenantId, 'aircrafts', aircraft.id);
    updateDocumentNonBlocking(aircraftRef, updatedData);
    toast({
      title: 'Aircraft Updated',
      description: 'Changes are being saved.',
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
            <Card className="mt-4">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl">{aircraft.tailNumber}</CardTitle>
                            <CardDescription>{aircraft.model}</CardDescription>
                        </div>
                        <Badge variant="secondary">{aircraft.type}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <DetailItem label="Frame Hours" value={aircraft.frameHours} />
                    <DetailItem label="Engine Hours" value={aircraft.engineHours} />
                    <DetailItem label="Current Hobbs" value={aircraft.currentHobbs} />
                    <DetailItem label="Current Tacho" value={aircraft.currentTacho} />
                    <DetailItem label="Next 50hr (Tacho)" value={aircraft.tachoAtNext50Inspection} />
                    <DetailItem label="Next 100hr (Tacho)" value={aircraft.tachoAtNext100Inspection} />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="components">
            <AircraftComponents 
              aircraftId={aircraft.id} 
              components={aircraft.components || []} 
              tenantId={tenantId} 
              onUpdate={(updatedComponents) => handleUpdate({ components: updatedComponents })} 
            />
        </TabsContent>
      </Tabs>
    </div>
  );
}


export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const aircraftId = resolvedParams.id;

    const aircraftDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
        [firestore, tenantId, aircraftId]
    );

    const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftDocRef);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error) {
        return <p className="text-destructive">Error: {error.message}</p>;
    }

    if (!aircraft) {
        return <p>Aircraft not found.</p>;
    }

    return (
        <div className="space-y-6">
            <Button asChild variant="outline">
                <Link href="/assets">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to All Aircraft
                </Link>
            </Button>
            <AircraftDetailContent aircraft={aircraft} tenantId={tenantId} />
        </div>
    );
}

