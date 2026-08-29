import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import QRCode from 'qrcode';
import { QrCode, Wrench } from 'lucide-react';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isMasterTenantEmail, resolveTenantOverride } from '@/lib/server/tenant-access';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MainPageHeader } from '@/components/page-header';

type Props = { params: Promise<{ facilityId: string }> };

export default async function FacilityReportQrPage({ params }: Props) {
  const { facilityId } = await params;
  const session = await getServerSession(authOptions);
  const baseTenantId = session?.user?.tenantId?.trim();
  if (!session?.user || !baseTenantId) redirect('/login');
  const headerList = await headers();
  const email = session.user.email?.trim().toLowerCase() || '';
  const tenantId = isMasterTenantEmail(email)
    ? await resolveTenantOverride(new Request('https://safeviate.local', { headers: { cookie: headerList.get('cookie') || '' } }), email, baseTenantId)
    : baseTenantId;
  const [tenant, rows] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true } }),
    prisma.$queryRawUnsafe<{ data: Record<string, unknown> }[]>('SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1', tenantId),
  ]);
  const facilities = Array.isArray(rows[0]?.data?.facilities) ? rows[0].data.facilities as Record<string, unknown>[] : [];
  const facility = facilities.find((item) => item.id === facilityId);
  if (!tenant || !facility || typeof facility.name !== 'string') notFound();
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || '';
  const proto = headerList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const href = `/report/${encodeURIComponent(tenant.id)}/facility/${encodeURIComponent(facilityId)}`;
  const shareUrl = host ? `${proto}://${host}${href}` : href;
  const qrSvg = await QRCode.toString(shareUrl, { type: 'svg', margin: 1, width: 240, color: { dark: '#171514', light: '#ffffff' } });
  return <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 print:max-w-none print:p-0"><Card className="overflow-hidden border shadow-none print:border-0"><MainPageHeader title="Facility report QR code" description="Print this code at the facility, apron, workshop, or equipment area for quick maintenance reporting." actions={<Button asChild className="print:hidden"><a href={href} target="_blank" rel="noreferrer">Open report form</a></Button>} /><CardContent className="p-4"><Card className="mx-auto max-w-md overflow-hidden border shadow-none"><CardHeader className="border-b bg-muted/5 text-center"><QrCode className="mx-auto h-8 w-8 text-primary" /><CardTitle className="mt-2">{facility.name}</CardTitle><CardDescription>{tenant.name} · Facility maintenance reporting</CardDescription></CardHeader><CardContent className="space-y-4 p-5 text-center"><div className="mx-auto w-fit rounded-2xl border bg-white p-4"><div className="h-[240px] w-[240px]" aria-label={`${facility.name} facility maintenance reporting QR code`} dangerouslySetInnerHTML={{ __html: qrSvg }} /></div><div><p className="text-sm font-semibold">Scan to report a facility issue</p><p className="mt-1 text-xs text-muted-foreground">The report is automatically linked to {facility.name}.</p></div><p className="rounded border border-dashed p-3 text-xs text-muted-foreground"><Wrench className="mr-1 inline h-3.5 w-3.5" />For immediate danger, follow the local emergency procedure first.</p><p className="break-all text-[10px] text-muted-foreground print:block">{shareUrl}</p></CardContent></Card></CardContent></Card></main>;
}
