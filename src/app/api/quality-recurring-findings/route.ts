import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ensureTenantConfigSchema } from '@/lib/server/bootstrap-db';
import { getTenantIdForRoute } from '@/lib/server/session-tenant';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@/generated/prisma/client';
import type { QualityAudit, RecurringFindingGroup } from '@/types/quality';

const CONFIG_KEY = 'quality-recurring-findings';

async function resolveTenantId(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return getTenantIdForRoute(request);
}

async function loadConfig(tenantId: string) {
  await ensureTenantConfigSchema();
  const row = await prisma.tenantConfig.findUnique({ where: { tenantId }, select: { data: true } });
  return (row?.data as Record<string, unknown>) || {};
}

async function loadMatchingGroup(tenantId: string, auditId: string, findingId: string) {
  const audits = await prisma.qualityAudit.findMany({ where: { tenantId }, select: { data: true } });
  const audit = audits.map((row) => row.data as unknown as QualityAudit).find((item) => item.id === auditId);
  const finding = audit?.findings?.find((item) => item.checklistItemId === findingId);
  if (!audit || !finding) return null;
  const occurrences = audits
    .map((row) => row.data as unknown as QualityAudit)
    .filter((item) => item.templateId === audit.templateId)
    .flatMap((item) => (item.findings || [])
      .filter((candidate) => candidate.checklistItemId === findingId && candidate.finding === 'Non Compliant')
      .map((candidate) => ({ auditId: item.id, auditNumber: item.auditNumber, findingId, observation: candidate.comment?.trim() || 'No observation recorded.', level: candidate.level, status: item.status, auditDate: item.auditDate })));
  return { audit, finding, occurrences };
}

export async function GET(request: Request) {
  const tenantId = await resolveTenantId(request);
  if (!tenantId) return NextResponse.json({ group: null }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const auditId = searchParams.get('auditId')?.trim() || '';
  const findingId = searchParams.get('findingId')?.trim() || '';
  const match = await loadMatchingGroup(tenantId, auditId, findingId);
  if (!match) return NextResponse.json({ group: null }, { status: 404 });
  const config = await loadConfig(tenantId);
  const groups = Array.isArray(config[CONFIG_KEY]) ? config[CONFIG_KEY] as RecurringFindingGroup[] : [];
  const existing = groups.find((group) => group.templateId === match.audit.templateId && group.checklistItemId === findingId);
  const group: RecurringFindingGroup = existing || { id: `finding-group:${match.audit.templateId}:${findingId}`, templateId: match.audit.templateId, checklistItemId: findingId, title: match.finding.comment?.trim() || 'Recurring finding', occurrences: [], recommendations: [] };
  return NextResponse.json({ group: { ...group, occurrences: match.occurrences } });
}

export async function POST(request: Request) {
  const tenantId = await resolveTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const auditId = typeof body?.auditId === 'string' ? body.auditId.trim() : '';
  const findingId = typeof body?.findingId === 'string' ? body.findingId.trim() : '';
  const recommendation = body?.recommendation;
  const description = typeof recommendation?.description === 'string' ? recommendation.description.trim() : '';
  if (!auditId || !findingId || !description) return NextResponse.json({ error: 'Audit, finding, and recommendation are required.' }, { status: 400 });
  const match = await loadMatchingGroup(tenantId, auditId, findingId);
  if (!match) return NextResponse.json({ error: 'Finding not found.' }, { status: 404 });
  const config = await loadConfig(tenantId);
  const groups = Array.isArray(config[CONFIG_KEY]) ? config[CONFIG_KEY] as RecurringFindingGroup[] : [];
  const groupId = `finding-group:${match.audit.templateId}:${findingId}`;
  const nextRecommendation = { id: randomUUID(), title: typeof recommendation.title === 'string' && recommendation.title.trim() ? recommendation.title.trim() : 'Recommended corrective action', description, responsiblePersonId: typeof recommendation.responsiblePersonId === 'string' ? recommendation.responsiblePersonId.trim() : '', dueInDays: Number.isFinite(recommendation.dueInDays) ? recommendation.dueInDays : undefined, createdAt: new Date().toISOString() };
  const nextGroup: RecurringFindingGroup = { id: groupId, templateId: match.audit.templateId, checklistItemId: findingId, title: match.finding.comment?.trim() || 'Recurring finding', occurrences: match.occurrences, recommendations: [...(groups.find((group) => group.id === groupId)?.recommendations || []), nextRecommendation] };
  const nextGroups = groups.some((group) => group.id === groupId) ? groups.map((group) => group.id === groupId ? nextGroup : group) : [...groups, nextGroup];
  const nextConfig = { ...config, [CONFIG_KEY]: nextGroups } as unknown as Prisma.InputJsonValue;
  await prisma.tenantConfig.upsert({ where: { tenantId }, create: { tenantId, data: nextConfig }, update: { data: nextConfig, updatedAt: new Date() } });
  return NextResponse.json({ group: nextGroup, recommendation: nextRecommendation }, { status: 200 });
}
