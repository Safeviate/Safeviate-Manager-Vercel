import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import QRCode from 'qrcode';
import { type LucideIcon, Building2, ShieldAlert, FileWarning, CheckCircle2 } from 'lucide-react';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isMasterTenantEmail, resolveTenantOverride } from '@/lib/server/tenant-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MainPageHeader } from '@/components/page-header';
import { QrCodePrintMenu } from './qr-code-print-menu';

type QrTarget = {
  title: string;
  placement: string;
  description: string;
  href: string;
  note: string;
  icon: LucideIcon;
  type: 'safety' | 'technical' | 'facility';
};

export default async function QuickReportQrCodesPage() {
  const session = await getServerSession(authOptions);
  const baseTenantId = session?.user?.tenantId?.trim();

  if (!session?.user || !baseTenantId) {
    redirect('/login');
  }

  const headerList = await headers();
  const cookieHeader = headerList.get('cookie') || '';
  const email = session.user.email?.trim().toLowerCase() || '';
  const tenantId = isMasterTenantEmail(email)
    ? await resolveTenantOverride(new Request('https://safeviate.local', { headers: { cookie: cookieHeader } }), email, baseTenantId)
    : baseTenantId;

  const [tenant, configRows] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true } }),
    prisma.$queryRawUnsafe<{ data: Record<string, unknown> }[]>('SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1', tenantId),
  ]);

  if (!tenant) {
    notFound();
  }

  const host = headerList.get('x-forwarded-host') || headerList.get('host') || '';
  const proto = headerList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const baseUrl = host ? `${proto}://${host}` : '';
  const facilities = Array.isArray(configRows[0]?.data?.facilities) ? configRows[0].data.facilities as Record<string, unknown>[] : [];

  const qrTargets: QrTarget[] = [
    {
      title: 'Safety Report',
      placement: 'Aircraft Dashboard',
      description: 'Direct link to the public safety quick report form.',
      href: `/report/${encodeURIComponent(tenant.id)}/safety-report`,
      note: 'Use on desk mounts, dashboards, or wall placards.',
      icon: ShieldAlert,
      type: 'safety',
    },
    {
      title: 'Technical Report',
      placement: 'Maintenance Wall Mount',
      description: 'Direct link to the public technical quick report form.',
      href: `/report/${encodeURIComponent(tenant.id)}/technical-report`,
      note: 'Use on maintenance desks, hangars, or vehicle cards.',
      icon: FileWarning,
      type: 'technical',
    },
    ...facilities.filter((facility) => typeof facility.id === 'string' && typeof facility.name === 'string').map((facility) => ({
      title: `${facility.name} Facility Report`,
      placement: 'Facility, apron, workshop, or equipment area',
      description: 'Direct link to the public facility maintenance report form, locked to this location.',
      href: `/report/${encodeURIComponent(tenant.id)}/facility/${encodeURIComponent(facility.id as string)}`,
      note: 'Use at the facility where people need to report infrastructure defects.',
      icon: Building2,
      type: 'facility' as const,
    })),
  ];

  const qrCards = await Promise.all(
    qrTargets.map(async (target) => ({
      ...target,
      shareUrl: baseUrl ? `${baseUrl}${target.href}` : target.href,
      qrSvg: await QRCode.toString(baseUrl ? `${baseUrl}${target.href}` : target.href, {
        type: 'svg',
        margin: 1,
        width: 200,
        color: {
          dark: '#171514',
          light: '#ffffff',
        },
      }),
    }))
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-4 overflow-hidden p-4 print:max-w-none print:overflow-visible print:p-0 print:pb-0">
      <Card className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border shadow-none print:border-0 print:shadow-none">
        <MainPageHeader
          title={`${tenant.name} QR Codes`}
          description="Print public safety, technical, and facility maintenance QR codes. Facility codes are locked to the relevant airport, heliport, or base."
          actions={<QrCodePrintMenu />}
        />

        <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 print:space-y-3 print:overflow-visible">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/5 p-3 print:hidden">
            <Badge variant="outline" className="h-5 px-2 text-[9px] font-black uppercase tracking-widest">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Print first
            </Badge>
            <p className="text-xs font-medium text-muted-foreground">
              The QR blocks below are the primary content. Keep the scale near 100% when printing for desk mounts, dashboards, or wall mounts.
            </p>
          </div>

          <style>{`@media print {
            html[data-qr-print-target="safety"] [data-qr-type="technical"],
            html[data-qr-print-target="technical"] [data-qr-type="safety"],
            html[data-qr-print-target="safety"] [data-qr-type="facility"],
            html[data-qr-print-target="technical"] [data-qr-type="facility"] {
              display: none !important;
            }

            html[data-qr-print-target="safety"] .qr-code-print-grid,
            html[data-qr-print-target="technical"] .qr-code-print-grid {
              grid-template-columns: minmax(0, 420px) !important;
              justify-content: center;
            }

            html[data-qr-print-target="safety"] .qr-code-print-card,
            html[data-qr-print-target="technical"] .qr-code-print-card {
              width: 420px;
            }

            html[data-qr-print-target="safety"] .qr-code-image,
            html[data-qr-print-target="technical"] .qr-code-image {
              height: 200px !important;
              width: 200px !important;
            }

            .qr-code-share-url,
            .qr-code-placement-note {
              display: block !important;
            }
          }`}</style>
          <div className="qr-code-print-grid grid gap-4 md:grid-cols-2 print:grid-cols-2 print:gap-3">
          {qrCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.href} data-qr-type={card.type} className="qr-code-print-card overflow-hidden border shadow-none print:break-inside-avoid print:border">
                <CardHeader className="border-b bg-muted/5 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-background">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                        {card.placement}
                      </p>
                      <CardTitle className="text-base font-black uppercase tracking-tight">{card.title}</CardTitle>
                      <CardDescription className="mt-1 text-sm">{card.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4 text-center print:p-3">
                  <div className="mx-auto flex w-fit flex-col items-center rounded-2xl border bg-white p-4 print:p-2.5">
                    <div
                      className="qr-code-image h-[200px] w-[200px] print:h-[160px] print:w-[160px]"
                      aria-label={`${tenant.name} ${card.title} QR code`}
                      dangerouslySetInnerHTML={{ __html: card.qrSvg }}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-foreground">
                      {tenant.name}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Powered by Safeviate
                    </p>
                  </div>
                  <div className="qr-code-share-url hidden rounded-lg border bg-muted/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] break-all md:block print:hidden">
                    {card.shareUrl}
                  </div>
                  <p className="qr-code-placement-note hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground md:block print:hidden">
                    {card.note}
                  </p>
                </CardContent>
              </Card>
            );
          })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
