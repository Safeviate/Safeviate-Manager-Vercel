import { prisma } from '@/lib/prisma';
import { getTenantIdForRoute } from '@/lib/server/session-tenant';
import { ensureProjectsSchema } from '@/lib/server/bootstrap-db';
import type { Project } from '@/types/project';
import type { ManagementOfChange } from '@/types/moc';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await getTenantIdForRoute(request);
  const { id } = await params;
  if (!tenantId) return NextResponse.json({ project: null }, { status: 401 });
  await ensureProjectsSchema();
  const rows = await prisma.$queryRawUnsafe<{ data: Project }[]>('SELECT data FROM projects WHERE id = $1 AND tenant_id = $2 LIMIT 1', id, tenantId);
  const project = rows[0]?.data || null;
  let moc: ManagementOfChange | null = null;
  if (project?.mocId) {
    const mocRows = await prisma.$queryRawUnsafe<{ data: ManagementOfChange }[]>('SELECT data FROM management_of_change WHERE id = $1 AND tenant_id = $2 LIMIT 1', project.mocId, tenantId);
    moc = mocRows[0]?.data || null;
  }
  return NextResponse.json({ project, moc });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await getTenantIdForRoute(request);
  const { id } = await params;
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await ensureProjectsSchema();
  const body = await request.json().catch(() => null);
  const incoming = body?.project as Project | undefined;
  if (!incoming || incoming.id !== id) return NextResponse.json({ error: 'Invalid project.' }, { status: 400 });
  const project = { ...incoming, updatedAt: new Date().toISOString() };
  const result = await prisma.$executeRawUnsafe('UPDATE projects SET data = $1::jsonb, updated_at = NOW() WHERE id = $2 AND tenant_id = $3', JSON.stringify(project), id, tenantId);
  if (!result) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  return NextResponse.json({ project });
}
