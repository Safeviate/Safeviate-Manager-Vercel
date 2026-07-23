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

async function getTenantId(request: Request) {
  return getTenantIdForRoute(request);
}

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) return NextResponse.json({ organizations: [] }, { status: 200 });
    await ensureExternalOrganizationsSchema();

    const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
      `SELECT data FROM external_organizations WHERE tenant_id = $1 ORDER BY created_at ASC`,
      tenantId
    );

    return NextResponse.json({ organizations: rows.map((row) => row.data) }, { status: 200 });
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
    const data = {
      ...incoming,
      id,
    };

    const copiedItemCount = await prisma.$transaction(async (tx) => {
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
