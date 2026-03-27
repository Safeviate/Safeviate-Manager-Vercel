'use client';

import { use, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import type { QualityAudit, QualityAuditChecklistTemplate, CorrectiveActionPlan } from '@/types/quality';
import { AuditChecklist } from './audit-checklist';
import type { FindingLevelsSettings } from '@/app/(app)/admin/features/page';
import { Progress } from '@/components/ui/progress';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';
import { Badge } from '@/components/ui/badge';
import { BackNavButton } from '@/components/back-nav-button';

interface AuditDetailPageProps {
  params: Promise<{ auditId: string }>;
}

export default function AuditDetailPage({ params }: AuditDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const router = useRouter();
  const { tenantId, userProfile } = useUserProfile();
  const { hasPermission } = usePermissions();
  const auditId = resolvedParams.auditId;

  const auditRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, 'tenants', tenantId, 'quality-audits', auditId) : null),
    [firestore, tenantId, auditId]
  );
  const { data: audit, isLoading: isLoadingAudit, error: auditError } = useDoc<QualityAudit>(auditRef);

  const templateRef = useMemoFirebase(
      () => (firestore && tenantId && audit?.templateId ? doc(firestore, 'tenants', tenantId, 'quality-audit-templates', audit.templateId) : null),
      [firestore, tenantId, audit?.templateId]
  );
  const { data: template, isLoading: isLoadingTemplate } = useDoc<QualityAuditChecklistTemplate>(templateRef);
  
  const findingLevelsRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, 'tenants', tenantId, 'settings', 'finding-levels') : null),
    [firestore, tenantId]
  );
  const { data: findingLevelsSettings, isLoading: isLoadingFindingLevels } = useDoc<FindingLevelsSettings>(findingLevelsRef);

  const capsQuery = useMemoFirebase(
      () => (firestore && tenantId && auditId ? query(collection(firestore, `tenants/${tenantId}/corrective-action-plans`), where('auditId', '==', auditId)) : null),
      [firestore, tenantId, auditId]
  );
  const { data: caps, isLoading: isLoadingCaps } = useCollection<CorrectiveActionPlan>(capsQuery);

  const personnelQuery = useMemoFirebase(
      () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null),
      [firestore, tenantId]
  );
  const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);

  // SECURITY: Scoped visibility guard
  useEffect(() => {
    if (!isLoadingAudit && audit && userProfile) {
        const canViewAll = hasPermission('quality-audits-view-all');
        const userOrgId = userProfile.organizationId;
        
        if (!canViewAll && userOrgId && audit.organizationId !== userOrgId) {
            router.push('/quality/audits');
        }
    }
  }, [isLoadingAudit, audit, userProfile, hasPermission, router]);

  const isLoading = isLoadingAudit || isLoadingTemplate || isLoadingFindingLevels || isLoadingCaps || isLoadingPersonnel;

  const enrichedAudit = useMemo(() => {
    if (!audit || !template) return null;
    return { ...audit, template };
  }, [audit, template]);


  if (isLoading) {
    return (
      <div className="space-y-6 max-w-[1400px] mx-auto w-full pt-4 px-1">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (auditError || !audit || !enrichedAudit) {
    return (
      <div className="max-w-[1400px] mx-auto w-full text-center py-20 px-1">
        <p className="text-muted-foreground mb-4">{auditError ? `Error: ${auditError.message}` : "Audit record not found."}</p>
        <BackNavButton href="/quality/audits" text="Back to Audits" className="border-slate-300 bg-background text-foreground hover:bg-muted" />
      </div>
    );
  }
  
  const scoreColor = audit.complianceScore && audit.complianceScore >= 80 
    ? "bg-green-500" 
    : audit.complianceScore && audit.complianceScore >= 60
    ? "bg-yellow-500"
    : "bg-red-500";

  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col h-full overflow-hidden pt-0 px-1">
      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border rounded-xl">
        <CardHeader className="shrink-0 border-b bg-muted/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-2xl font-black uppercase truncate">Audit {audit.auditNumber}: {audit.title}</CardTitle>
            </div>
            <CardDescription className="text-sm font-medium">
              Performed on {format(new Date(audit.auditDate), 'PPP')} • Status: <Badge variant="outline" className="text-[10px] h-5 py-0 uppercase font-black border-primary/20 bg-primary/5 text-primary">{audit.status}</Badge>
            </CardDescription>
          </div>

          {typeof audit.complianceScore === 'number' && (
            <div className="text-left md:text-right min-w-[200px]">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Compliance Score</p>
              <div className="flex items-center gap-3 justify-start md:justify-end">
                <span className="text-3xl font-black text-primary">{audit.complianceScore}%</span>
                <Progress value={audit.complianceScore} className="w-24 h-2" indicatorClassName={scoreColor} />
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
          <AuditChecklist 
              audit={enrichedAudit} 
              tenantId={tenantId!}
              findingLevels={findingLevelsSettings?.levels || []}
              caps={caps || []}
              personnel={personnel || []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
