
'use client';

import { use } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import type { ManagementOfChange } from '@/types/moc';
import { ImplementationPlanForm } from './implementation-plan-form';

interface MocDetailPageProps {
  params: { mocId: string };
}

export default function MocDetailPage({ params }: MocDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const mocId = resolvedParams.mocId;

  const mocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'management-of-change', mocId) : null),
    [firestore, tenantId, mocId]
  );

  const { data: moc, isLoading, error } = useDoc<ManagementOfChange>(mocRef);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-destructive">Error loading MOC: {error.message}</p>
        <Button asChild variant="link">
          <Link href="/safety/management-of-change">Return to list</Link>
        </Button>
      </div>
    );
  }

  if (!moc) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">MOC not found.</p>
        <Button asChild variant="link">
          <Link href="/safety/management-of-change">Return to list</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <Button asChild variant="outline" className="w-fit">
          <Link href="/safety/management-of-change">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All MOCs
          </Link>
        </Button>
      <Card>
        <CardHeader>
          <CardTitle>MOC {moc.mocNumber}: {moc.title}</CardTitle>
          <CardDescription>
            Proposed on {format(new Date(moc.proposalDate), 'PPP')}
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="whitespace-pre-wrap">{moc.description}</p>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="implementation">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="implementation">Implementation Plan</TabsTrigger>
          <TabsTrigger value="analysis">Hazard Analysis</TabsTrigger>
          <TabsTrigger value="approval">Approval & Sign-off</TabsTrigger>
        </TabsList>
        <TabsContent value="implementation">
          <ImplementationPlanForm moc={moc} tenantId={tenantId} />
        </TabsContent>
        <TabsContent value="analysis">
          <Card>
             <CardHeader><CardTitle>Hazard Analysis</CardTitle></CardHeader>
            <CardContent>
              <p>Risk and mitigation management will be here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="approval">
          <Card>
             <CardHeader><CardTitle>Approval & Sign-off</CardTitle></CardHeader>
            <CardContent>
                <p>Signature management will be here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
