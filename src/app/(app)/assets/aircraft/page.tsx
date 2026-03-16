'use client';

import { useMemo, useState } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PlusCircle, Plane, Gauge, History, FileText } from 'lucide-react';
import Link from 'next/link';
import type { Aircraft } from '@/types/aircraft';
import { AircraftTable } from './aircraft-table';
import { AircraftForm } from './aircraft-form';
import { usePermissions } from '@/hooks/use-permissions';

export default function AircraftFleetPage() {
  const firestore = useFirestore();
  const { hasPermission } = usePermissions();
  const tenantId = 'safeviate';
  const canManage = hasPermission('assets-view'); // Using assets-view as general manage for MVP

  const aircraftQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/aircrafts`), orderBy('tailNumber', 'asc')) : null),
    [firestore, tenantId]
  );

  const { data: aircraft, isLoading, error } = useCollection<Aircraft>(aircraftQuery);

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card><CardContent className="p-8 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">Manage organizational aircraft, technical records, and maintenance status.</p>
        </div>
        {canManage && <AircraftForm tenantId={tenantId} />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-1">
          <Card className="shadow-none border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Fleet</CardTitle>
                  <Plane className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{aircraft?.length || 0}</div>
                  <p className="text-[10px] text-muted-foreground mt-1 font-medium uppercase">Active airframes</p>
              </CardContent>
          </Card>
          <Card className="shadow-none border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Operational Hours</CardTitle>
                  <Gauge className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">
                      {aircraft?.reduce((acc, ac) => acc + (ac.currentHobbs || 0), 0).toFixed(1) || '0.0'}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 font-medium uppercase">Cumulative fleet Hobbs</p>
              </CardContent>
          </Card>
          <Card className="shadow-none border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status Overview</CardTitle>
                  <History className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">100%</div>
                  <p className="text-[10px] text-muted-foreground mt-1 font-medium uppercase">Airworthy & Ready</p>
              </CardContent>
          </Card>
      </div>

      <Card className="shadow-none border">
        <CardContent className="p-0">
          <AircraftTable aircraft={aircraft || []} tenantId={tenantId} />
        </CardContent>
      </Card>
    </div>
  );
}