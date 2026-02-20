
'use client';

import { use, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AircraftComponents } from './aircraft-components';
import { AircraftMaintenance } from './aircraft-maintenance';
import { AircraftDocuments } from './aircraft-documents';
import { AircraftChecklistHistory } from './aircraft-checklist-history';
import { PerformChecklist } from './perform-checklist';


interface AircraftDetailPageProps {
    params: { id: string };
}

const DetailItem = ({ label, value, children }: { label: string; value?: string | null, children?: React.ReactNode }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {children ? <div className="text-base">{children}</div> : <p className="text-lg font-semibold">{value || 'N/A'}</p>}
    </div>
);


function AircraftDetailContent({ params }: AircraftDetailPageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const aircraftId = resolvedParams.id;

    const aircraftDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
        [firestore, tenantId, aircraftId]
    );

    const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftDocRef);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-1/4 mt-2" />
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </CardContent>
                </Card>
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }
    
    if (error) {
        return <div className="text-destructive">Error: {error.message}</div>
    }

    if (!aircraft) {
        return <div>Aircraft not found.</div>
    }

    return (
        <div className='space-y-6'>
            <div className="flex justify-between items-start">
                 <Button asChild variant="outline">
                    <Link href="/assets">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Fleet
                    </Link>
                </Button>
                {/* Placeholder for Edit button */}
                <Button>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Aircraft
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl">{aircraft.tailNumber}</CardTitle>
                            <CardDescription>{aircraft.model}</CardDescription>
                        </div>
                        <Badge variant={aircraft.type === 'Single-Engine' ? 'default' : 'secondary'}>
                            {aircraft.type}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <DetailItem label="Current Hobbs" value={`${aircraft.currentHobbs || 0} hrs`} />
                    <DetailItem label="Current Tacho" value={`${aircraft.currentTacho || 0} hrs`} />
                    <DetailItem label="Next 50hr Insp." value={`${aircraft.tachoAtNext50Inspection || 0} hrs`} />
                    <DetailItem label="Next 100hr Insp." value={`${aircraft.tachoAtNext100Inspection || 0} hrs`} />
                </CardContent>
            </Card>

            <Tabs defaultValue="components">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="components">Components</TabsTrigger>
                    <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="checklists">Checklists</TabsTrigger>
                    <TabsTrigger value="perform">Perform Checklist</TabsTrigger>
                </TabsList>
                <TabsContent value="components">
                    <AircraftComponents aircraft={aircraft} aircraftId={aircraft.id} />
                </TabsContent>
                <TabsContent value="maintenance">
                    <AircraftMaintenance />
                </TabsContent>
                <TabsContent value="documents">
                    <AircraftDocuments aircraft={aircraft} />
                </TabsContent>
                <TabsContent value="checklists">
                    <AircraftChecklistHistory />
                </TabsContent>
                 <TabsContent value="perform">
                    <PerformChecklist />
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default function AircraftDetailPage(props: AircraftDetailPageProps) {
  return (
    <Suspense fallback={<Skeleton className="h-[80vh] w-full" />}>
      <AircraftDetailContent {...props} />
    </Suspense>
  )
}
