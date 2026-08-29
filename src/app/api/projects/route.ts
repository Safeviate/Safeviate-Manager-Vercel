import { prisma } from '@/lib/prisma';
import { getTenantIdForRoute } from '@/lib/server/session-tenant';
import { ensureManagementOfChangeSchema, ensureProjectsSchema } from '@/lib/server/bootstrap-db';
import type { ManagementOfChange } from '@/types/moc';
import type { Project } from '@/types/project';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

const projectRows = (tenantId: string) => prisma.$queryRawUnsafe<{ data: Project }[]>(
  'SELECT data FROM projects WHERE tenant_id = $1 ORDER BY updated_at DESC', tenantId,
);

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantIdForRoute(request);
    if (!tenantId) return NextResponse.json({ projects: [], mocs: [] });
    await Promise.all([ensureProjectsSchema(), ensureManagementOfChangeSchema()]);
    const [projects, mocs] = await Promise.all([
      projectRows(tenantId),
      prisma.$queryRawUnsafe<{ data: ManagementOfChange }[]>('SELECT data FROM management_of_change WHERE tenant_id = $1 ORDER BY created_at DESC', tenantId),
    ]);
    return NextResponse.json({ projects: projects.map((row) => row.data), mocs: mocs.map((row) => row.data) });
  } catch (error) {
    console.error('[projects] load failed:', error);
    return NextResponse.json({ error: 'Unable to load projects.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantIdForRoute(request);
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await ensureProjectsSchema();
    const body = await request.json().catch(() => null);
    const incoming = body?.project as Partial<Project> | undefined;
    if (!incoming?.name?.trim() || !incoming?.objective?.trim()) return NextResponse.json({ error: 'Project name and objective are required.' }, { status: 400 });
    const now = new Date().toISOString();
    const project: Project = {
      id: randomUUID(), name: incoming.name.trim(), objective: incoming.objective.trim(),
      status: incoming.status || 'Planning', health: incoming.health || 'On Track',
      ownerId: incoming.ownerId, organizationId: incoming.organizationId || null,
      stakeholders: Array.isArray(incoming.stakeholders) ? incoming.stakeholders : [],
      startDate: incoming.startDate, targetDate: incoming.targetDate,
      mocId: incoming.mocId, mocNumber: incoming.mocNumber, mocTitle: incoming.mocTitle,
      phases: Array.isArray(incoming.phases) ? incoming.phases : [],
      tasks: Array.isArray(incoming.tasks) ? incoming.tasks : [],
      milestones: Array.isArray(incoming.milestones) ? incoming.milestones : [],
      risks: Array.isArray(incoming.risks) ? incoming.risks : [],
      createdAt: now, updatedAt: now,
    };
    await prisma.$executeRawUnsafe(
      'INSERT INTO projects (id, tenant_id, data, created_at, updated_at) VALUES ($1, $2, $3::jsonb, NOW(), NOW())',
      project.id, tenantId, JSON.stringify(project),
    );
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('[projects] create failed:', error);
    return NextResponse.json({ error: 'Unable to create project.' }, { status: 500 });
  }
}
