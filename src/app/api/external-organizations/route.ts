import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getTenantIdForRoute } from '@/lib/server/session-tenant';
import { ensureExternalOrganizationsSchema } from '@/lib/server/bootstrap-db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

type ComplianceMatrixEntry = {
  id: string;
  organizationId?: string | null;
  [key: string]: unknown;
};

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function getClientNumber(value: unknown) {
  const match = /^CLI-(\d+)$/.exec(String(value || '').trim());
  return match ? Number(match[1]) : 0;
}

function formatClientNumber(sequence: number) {
  return `CLI-${String(sequence).padStart(5, '0')}`;
}

function getNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function buildBillingSummaries(rows: Array<{ data: unknown }>) {
  const summaries = new Map<string, {
    bookingCount: number;
    invoiceCount: number;
    quotedTotal: number;
    billedTotal: number;
    paidTotal: number;
    outstandingTotal: number;
    currency: string;
  }>();

  for (const row of rows) {
    const booking = toRecord(row.data);
    const organizationId = typeof booking.organizationId === 'string' ? booking.organizationId.trim() : '';
    if (!organizationId) continue;

    const details = toRecord(booking.commercialDetails);
    const costing = toRecord(details.charterCosting);
    const quotedAmount = getNumber(costing.quotedAmount);
    const billedAmount = getNumber(costing.finalAmount) || getNumber(booking.totalCost);
    const accountingStatus = String(booking.accountingStatus || 'Unbilled');
    const current = summaries.get(organizationId) || {
      bookingCount: 0,
      invoiceCount: 0,
      quotedTotal: 0,
      billedTotal: 0,
      paidTotal: 0,
      outstandingTotal: 0,
      currency: String(costing.currency || 'ZAR'),
    };

    current.bookingCount += 1;
    current.invoiceCount += String(booking.invoiceReference || '').trim() ? 1 : 0;
    current.quotedTotal += quotedAmount;
    current.billedTotal += billedAmount;
    current.paidTotal += accountingStatus === 'Paid' ? billedAmount : 0;
    current.outstandingTotal += accountingStatus === 'Paid' ? 0 : billedAmount;
    if (costing.currency) current.currency = String(costing.currency);
    summaries.set(organizationId, current);
  }

  return summaries;
}

function allocateNextClientNumber(rows: Array<{ data: unknown }>) {
  const highest = rows.reduce((max, row) => Math.max(max, getClientNumber(toRecord(row.data).clientNumber)), 0);
  return formatClientNumber(highest + 1);
}

async function getTenantId(request: Request) {
  return getTenantIdForRoute(request);
}

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) return NextResponse.json({ organizations: [] }, { status: 200 });
    await ensureExternalOrganizationsSchema();
    const typeParam = new URL(request.url).searchParams.get('type');
    const requestedType = typeParam === 'supplier' ? 'supplier' : typeParam === 'all' ? 'all' : 'client';

    const { organizations, bookingRows } = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<{ id: string; data: unknown }[]>(
        `SELECT id, data FROM external_organizations WHERE tenant_id = $1 ORDER BY created_at ASC FOR UPDATE`,
        tenantId
      );
      const filteredRows = requestedType === 'all'
        ? rows
        : rows.filter((row) => (toRecord(row.data).recordType === 'supplier') === (requestedType === 'supplier'));
      let nextNumber = rows.reduce((max, row) => Math.max(max, getClientNumber(toRecord(row.data).clientNumber)), 0) + 1;
      const normalized = [] as Record<string, unknown>[];

      for (const row of filteredRows) {
        const existingRecordType = toRecord(row.data).recordType === 'supplier' ? 'supplier' : 'client';
        const data: Record<string, unknown> = { ...toRecord(row.data), id: row.id, recordType: existingRecordType };
        if (existingRecordType === 'client' && !getClientNumber(data.clientNumber)) {
          data.clientNumber = formatClientNumber(nextNumber++);
          await tx.$executeRawUnsafe(
            `UPDATE external_organizations SET data = $2::jsonb, updated_at = NOW() WHERE id = $1 AND tenant_id = $3`,
            row.id,
            JSON.stringify(data),
            tenantId
          );
        }
        normalized.push(data);
      }

      const bookingRows = await tx.bookingRecord.findMany({ where: { tenantId }, select: { data: true } });
      return { organizations: normalized, bookingRows };
    });

    const billingSummaries = buildBillingSummaries(bookingRows);
    const organizationsWithBilling = organizations.map((organization) => ({
      ...organization,
      billingSummary: billingSummaries.get(String(organization.id)) || {
        bookingCount: 0,
        invoiceCount: 0,
        quotedTotal: 0,
        billedTotal: 0,
        paidTotal: 0,
        outstandingTotal: 0,
        currency: 'ZAR',
      },
    }));

    return NextResponse.json({ organizations: organizationsWithBilling }, { status: 200 });
  } catch (error) {
    console.error('[external-organizations] fallback to empty list:', error);
    return NextResponse.json({ organizations: [] }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await ensureExternalOrganizationsSchema();

    const body = await request.json();
    const incoming = body?.organization ?? {};
    const copyCoherenceMatrix = body?.copyCoherenceMatrix !== false;
    const id = incoming.id || randomUUID();
    const recordType = incoming.recordType === 'supplier' ? 'supplier' : 'client';
    let data: Record<string, unknown> = { ...incoming, id, recordType };

    const copiedItemCount = await prisma.$transaction(async (tx) => {
      const existingRows = await tx.$queryRawUnsafe<{ data: unknown }[]>(
        `SELECT data FROM external_organizations WHERE tenant_id = $1 FOR UPDATE`,
        tenantId
      );
      data = {
        ...incoming,
        id,
        recordType,
        ...(recordType === 'client'
          ? { clientNumber: String(incoming.clientNumber || '').trim() || allocateNextClientNumber(existingRows) }
          : { clientNumber: undefined }),
      };
      await tx.$executeRawUnsafe(
        `INSERT INTO external_organizations (id, tenant_id, data, created_at, updated_at)
         VALUES ($1, $2, $3::jsonb, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        id,
        tenantId,
        JSON.stringify(data)
      );

      if (!copyCoherenceMatrix) {
        return 0;
      }

      const configRows = await tx.$queryRawUnsafe<{ data: unknown }[]>(
        `SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1 FOR UPDATE`,
        tenantId
      );
      const config = (configRows[0]?.data as Record<string, unknown>) || {};
      const matrixItems = Array.isArray(config['compliance-matrix'])
        ? (config['compliance-matrix'] as ComplianceMatrixEntry[])
        : [];

      // Only clone the internal-company matrix. New IDs make the external
      // company's copy independent, while the regulation hierarchy remains intact.
      const copiedItems = matrixItems
        .filter((item) => !item.organizationId)
        .map((item) => ({
          ...structuredClone(item),
          id: randomUUID(),
          organizationId: id,
        }));

      if (copiedItems.length === 0) {
        return 0;
      }

      const nextConfig = {
        ...config,
        'compliance-matrix': [...matrixItems, ...copiedItems],
      };
      await tx.$executeRawUnsafe(
        `INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at)
         VALUES ($1, $2::jsonb, NOW(), NOW())
         ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        tenantId,
        JSON.stringify(nextConfig)
      );

      return copiedItems.length;
    });

    return NextResponse.json({ organization: data, copiedItemCount }, { status: 200 });
  } catch (error) {
    console.error('[external-organizations] write failed:', error);
    return NextResponse.json({ error: 'Failed to save external company.' }, { status: 500 });
  }
}
