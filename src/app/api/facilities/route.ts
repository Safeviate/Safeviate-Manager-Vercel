import { prisma } from '@/lib/prisma';
import { getTenantIdFromSession } from '@/lib/server/session-tenant';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

type FacilityZone = { id: string; name: string; category?: string; notes?: string };
type FacilityAsset = { id: string; name: string; category?: string; zoneId?: string; status?: string; toolId?: string; companyNumber?: string };
type FacilityDocument = { id: string; documentId: string; kind: 'SOP' | 'Manual' | 'Diagram'; title?: string; zoneId?: string };
type Facility = {
  id: string;
  name: string;
  type: string;
  code?: string;
  location?: string;
  status: string;
  notes?: string;
  zones: FacilityZone[];
  assets: FacilityAsset[];
  documents: FacilityDocument[];
  createdAt: string;
  updatedAt: string;
};

const facilityTypes = new Set(['Airport', 'Heliport', 'Helistop', 'Base', 'Other']);
const facilityStatuses = new Set(['Operational', 'Restricted', 'Inactive']);
const documentKinds = new Set(['SOP', 'Manual', 'Diagram']);

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeFacility(value: unknown): Facility | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const name = text(item.name);
  if (!name) return null;
  const now = new Date().toISOString();
  const zones: FacilityZone[] = Array.isArray(item.zones) ? item.zones.map<FacilityZone | null>((zone) => {
    const row = zone as Record<string, unknown>;
    const zoneName = text(row?.name);
    return zoneName ? { id: text(row.id) || randomUUID(), name: zoneName, category: text(row.category), notes: text(row.notes) } : null;
  }).filter((zone): zone is FacilityZone => Boolean(zone)) : [];
  const assets: FacilityAsset[] = Array.isArray(item.assets) ? item.assets.map<FacilityAsset | null>((asset) => {
    const row = asset as Record<string, unknown>;
    const assetName = text(row?.name);
    return assetName ? { id: text(row.id) || randomUUID(), name: assetName, category: text(row.category), zoneId: text(row.zoneId), status: text(row.status) || 'Serviceable', toolId: text(row.toolId), companyNumber: text(row.companyNumber) } : null;
  }).filter((asset): asset is FacilityAsset => Boolean(asset)) : [];
  const documents: FacilityDocument[] = Array.isArray(item.documents) ? item.documents.map<FacilityDocument | null>((document) => {
    const row = document as Record<string, unknown>;
    const documentId = text(row?.documentId);
    const kind = text(row?.kind);
    return documentId && documentKinds.has(kind) ? { id: text(row.id) || randomUUID(), documentId, kind: kind as FacilityDocument['kind'], title: text(row.title), zoneId: text(row.zoneId) } : null;
  }).filter((document): document is FacilityDocument => Boolean(document)) : [];

  const type = text(item.type);
  const status = text(item.status);
  return {
    id: text(item.id) || randomUUID(),
    name,
    type: facilityTypes.has(type) ? type : 'Other',
    code: text(item.code),
    location: text(item.location),
    status: facilityStatuses.has(status) ? status : 'Operational',
    notes: text(item.notes),
    zones,
    assets,
    documents,
    createdAt: text(item.createdAt) || now,
    updatedAt: text(item.updatedAt) || now,
  };
}

async function getConfig(tenantId: string) {
  const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
    'SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1', tenantId,
  );
  return (rows[0]?.data as Record<string, unknown>) || {};
}

async function saveFacilities(tenantId: string, facilities: Facility[]) {
  const config = await getConfig(tenantId);
  await prisma.$executeRawUnsafe(
    'INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at) VALUES ($1, $2::jsonb, NOW(), NOW()) ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()',
    tenantId,
    JSON.stringify({ ...config, facilities }),
  );
}

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantIdFromSession(request);
    if (!tenantId) return NextResponse.json({ facilities: [] });
    const config = await getConfig(tenantId);
    const facilities = Array.isArray(config.facilities)
      ? config.facilities.map(sanitizeFacility).filter((facility): facility is Facility => Boolean(facility))
      : [];
    return NextResponse.json({ facilities: facilities.sort((a, b) => a.name.localeCompare(b.name)) });
  } catch (error) {
    console.error('[facilities] fallback to empty list:', error);
    return NextResponse.json({ facilities: [] });
  }
}

export async function POST(request: Request) {
  const tenantId = await getTenantIdFromSession(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await request.json().catch(() => null);
  const incoming = sanitizeFacility(payload?.facility);
  if (!incoming) return NextResponse.json({ error: 'Facility name is required.' }, { status: 400 });
  const config = await getConfig(tenantId);
  const facilities = Array.isArray(config.facilities)
    ? config.facilities.map(sanitizeFacility).filter((facility): facility is Facility => Boolean(facility))
    : [];
  const saved = { ...incoming, updatedAt: new Date().toISOString() };
  const next = facilities.some((facility) => facility.id === saved.id)
    ? facilities.map((facility) => facility.id === saved.id ? saved : facility)
    : [...facilities, saved];
  await saveFacilities(tenantId, next);
  return NextResponse.json({ facility: saved });
}

export async function DELETE(request: Request) {
  const tenantId = await getTenantIdFromSession(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id')?.trim();
  if (!id) return NextResponse.json({ error: 'Facility id is required.' }, { status: 400 });
  const config = await getConfig(tenantId);
  const facilities = Array.isArray(config.facilities)
    ? config.facilities.map(sanitizeFacility).filter((facility): facility is Facility => Boolean(facility))
    : [];
  const next = facilities.filter((facility) => facility.id !== id);
  if (next.length === facilities.length) return NextResponse.json({ error: 'Facility not found.' }, { status: 404 });
  await saveFacilities(tenantId, next);
  return NextResponse.json({ ok: true });
}
