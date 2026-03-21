'use client';

import { use, useMemo, useState } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';

interface MocDetailPageProps {
  params: Promise<{ mocId: string }>;
}

const DetailItem = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="space-y-0.5">
        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{label}</p>
        <p className="text-sm font-medium">{value || 'N/A'}</p>
    </div>
);

export default function MocDetailPage({ params }: MocDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const mocId = resolvedParams.mocId;

  const [activeTab, setActiveTab] = useState('implementation');

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
      <div className="max-w-[1200px] mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (error || !moc) {
    return (
      <div className="max-w-[1200px] mx-auto w-full text-center py-10">
        <p className="text-destructive mb-4">{error ? `Error: ${error.message}` : "MOC not found."}</p>
        <Button asChild variant="outline"><Link href="/safety/management-of-change"><ArrowLeft className="mr-2 h-4 w-4" /> Return to list</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col h-full overflow-hidden gap-4 pb-4">
      {/* --- STICKY HEADER SECTION --- */}
      <div className="shrink-0 space-y-4 px-1 bg-background z-20 pb-2 border-b no-print">
        <div className="flex justify-between items-center">
          <Button asChild variant="outline" size="sm" className="h-8">
            <Link href="/safety/management-of-change">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to All MOCs
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 gap-2">
            <Printer className="h-4 w-4" />
            Print MOC
          </Button>
        </div>

        <Card className="shadow-none border-primary/20 bg-muted/5">
          <CardHeader className="py-4">
            <CardTitle className="text-2xl font-headline">MOC {moc.mocNumber}: {moc.title}</CardTitle>
            <CardDescription>Proposed on {format(new Date(moc.proposalDate), 'PPP')}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-0 pb-4">
            <DetailItem label="Detailed Description" value={moc.description} />
            <DetailItem label="Reason for Change" value={moc.reason} />
            <DetailItem label="Scope of Change" value={moc.scope} />
            <div className="flex flex-wrap gap-8">
              <DetailItem label="Proposing Department" value={departmentMap.get(moc.proposingDepartmentId)} />
              <DetailItem label="Responsible Person" value={personnelMap.get(moc.responsiblePersonId)} />
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start overflow-x-auto no-scrollbar">
            <TabsTrigger value="implementation" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-xs font-bold uppercase tracking-tight">
              Implementation & Analysis
            </TabsTrigger>
            <TabsTrigger value="approval" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-xs font-bold uppercase tracking-tight">
              Approval & Sign-off
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* --- SCROLLABLE CONTENT SECTION --- */}
      <div className="flex-1 min-h-0 overflow-hidden px-1">
        <Tabs value={activeTab} className="h-full flex flex-col m-0">
          <TabsContent value="implementation" className="m-0 h-full flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              <div className="pb-24">
                <ImplementationForm
                  key={moc.id}
                  moc={moc}
                  tenantId={tenantId}
                  personnel={personnel || []}
                />
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="approval" className="m-0 h-full flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              <div className="pb-24">
                <ApprovalForm moc={moc} tenantId={tenantId} personnel={personnel || []} />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* --- PRINT ONLY LAYOUT --- */}
      <div className="hidden print:block space-y-8">
        <div className="border-b pb-4 mb-6">
          <h1 className="text-3xl font-bold">Management of Change Proposal</h1>
          <p className="text-muted-foreground">Document ID: {moc.mocNumber}</p>
        </div>
        <Card className="border-none shadow-none">
          <CardHeader className="p-0 pb-4">
            <CardTitle>{moc.title}</CardTitle>
            <CardDescription>Proposed on {format(new Date(moc.proposalDate), 'PPP')}</CardDescription>
          </CardHeader>
          <CardContent className="p-0 grid grid-cols-1 gap-6">
            <DetailItem label="Description" value={moc.description} />
            <DetailItem label="Reason" value={moc.reason} />
            <DetailItem label="Scope" value={moc.scope} />
            <div className="flex gap-12">
              <DetailItem label="Department" value={departmentMap.get(moc.proposingDepartmentId)} />
              <DetailItem label="Responsible" value={personnelMap.get(moc.responsiblePersonId)} />
            </div>
          </CardContent>
        </Card>
        <Separator />
        <ImplementationForm moc={moc} tenantId={tenantId} personnel={personnel || []} />
        <ApprovalForm moc={moc} tenantId={tenantId} personnel={personnel || []} />
      </div>
    </div>
  );
}
