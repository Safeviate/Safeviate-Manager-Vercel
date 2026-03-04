
'use client';

import { use, useMemo, useState } from 'react';
import { doc, collection, query } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Edit, PlusCircle, FileUp, ShieldCheck, History } from 'lucide-react';
import Link from 'next/link';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { AircraftForm } from '../aircraft-form';
import { ComponentList } from './component-list';
import { ComponentForm } from './component-form';
import { AircraftDocuments } from './aircraft-documents';
import { MaintenanceLogList } from './maintenance-log-list';

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const aircraftId = resolvedParams.id;

  const aircraftRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId) : null),
    [firestore, tenantId, aircraftId]
  );

  const componentsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts/${aircraftId}/components`) : null),
    [firestore, tenantId, aircraftId]
  );

  const { data: aircraft, isLoading: isLoadingAircraft } = useDoc<Aircraft>(aircraftRef);
  const { data: components, isLoading: isLoadingComponents } = useCollection<AircraftComponent>(componentsQuery);

  if (isLoadingAircraft) {
    return <Skeleton className="h-screen w-full" />;
  }

  if (!aircraft) {
    return <div className="text-center py-10">Aircraft not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button asChild variant="outline">
          <Link href="/assets/aircraft">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Fleet
          </Link>
        </Button>
        <div className="flex gap-2">
          <AircraftForm 
            tenantId={tenantId} 
            existingAircraft={aircraft} 
            trigger={
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit Aircraft
              </Button>
            } 
          />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-3xl">{aircraft.tailNumber}</CardTitle>
            <CardDescription>{aircraft.make} {aircraft.model} • {aircraft.type}</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Total Frame Hours</p>
            <p className="text-3xl font-mono font-bold text-primary">{aircraft.currentHobbs?.toFixed(1) || '0.0'}</p>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Meter Readings</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Hobbs</p>
                  <p className="text-2xl font-mono font-bold">{aircraft.currentHobbs?.toFixed(1) || '0.0'}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Tacho</p>
                  <p className="text-2xl font-mono font-bold">{aircraft.currentTacho?.toFixed(1) || '0.0'}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Inspections</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 border rounded-md">
                  <div>
                    <p className="font-semibold">Next 50hr Inspection</p>
                    <p className="text-sm text-muted-foreground">Due at {aircraft.tachoAtNext50Inspection?.toFixed(1) || 'N/A'} Tacho</p>
                  </div>
                  <Badge variant="outline">{(aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0)} hrs rem.</Badge>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-md">
                  <div>
                    <p className="font-semibold">Next 100hr Inspection</p>
                    <p className="text-sm text-muted-foreground">Due at {aircraft.tachoAtNext100Inspection?.toFixed(1) || 'N/A'} Tacho</p>
                  </div>
                  <Badge variant="outline">{(aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0)} hrs rem.</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="components" className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Tracked Components</h3>
            <ComponentForm aircraftId={aircraftId} tenantId={tenantId} trigger={
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Component
              </Button>
            } />
          </div>
          <ComponentList components={components || []} isLoading={isLoadingComponents} aircraftId={aircraftId} tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4 pt-4">
          <AircraftDocuments aircraft={aircraft} tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4 pt-4">
          <MaintenanceLogList aircraftId={aircraftId} tenantId={tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
