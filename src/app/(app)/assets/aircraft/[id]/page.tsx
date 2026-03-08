
'use client';

import { use, useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';
import type { Aircraft } from '@/types/aircraft';
import { EditHoursDialog } from './edit-hours-dialog';
import { AircraftDocuments } from './aircraft-documents';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

const StatCard = ({ label, value, subValue, variant = 'default' }: { label: string; value: string; subValue?: string; variant?: 'default' | 'warning' | 'destructive' }) => (
  <Card className="shadow-none">
    <CardHeader className="pb-2">
      <CardDescription className="text-xs font-semibold uppercase tracking-wider">{label}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className={cn("text-2xl font-bold font-mono", variant === 'destructive' && 'text-destructive', variant === 'warning' && 'text-orange-500')}>
        {value}
      </div>
      {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
    </CardContent>
  </Card>
);

import { cn } from '@/lib/utils';

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftRef);

  const inspectionStats = useMemo(() => {
    if (!aircraft) return null;
    
    const next50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
    const next100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);
    
    return {
      next50Remaining: next50.toFixed(1),
      next100Remaining: next100.toFixed(1),
      is50Urgent: next50 < 5,
      is100Urgent: next100 < 10,
    };
  }, [aircraft]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !aircraft) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error ? `Error: ${error.message}` : 'Aircraft not found.'}</p>
        <Button asChild variant="outline">
          <Link href="/assets/aircraft"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/assets/aircraft"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
            <p className="text-muted-foreground">{aircraft.make} {aircraft.model}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <EditHoursDialog aircraft={aircraft} tenantId={tenantId} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Current Hobbs" value={aircraft.currentHobbs?.toFixed(1) || '0.0'} />
        <StatCard label="Current Tacho" value={aircraft.currentTacho?.toFixed(1) || '0.0'} />
        <StatCard 
          label="Next 50hr Due" 
          value={inspectionStats?.next50Remaining || '0.0'} 
          variant={inspectionStats?.is50Urgent ? 'destructive' : 'default'}
          subValue={aircraft.tachoAtNext50Inspection ? `Due at ${aircraft.tachoAtNext50Inspection.toFixed(1)}` : 'No inspection set'}
        />
        <StatCard 
          label="Next 100hr Due" 
          value={inspectionStats?.next100Remaining || '0.0'} 
          variant={inspectionStats?.is100Urgent ? 'destructive' : 'default'}
          subValue={aircraft.tachoAtNext100Inspection ? `Due at ${aircraft.tachoAtNext100Inspection.toFixed(1)}` : 'No inspection set'}
        />
      </div>

      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto p-0 bg-transparent border rounded-lg overflow-hidden">
          <TabsTrigger value="documents" className="py-3 data-[state=active]:bg-[#1a4721] data-[state=active]:text-white rounded-none border-r last:border-r-0">Documents</TabsTrigger>
          <TabsTrigger value="components" className="py-3 data-[state=active]:bg-[#1a4721] data-[state=active]:text-white rounded-none border-r last:border-r-0">Tracked Components</TabsTrigger>
          <TabsTrigger value="maintenance" className="py-3 data-[state=active]:bg-[#1a4721] data-[state=active]:text-white rounded-none border-r last:border-r-0">Maintenance Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="documents" className="mt-6">
          <AircraftDocuments aircraft={aircraft} tenantId={tenantId} />
        </TabsContent>
        <TabsContent value="components" className="mt-6">
          <Card className="flex items-center justify-center h-48 border-dashed shadow-none">
            <p className="text-muted-foreground">Tracked components functionality is coming soon.</p>
          </Card>
        </TabsContent>
        <TabsContent value="maintenance" className="mt-6">
          <Card className="flex items-center justify-center h-48 border-dashed shadow-none">
            <p className="text-muted-foreground">Maintenance logging functionality is coming soon.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
