import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { FacilityQuickReportForm } from './quick-report-form';

type Props = { params: Promise<{ tenantId: string; facilityId: string }> };
type FacilityZone = { id: string; name: string };

export default async function FacilityQuickReportPage({ params }: Props) {
  const { tenantId, facilityId } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true } });
  if (!tenant) notFound();
  const rows = await prisma.$queryRawUnsafe<{ data: Record<string, unknown> }[]>(
    'SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1', tenant.id,
  );
  const facilities = Array.isArray(rows[0]?.data?.facilities) ? rows[0].data.facilities as Record<string, unknown>[] : [];
  const facility = facilities.find((item) => item.id === facilityId);
  if (!facility || typeof facility.name !== 'string') notFound();
  const zones = Array.isArray(facility.zones) ? facility.zones.filter((zone): zone is FacilityZone => Boolean(zone && typeof zone === 'object' && typeof (zone as FacilityZone).id === 'string' && typeof (zone as FacilityZone).name === 'string')) : [];
  return <FacilityQuickReportForm tenantId={tenant.id} tenantName={tenant.name} facilityId={facilityId} facilityName={facility.name} zones={zones} />;
}
