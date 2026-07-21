import { authOptions } from '@/auth';
import { BackNavButton } from '@/components/back-nav-button';
import { MainPageHeader } from '@/components/page-header';
import { PrintButton } from '@/components/print-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { getTenantIdFromSession } from '@/lib/server/session-tenant';
import type { ExamTemplate } from '@/types/training';
import { QrCode, ScanLine } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import QRCode from 'qrcode';

const TEMPLATE_KEY = 'exam-templates';

type ExamQrPageProps = {
  params: Promise<{ examId: string }>;
};

async function loadExamTemplate(tenantId: string, examId: string) {
  const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
    `SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1`,
    tenantId,
  );
  const config = (rows[0]?.data as Record<string, unknown> | undefined) || {};
  const templates = Array.isArray(config[TEMPLATE_KEY]) ? config[TEMPLATE_KEY] : [];

  return templates.find((template): template is ExamTemplate => (
    Boolean(template) && typeof template === 'object' && (template as ExamTemplate).id === examId
  )) || null;
}

export default async function ExamQrPage({ params }: ExamQrPageProps) {
  const session = await getServerSession(authOptions);
  const headerList = await headers();
  const tenantId = await getTenantIdFromSession(new Request('http://localhost', { headers: headerList }));
  if (!session?.user || !tenantId) redirect('/login');

  const { examId } = await params;
  const template = await loadExamTemplate(tenantId, examId);
  if (!template) notFound();

  const host = headerList.get('x-forwarded-host') || headerList.get('host') || '';
  const proto = headerList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const launchPath = `/training/exams?launch=${encodeURIComponent(template.id)}`;
  const launchUrl = host ? `${proto}://${host}${launchPath}` : launchPath;
  const qrSvg = await QRCode.toString(launchUrl, {
    type: 'svg',
    margin: 1,
    width: 240,
    color: { dark: '#171514', light: '#ffffff' },
  });
  const publication = template.publication || { mode: 'mandatory', assigneeIds: [] };
  const isMandatory = publication.mode === 'mandatory';

  return (
    <div className="mx-auto flex h-full w-full max-w-[1100px] flex-col gap-6 p-4 print:max-w-none print:p-0">
      <Card className="overflow-hidden border shadow-none print:border-0 print:shadow-none">
        <MainPageHeader
          title={`${template.title} QR Code`}
          description="Print this code so users can open this published exam from a phone or tablet after signing in."
          actions={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <BackNavButton href="/training/exams" text="Back to Exams" />
              <PrintButton label="Print QR Code" />
            </div>
          }
        />

        <CardContent className="grid gap-4 p-4 md:grid-cols-[0.95fr_1.05fr] print:grid-cols-[0.95fr_1.05fr] print:p-3">
          <Card className="overflow-hidden border shadow-none print:break-inside-avoid">
            <CardHeader className="border-b bg-muted/5 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-background">
                  <QrCode className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Published exam QR</p>
                  <CardTitle className="text-base font-black uppercase tracking-tight">{template.title}</CardTitle>
                  <CardDescription className="text-sm">{template.subject}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4 text-center print:p-3">
              <div className="rounded-xl border bg-muted/20 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Assessment mode</p>
                <Badge variant="outline" className="mt-2 text-[10px] font-black uppercase">
                  {isMandatory ? 'Mandatory assessment' : 'Open mock exam'}
                </Badge>
                <p className="mt-2 text-sm font-semibold">Pass mark: {template.passingScore}%</p>
              </div>
              <div className="mx-auto flex w-fit flex-col items-center rounded-2xl border bg-white p-4 print:p-2.5">
                <div
                  className="h-[240px] w-[240px] print:h-[180px] print:w-[180px]"
                  aria-label={`${template.title} QR code`}
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="overflow-hidden border shadow-none print:break-inside-avoid">
              <CardHeader className="border-b bg-muted/5">
                <CardTitle className="flex items-center gap-2 text-base font-black uppercase tracking-tight">
                  <ScanLine className="h-4 w-4" /> How it works
                </CardTitle>
                <CardDescription className="text-sm">
                  The code opens the assessment centre. Users must sign in before they can start an exam.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-4 text-sm text-muted-foreground">
                {isMandatory ? (
                  <p>Only personnel assigned to this mandatory assessment can start it, and their completed result is saved to their training record.</p>
                ) : (
                  <p>Any signed-in user can take this mock exam. Practice results are not added to a personnel training record.</p>
                )}
                <div className="rounded-lg border bg-muted/20 p-3 font-medium break-all">{launchUrl}</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
