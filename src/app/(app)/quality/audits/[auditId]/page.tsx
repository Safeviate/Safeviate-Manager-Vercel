'use client';

import { use, useMemo } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import type { QualityAudit, QualityAuditChecklistTemplate } from '@/types/quality';
import { AuditChecklist } from './audit-checklist';
import type { FindingLevelsSettings } from '@/app/(app)/admin/features/page';

interface AuditDetailPageProps {
  params: { auditId: string };
}

export default function AuditDetailPage({ params }: AuditDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const auditId = resolvedParams.auditId;

  const auditRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'quality-audits', auditId) : null),
    [firestore, tenantId, auditId]
  );
  const { data: audit, isLoading: isLoadingAudit, error: auditError } = useDoc<QualityAudit>(auditRef);

  const templateRef = useMemoFirebase(
      () => (firestore && audit?.templateId ? doc(firestore, 'tenants', tenantId, 'quality-audit-templates', audit.templateId) : null),
      [firestore, tenantId, audit?.templateId]
  );
  const { data: template, isLoading: isLoadingTemplate } = useDoc<QualityAuditChecklistTemplate>(templateRef);
  
  const findingLevelsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'tenants', tenantId, 'settings', 'finding-levels') : null),
    [firestore, tenantId]
  );
  const { data: findingLevelsSettings, isLoading: isLoadingFindingLevels } = useDoc<FindingLevelsSettings>(findingLevelsRef);

  const isLoading = isLoadingAudit || isLoadingTemplate || isLoadingFindingLevels;

  const enrichedAudit = useMemo(() => {
    if (!audit || !template) return null;
    return { ...audit, template };
  }, [audit, template]);


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

  if (auditError) {
    return (
      <div className="text-center py-10">
        <p className="text-destructive">Error loading audit: {auditError.message}</p>
        <Button asChild variant="link">
          <Link href="/quality/audits">Return to list</Link>
        </Button>
      </div>
    );
  }

  if (!audit || !enrichedAudit) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Audit not found or template is missing.</p>
        <Button asChild variant="link">
          <Link href="/quality/audits">Return to list</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <Button asChild variant="outline" className="w-fit">
          <Link href="/quality/audits">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Audits
          </Link>
        </Button>
      <Card>
        <CardHeader>
          <CardTitle>Audit {audit.auditNumber}: {audit.title}</CardTitle>
          <CardDescription>
            Performed on {format(new Date(audit.auditDate), 'PPP')}
          </CardDescription>
        </CardHeader>
        <CardContent>
            <AuditChecklist 
                audit={enrichedAudit} 
                tenantId={tenantId}
                findingLevels={findingLevelsSettings?.levels || []}
            />
        </CardContent>
      </Card>
    </div>
  );
}
