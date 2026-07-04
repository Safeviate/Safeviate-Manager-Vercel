'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PrintButton } from '@/components/print-button';
import { AuditChecklist } from '@/app/(app)/quality/audits/[auditId]/audit-checklist';
import type { FindingLevelsSettings } from '@/app/(app)/admin/features/page';
import type { QualityAudit, QualityAuditChecklistTemplate, CorrectiveActionPlan, ExternalOrganization } from '@/types/quality';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import type { Aircraft } from '@/types/aircraft';
import { useUserProfile } from '@/hooks/use-user-profile';

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return new Date(value);
  }
  return new Date(year, month - 1, day, 12);
};

interface AuditPrintPageProps {
  params: Promise<{ auditId: string }>;
}

export default function AuditPrintPage({ params }: AuditPrintPageProps) {
  const resolvedParams = use(params);
  const { tenantId } = useUserProfile();
  const auditId = resolvedParams.auditId;
  const [audit, setAudit] = useState<QualityAudit | null>(null);
  const [template, setTemplate] = useState<QualityAuditChecklistTemplate | null>(null);
  const [findingLevelsSettings, setFindingLevelsSettings] = useState<FindingLevelsSettings | null>(null);
  const [caps, setCaps] = useState<CorrectiveActionPlan[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [organizations, setOrganizations] = useState<ExternalOrganization[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch('/api/quality-audits', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({
          audits: [],
          templates: [],
          caps: [],
          personnel: [],
          organizations: [],
          aircraft: [],
          findingLevels: [],
        }));

        const foundAudit = (payload.audits as QualityAudit[] | undefined)?.find((item) => item.id === auditId) || null;

        if (!cancelled) {
          setAudit(foundAudit);
          setTemplate((payload.templates as QualityAuditChecklistTemplate[] | undefined)?.find((item) => item.id === foundAudit?.templateId) || null);
          setCaps((payload.caps as CorrectiveActionPlan[] | undefined)?.filter((item) => item.auditId === auditId) || []);
          setPersonnel(Array.isArray(payload.personnel) ? payload.personnel : []);
          setOrganizations(Array.isArray(payload.organizations) ? payload.organizations : []);
          setAircraft(Array.isArray(payload.aircraft) ? payload.aircraft : []);
          setFindingLevelsSettings(Array.isArray(payload.findingLevels) ? payload.findingLevels : null);
        }
      } catch (error) {
        console.error('Failed to load audit print document', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [auditId]);

  const enrichedAudit = useMemo(() => {
    if (!audit || !template) return null;
    return { ...audit, template };
  }, [audit, template]);

  const assetLabel = aircraft.find((item) => item.id === audit?.assetId)?.tailNumber || '';

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-[220px] w-full" />
        <Skeleton className="h-[700px] w-full" />
      </div>
    );
  }

  if (!tenantId || !audit || !enrichedAudit) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[1100px] flex-col items-center justify-center gap-4 px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">Audit document could not be loaded.</p>
        <Button asChild variant="outline">
          <Link href="/quality/audits">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Audits
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/5 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FileText className="h-4 w-4 text-primary" />
          Audit document view
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/quality/audits/${audit.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Working Page
            </Link>
          </Button>
          <PrintButton label="Print Document" className="h-9" />
        </div>
      </div>

      <Card className="border-none shadow-none">
        <CardHeader className="space-y-5 border-b p-0 pb-5">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-muted-foreground">Safeviate Audit Record</p>
              <CardTitle className="text-3xl font-black uppercase tracking-tight">Audit {audit.auditNumber}: {audit.title}</CardTitle>
              <CardDescription className="text-base">
                Completed on {format(parseLocalDate(audit.auditDate), 'PPP')}
              </CardDescription>
            </div>
            {typeof audit.complianceScore === 'number' && (
              <div className="min-w-[190px] rounded-2xl border bg-muted/10 px-5 py-4 text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Compliance Score</p>
                <p className="mt-1 text-4xl font-black text-foreground">{audit.complianceScore}%</p>
              </div>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border bg-muted/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Status</p>
              <p className="mt-1 text-sm font-semibold">{audit.status}</p>
            </div>
            <div className="rounded-xl border bg-muted/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Asset</p>
              <p className="mt-1 text-sm font-semibold">{assetLabel || 'No linked asset'}</p>
            </div>
            <div className="rounded-xl border bg-muted/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Scope</p>
              <p className="mt-1 text-sm font-semibold whitespace-pre-wrap">{audit.scope || 'Not specified'}</p>
            </div>
            <div className="rounded-xl border bg-muted/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Checklist</p>
              <p className="mt-1 text-sm font-semibold">{template?.title || 'Audit checklist'}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <AuditChecklist
        audit={enrichedAudit}
        tenantId={tenantId}
        findingLevels={findingLevelsSettings?.levels || []}
        caps={caps}
        personnel={personnel}
        organizations={organizations}
        aircraft={aircraft}
        printMode
      />
    </div>
  );
}
