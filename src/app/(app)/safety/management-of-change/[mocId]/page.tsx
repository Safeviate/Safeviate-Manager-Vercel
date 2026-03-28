'use client';

import { use, useMemo, useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Printer, Pencil, ShieldAlert } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { format } from 'date-fns';
import type { ManagementOfChange } from '@/types/moc';
import { ImplementationForm } from './implementation-form';
import { ApprovalForm } from './approval-form';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import type { Department } from '@/app/(app)/admin/department/page';
import type { RiskMatrixSettings } from '@/types/risk';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MainPageHeader } from '@/components/page-header';

interface MocDetailPageProps {
  params: Promise<{ mocId: string }>;
}

const DetailItem = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="space-y-0.5">
        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none">{label}</p>
        <p className="text-sm font-bold text-foreground leading-tight">{value || 'N/A'}</p>
    </div>
);

export default function MocDetailPage({ params }: MocDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const { tenantId } = useUserProfile();
  const isMobile = useIsMobile();
  const mocId = resolvedParams.mocId;

  const mocRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, 'tenants', tenantId, 'management-of-change', mocId) : null),
    [firestore, tenantId, mocId]
  );
  
  const personnelQuery = useMemoFirebase(
    () => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/personnel`) : null),
    [firestore, tenantId]
  );

  const departmentsQuery = useMemoFirebase(
    () => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/departments`) : null),
    [firestore, tenantId]
  );
  
  const riskMatrixSettingsRef = useMemoFirebase(() => (
    firestore && tenantId ? doc(firestore, 'tenants', tenantId, 'settings', 'risk-matrix-config') : null
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
      <div className="max-w-[1400px] mx-auto w-full space-y-6 pt-4 px-1">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !moc) {
    return (
      <div className="max-w-[1400px] mx-auto w-full text-center py-20 px-1">
        <p className="text-muted-foreground">{error ? `Error: ${error.message}` : "MOC not found."}</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/safety/management-of-change">Return to list</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col h-full overflow-hidden pt-0 px-1">
      <Tabs defaultValue="implementation" className="flex-1 flex flex-col overflow-hidden">
        
        {/* --- STICKY HEADER SECTION --- */}
        <div className="sticky top-0 z-30 bg-card rounded-xl border overflow-hidden flex flex-col shadow-none mb-6 no-print shrink-0">
            <CardHeader className="bg-muted/5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
                <div className="flex-1 min-w-0">
                    <CardTitle className="text-2xl flex items-center gap-2 font-black uppercase truncate">
                        {moc.mocNumber}: {moc.title}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3">
                        <DetailItem label="Status" value={moc.status} />
                        <Separator orientation="vertical" className="h-8 hidden md:block" />
                        <DetailItem label="Department" value={departmentMap.get(moc.proposingDepartmentId)} />
                        <Separator orientation="vertical" className="h-8 hidden md:block" />
                        <DetailItem label="Responsible" value={personnelMap.get(moc.responsiblePersonId)} />
                        <Separator orientation="vertical" className="h-8 hidden md:block" />
                        <DetailItem label="Proposed" value={format(new Date(moc.proposalDate), 'dd MMM yyyy')} />
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <Button onClick={handlePrint} variant="outline" size="sm" className="h-9 px-4 gap-2 rounded-md border-slate-300 text-xs font-black uppercase shadow-sm">
                        <Printer className="h-4 w-4" />
                        Print
                    </Button>
                </div>
            </CardHeader>

            <div className="border-b bg-muted/5 px-6 py-2">
                <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start overflow-x-auto no-scrollbar flex items-center w-full">
                    <TabsTrigger value="implementation" className="rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0">
                        Implementation & Strategy
                    </TabsTrigger>
                    <TabsTrigger value="approval" className="rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0">
                        Approval & Sign-off
                    </TabsTrigger>
                </TabsList>
            </div>
        </div>

        {/* --- SCROLLABLE CONTENT --- */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-20 no-print">
            <TabsContent value="implementation" className="m-0 outline-none">
                <ImplementationForm
                    key={moc.id}
                    moc={moc}
                    tenantId={tenantId || ''}
                    personnel={personnel || []}
                />
            </TabsContent>
            
            <TabsContent value="approval" className="m-0 outline-none">
                <ApprovalForm moc={moc} tenantId={tenantId || ''} personnel={personnel || []} />
            </TabsContent>
        </div>
      </Tabs>

      {/* --- Dedicated Print Layout (Hidden in UI) --- */}
      <div className="hidden print:block space-y-8 max-w-[1200px] mx-auto w-full">
        <div className="border-b pb-4 mb-6">
          <h1 className="text-3xl font-bold font-headline uppercase">Management of Change Proposal</h1>
          <p className="text-muted-foreground text-xs font-black uppercase tracking-widest">Document ID: {moc.mocNumber}</p>
        </div>
        <div className="grid grid-cols-1 gap-8">
            <DetailItem label="Title" value={moc.title} />
            <DetailItem label="Description" value={moc.description} />
            <DetailItem label="Reason" value={moc.reason} />
            <DetailItem label="Scope" value={moc.scope} />
            <div className="flex gap-12">
              <DetailItem label="Department" value={departmentMap.get(moc.proposingDepartmentId)} />
              <DetailItem label="Responsible" value={personnelMap.get(moc.responsiblePersonId)} />
            </div>
        </div>
        <Separator className="my-10" />
        <ImplementationForm moc={moc} tenantId={tenantId!} personnel={personnel || []} />
        <ApprovalForm moc={moc} tenantId={tenantId!} personnel={personnel || []} />
      </div>
    </div>
  );
}
