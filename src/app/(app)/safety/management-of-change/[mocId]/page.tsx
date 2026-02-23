
'use client';

import { use, useMemo } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import type { ManagementOfChange } from '@/types/moc';
import { ImplementationForm } from './implementation-form';
import { ApprovalForm } from './approval-form';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import type { Department } from '@/app/(app)/admin/department/page';
import type { RiskMatrixSettings } from '@/types/risk';

interface MocDetailPageProps {
  params: { mocId: string };
}

const DetailItem = ({ label, value, children }: { label: string; value?: string | null; children?: React.ReactNode }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {children ? children : <p className="text-base">{value || 'N/A'}</p>}
    </div>
);


export default function MocDetailPage({ params }: MocDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const mocId = resolvedParams.mocId;

  const mocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'management-of-change', mocId) : null),
    [firestore, tenantId, mocId]
  );
  
  const personnelQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/personnel`) : null),
    [firestore, tenantId]
  );

  const departmentsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `tenants/${tenantId}/departments`) : null),
    [firestore, tenantId]
  );
  
  const riskMatrixSettingsRef = useMemoFirebase(() => (
    firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'risk-matrix-config') : null
  ), [firestore, tenantId]);

  const { data: moc, isLoading: isLoadingMoc, error } = useDoc<ManagementOfChange>(mocRef);
  const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);
  const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsQuery);
  const { data: riskMatrixSettings, isLoading: isLoadingRiskMatrix } = useDoc<RiskMatrixSettings>(riskMatrixSettingsRef);


  const isLoading = isLoadingMoc || isLoadingPersonnel || isLoadingDepts || isLoadingRiskMatrix;

  const personnelMap = useMemo(() => {
    if (!personnel) return new Map();
    return new Map(personnel.map(p => [p.id, `${p.firstName} ${p.lastName}`]));
  }, [personnel]);
  
  const departmentMap = useMemo(() => {
    if (!departments) return new Map();
    return new Map(departments.map(d => [d.id, d.name]));
  }, [departments]);

  const handlePrint = () => {
    window.print();
  };

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
       <div className="flex justify-between items-center no-print">
          <Button asChild variant="outline" className="w-fit">
            <Link href="/safety/management-of-change">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to All MOCs
            </Link>
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print MOC
          </Button>
       </div>
      <Card>
        <CardHeader>
          <CardTitle>MOC {moc.mocNumber}: {moc.title}</CardTitle>
          <CardDescription>
            Proposed on {format(new Date(moc.proposalDate), 'PPP')}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Detailed Description</p>
                <p className="text-base whitespace-pre-wrap">{moc.description}</p>
            </div>
             <div className="md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Reason for Change</p>
                <p className="text-base whitespace-pre-wrap">{moc.reason}</p>
            </div>
             <div className="md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Scope of Change</p>
                <p className="text-base whitespace-pre-wrap">{moc.scope}</p>
            </div>
            <DetailItem label="Proposing Department" value={departmentMap.get(moc.proposingDepartmentId)} />
            <DetailItem label="Responsible Person" value={personnelMap.get(moc.responsiblePersonId)} />
        </CardContent>
      </Card>
      
      <Tabs defaultValue="implementation">
        <TabsList className="grid w-full grid-cols-2 no-print">
          <TabsTrigger value="implementation">Implementation &amp; Analysis</TabsTrigger>
          <TabsTrigger value="approval">Approval &amp; Sign-off</TabsTrigger>
        </TabsList>
        <TabsContent value="implementation">
          <ImplementationForm
            key={moc.id}
            moc={moc}
            tenantId={tenantId}
            personnel={personnel || []}
            riskMatrixColors={riskMatrixSettings?.colors}
          />
        </TabsContent>
        <TabsContent value="approval">
          <ApprovalForm moc={moc} tenantId={tenantId} personnel={personnel || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
