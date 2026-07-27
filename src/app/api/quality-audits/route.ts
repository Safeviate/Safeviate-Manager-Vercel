import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ensureAircraftSchema, ensureExternalOrganizationsSchema } from '@/lib/server/bootstrap-db';
import { getTenantIdFromSession } from '@/lib/server/session-tenant';
import { recordSimulationRouteMetric } from '@/lib/server/simulation-telemetry';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import type { QualityAudit } from '@/types/quality';
import type { Aircraft } from '@/types/aircraft';
import type { Alert } from '@/types/alert';
import { markRecoveryArchivesRestoredForEntity, recordRecoveryArchive } from '@/lib/server/recovery-vault';

function toStableJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

const AUDIT_SEQUENCE_PREFIX = 'AUD';

type AuditSequenceTx = {
  $executeRawUnsafe: typeof prisma.$executeRawUnsafe;
  $queryRawUnsafe: typeof prisma.$queryRawUnsafe;
};

function formatAuditSequenceNumber(prefix: string, value: number) {
  return `${prefix}-${String(Math.max(1, Math.floor(value))).padStart(4, '0')}`;
}

async function allocateNextAuditNumber(tx: AuditSequenceTx, tenantId: string) {
  const sequenceLockKey = `quality-audits:${tenantId}:${AUDIT_SEQUENCE_PREFIX}`;
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, sequenceLockKey);
  const rows = await tx.$queryRawUnsafe<{ next_number: number }[]>(
    `SELECT COALESCE(MAX(((regexp_match(data->>'auditNumber', '^AUD-([0-9]+)$'))[1])::integer), 0) + 1 AS next_number
     FROM quality_audits
     WHERE tenant_id = $1
       AND COALESCE(data->>'analysisType', '') <> 'gap-analysis'
       AND data->>'auditNumber' ~ '^AUD-[0-9]+$'`,
    tenantId
  );
  return formatAuditSequenceNumber(AUDIT_SEQUENCE_PREFIX, rows[0]?.next_number ?? 1);
}

async function getTenantId(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;
  // Tenant ownership is resolved from the current tenant record (or an
  // authorized master-tenant override), never from a stale session claim.
  return getTenantIdFromSession(request);
}

async function getConfig(tenantId: string) {
  const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
    `SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1`,
    tenantId
  );
  return (rows[0]?.data as any) || {};
}

type TenantPersonnelRecord = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

function normalizeText(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function getPersonnelDisplayName(person: TenantPersonnelRecord | null | undefined) {
  if (!person) return '';
  const fullName = `${person.firstName || ''} ${person.lastName || ''}`.trim();
  return fullName || (person.email || '').trim();
}

function resolvePersonnelByIdentity(personnel: TenantPersonnelRecord[], value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  return (
    personnel.find((person) => normalizeText(person.id) === normalized)
    || personnel.find((person) => normalizeText(person.email) === normalized)
    || personnel.find((person) => normalizeText(getPersonnelDisplayName(person)) === normalized)
    || null
  );
}

function normalizeAuditIdentity(audit: QualityAudit, personnel: TenantPersonnelRecord[]) {
  const resolvedAuditor =
    resolvePersonnelByIdentity(personnel, audit.auditorId)
    || resolvePersonnelByIdentity(personnel, audit.auditorName);
  const resolvedAuditee =
    resolvePersonnelByIdentity(personnel, audit.auditeeId)
    || resolvePersonnelByIdentity(personnel, audit.auditeeName);

  return {
    ...audit,
    auditorId: resolvedAuditor?.id?.trim() || audit.auditorId,
    auditorName: getPersonnelDisplayName(resolvedAuditor) || audit.auditorName,
    auditeeId: resolvedAuditee?.id?.trim() || audit.auditeeId,
    auditeeName: getPersonnelDisplayName(resolvedAuditee) || audit.auditeeName,
  } as QualityAudit;
}

function buildAuditeeSignoffAlert(audit: QualityAudit, actorId: string | null, recipientEmail?: string) {
  const auditNumber = audit.auditNumber?.trim() || 'Audit';
  const targetLabel = audit.targetName?.trim() || audit.scope?.trim() || 'Assigned audit';
  const dueContext = audit.auditDate ? new Date(audit.auditDate).toLocaleDateString('en-ZA') : '';

  return {
    id: `audit-signoff-required:${audit.id}`,
    type: 'Company Notice',
    category: 'quality-audit-signoff',
    title: `${auditNumber} requires auditee sign-off`,
    content: dueContext
      ? `${targetLabel}. Auditor sign-off is complete and the auditee signature is now required. Planned audit date ${dueContext}.`
      : `${targetLabel}. Auditor sign-off is complete and the auditee signature is now required.`,
    createdAt: new Date().toISOString(),
    createdBy: actorId || '',
    status: 'Active',
    mustRead: true,
    recipientUserId: audit.auditeeId || '',
    recipientEmail: recipientEmail || '',
    relatedEntityId: audit.id,
    link: `/quality/audits/${audit.id}`,
  } satisfies Alert;
}

async function upsertAuditSignoffAlert(
  tenantId: string,
  audit: QualityAudit,
  actorId: string | null,
  recipientEmail?: string
) {
  if (!audit.id || !audit.auditeeId?.trim() || !audit.auditorSignoff || audit.auditeeSignoff) {
    return;
  }

  const alert = buildAuditeeSignoffAlert(audit, actorId, recipientEmail);
  await prisma.$executeRawUnsafe(
    `INSERT INTO alerts (id, tenant_id, data, created_at, updated_at)
     VALUES ($1, $2, $3::jsonb, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    alert.id,
    tenantId,
    JSON.stringify(alert)
  );
}

async function archiveAuditSignoffAlert(tenantId: string, auditId: string) {
  const alertId = `audit-signoff-required:${auditId}`;
  const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
    `SELECT data FROM alerts WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    alertId,
    tenantId
  );
  const existingAlert = rows[0]?.data as Alert | undefined;
  if (!existingAlert) return;

  const archivedAlert: Alert = {
    ...existingAlert,
    status: 'Archived',
    mustRead: false,
  };
  await prisma.$executeRawUnsafe(
    `UPDATE alerts SET data = $3::jsonb, updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
    alertId,
    tenantId,
    JSON.stringify(archivedAlert)
  );
}

type StoredAuditRow = {
  id: string;
  data: unknown;
};

function getStoredAudit(row: StoredAuditRow): QualityAudit | null {
  if (!row.data || typeof row.data !== 'object' || Array.isArray(row.data)) {
    return null;
  }

  // The table row ID is the tenant-owned audit identity. Older JSON payloads can
  // contain an ID from before tenant scoping, so never expose that as the record ID.
  return { ...(row.data as QualityAudit), id: row.id };
}

function getLegacyAuditId(row: StoredAuditRow) {
  if (!row.data || typeof row.data !== 'object' || Array.isArray(row.data)) {
    return null;
  }

  const legacyId = (row.data as { id?: unknown }).id;
  return typeof legacyId === 'string' && legacyId.trim() ? legacyId.trim() : null;
}

async function loadAudits(tenantId: string) {
  const rows = await prisma.$queryRawUnsafe<{ id: string; data: unknown }[]>(
    `SELECT id, data FROM quality_audits WHERE tenant_id = $1 ORDER BY created_at DESC`,
    tenantId
  );
  return rows
    .filter((row) => (row.data as { analysisType?: string } | null)?.analysisType !== 'gap-analysis');
}

async function loadCaps(tenantId: string) {
  const rows = await prisma.$queryRawUnsafe<{ id: string; data: unknown }[]>(
    `SELECT id, data FROM corrective_action_plans WHERE tenant_id = $1 ORDER BY created_at DESC`,
    tenantId
  );
  return rows.map((row) => row.data);
}

async function loadExternalOrganizations(tenantId: string) {
  await ensureExternalOrganizationsSchema();
  const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
    `SELECT data FROM external_organizations WHERE tenant_id = $1 ORDER BY created_at ASC`,
    tenantId
  );
  return rows.map((row) => row.data);
}

async function loadAircraft(tenantId: string) {
  await ensureAircraftSchema();
  const rows = await prisma.aircraftRecord.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((row) => row.data as unknown as Aircraft);
}

async function loadPersonnel(tenantId: string) {
  return prisma.personnel.findMany({
    where: { tenantId },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }, { email: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      organizationId: true,
      department: true,
      role: true,
      permissions: true,
      accessOverrides: true,
      documents: true,
      userType: true,
      canBeInstructor: true,
      canBeStudent: true,
      isErpIncerfaContact: true,
      isErpAlerfaContact: true,
      createdAt: true,
      updatedAt: true,
      canBePIC: true,
      primaryInstructorId: true,
      instructorAssignmentHistory: true,
      progressionRecommendation: true,
      progressionReviewHistory: true,
      userNumber: true,
      contactNumber: true,
    },
  });
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  let tenantId: string | null = null;
  try {
    tenantId = await getTenantId(request);
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const requestedAuditId = new URL(request.url).searchParams.get('auditId')?.trim();

    const [rawAudits, caps, config, organizations, aircraft, persistedPersonnel] = await Promise.all([
      loadAudits(tenantId),
      loadCaps(tenantId),
      getConfig(tenantId),
      loadExternalOrganizations(tenantId),
      loadAircraft(tenantId),
      loadPersonnel(tenantId),
    ]);
    const configPersonnel = Array.isArray(config['personnel']) ? (config['personnel'] as TenantPersonnelRecord[]) : [];
    const personnel =
      persistedPersonnel.length > 0
        ? persistedPersonnel
        : configPersonnel;
    const audits = rawAudits
      .map(getStoredAudit)
      .filter((audit): audit is QualityAudit => audit !== null)
      .map((audit) => normalizeAuditIdentity(audit, personnel));
    await recordSimulationRouteMetric({
      tenantId,
      routeKey: 'quality-audits.GET',
      reads: 3,
      writes: 0,
      durationMs: Date.now() - startedAt,
    });
    const payload = {
      audits,
      caps,
      templates: Array.isArray(config['quality-audit-templates']) ? config['quality-audit-templates'] : [],
      personnel,
      departments: Array.isArray(config['departments']) ? config['departments'] : [],
      organizations,
      aircraft,
      findingLevels: Array.isArray(config['finding-levels'])
        ? config['finding-levels']
        : Array.isArray(config['finding-levels-settings']?.levels)
          ? config['finding-levels-settings'].levels
          : [],
    };

    if (requestedAuditId) {
      const audit = audits.find((item) => item.id === requestedAuditId)
        ?? rawAudits
          .filter((row) => getLegacyAuditId(row) === requestedAuditId)
          .map(getStoredAudit)
          .find((item): item is QualityAudit => item !== null);
      if (!audit) return NextResponse.json({ error: 'Audit record not found in the current tenant.' }, { status: 404 });
      return NextResponse.json({ ...payload, audit: normalizeAuditIdentity(audit, personnel) }, { status: 200 });
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error('[quality-audits] failed to load tenant audit data:', error);
    await recordSimulationRouteMetric({
      tenantId,
      routeKey: 'quality-audits.GET',
      reads: 0,
      writes: 0,
      durationMs: Date.now() - startedAt,
      isError: true,
    });
    return NextResponse.json({ error: 'Unable to load audit data for the current tenant.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const tenantId = await getTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const session = await getServerSession(authOptions);
  const actorId = session?.user?.id?.trim() || null;
  const actorEmail = session?.user?.email?.trim().toLowerCase() || null;
  const body = await request.json().catch(() => null);
  const audit = body?.audit;
  if (!audit || typeof audit !== 'object') return NextResponse.json({ error: 'Invalid audit payload' }, { status: 400 });
  const id = audit.id || randomUUID();
  const config = await getConfig(tenantId);
  const configPersonnel = Array.isArray(config['personnel']) ? (config['personnel'] as TenantPersonnelRecord[]) : [];
  const persistedPersonnel = await loadPersonnel(tenantId);
  const personnel =
    persistedPersonnel.length > 0
      ? persistedPersonnel
      : configPersonnel;
  const incomingAudit = normalizeAuditIdentity({ ...audit, id } as QualityAudit, personnel);

  const actorPersonnelId = actorEmail
    ? await prisma.personnel.findFirst({
        where: {
          tenantId,
          email: actorEmail,
        },
        select: { id: true },
      }).then((person) => person?.id?.trim() || null).catch(() => null)
    : null;
  const allowedActorIds = new Set([actorId, actorPersonnelId].filter((value): value is string => Boolean(value)));

  if (allowedActorIds.size > 0 && typeof incomingAudit.auditorId === 'string' && !allowedActorIds.has(incomingAudit.auditorId.trim())) {
    return NextResponse.json({ error: 'Quality audits must be created under the active signed-in auditor.' }, { status: 403 });
  }

  const existingRows = await prisma.$queryRawUnsafe<{ data: unknown; tenant_id: string }[]>(
    `SELECT data, tenant_id FROM quality_audits WHERE id = $1 LIMIT 1`,
    id
  );
  const existingRow = existingRows[0];
  if (existingRow && existingRow.tenant_id !== tenantId) {
    return NextResponse.json({ error: 'Audit not found in the current tenant.' }, { status: 404 });
  }
  const signoffError = validateAuditSignoffMutation((existingRow?.data as QualityAudit | undefined) ?? null, incomingAudit, allowedActorIds);
  if (signoffError) {
    return NextResponse.json({ error: signoffError }, { status: 403 });
  }

  const persistedAudit = await prisma.$transaction(async (tx) => {
    const nextAuditNumber = !existingRow
      ? await allocateNextAuditNumber(tx, tenantId)
      : null;
    const data: QualityAudit = {
      ...incomingAudit,
      id,
      auditNumber: existingAuditNumber(existingRow?.data as QualityAudit | undefined, incomingAudit, nextAuditNumber),
    };

    await tx.$executeRawUnsafe(
      `INSERT INTO quality_audits (id, tenant_id, data, created_at, updated_at) VALUES ($1, $2, $3::jsonb, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      id,
      tenantId,
      JSON.stringify(data)
    );

    return data;
  });
  const resolvedAuditee = resolvePersonnelByIdentity(personnel, persistedAudit.auditeeId || persistedAudit.auditeeName);
  if (persistedAudit.auditeeSignoff) {
    await archiveAuditSignoffAlert(tenantId, persistedAudit.id);
  } else if (persistedAudit.auditorSignoff) {
    await upsertAuditSignoffAlert(tenantId, persistedAudit, actorId, resolvedAuditee?.email?.trim());
  }
  await recordSimulationRouteMetric({
    tenantId,
    routeKey: 'quality-audits.POST',
    reads: 0,
    writes: 1,
    durationMs: Date.now() - startedAt,
  });
  return NextResponse.json({ audit: persistedAudit }, { status: 200 });
}

export async function DELETE(request: Request) {
  const startedAt = Date.now();
  const tenantId = await getTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const session = await getServerSession(authOptions);
  const actorEmail = session?.user?.email?.trim().toLowerCase();
  const existingRows = await prisma.$queryRawUnsafe<{ data: Record<string, unknown> }[]>(
    `SELECT data FROM quality_audits WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    id,
    tenantId,
  );
  const existing = existingRows[0]?.data;
  if (!existing) return NextResponse.json({ error: 'Audit not found.' }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    await recordRecoveryArchive({
      tenantId,
      entityType: 'quality-audit',
      entityId: id,
      entityLabel: String(existing.auditNumber || existing.title || existing.scope || id),
      snapshot: { audit: existing },
      actorUserId: session?.user?.id || null,
      actorEmail: actorEmail || 'unknown',
    }, tx);
    await tx.$executeRawUnsafe(
      `UPDATE quality_audits SET data = jsonb_set(data, '{status}', '"Archived"'::jsonb), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      id,
      tenantId
    );
  });
  await recordSimulationRouteMetric({
    tenantId,
    routeKey: 'quality-audits.ARCHIVE',
    reads: 0,
    writes: 1,
    durationMs: Date.now() - startedAt,
  });
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function PATCH(request: Request) {
  const startedAt = Date.now();
  const tenantId = await getTenantId(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = body?.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await prisma.$executeRawUnsafe(
    `UPDATE quality_audits SET data = jsonb_set(data, '{status}', '"Finalized"'::jsonb), updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND data->>'status' = 'Archived'`,
    id,
    tenantId
  );
  const session = await getServerSession(authOptions);
  const actorEmail = session?.user?.email?.trim().toLowerCase();
  if (actorEmail) {
    await markRecoveryArchivesRestoredForEntity(
      { tenantId, entityType: 'quality-audit', entityId: id },
      { userId: session?.user?.id || null, email: actorEmail },
    );
  }
  await recordSimulationRouteMetric({ tenantId, routeKey: 'quality-audits.RESTORE', reads: 0, writes: 1, durationMs: Date.now() - startedAt });
  return NextResponse.json({ ok: true }, { status: 200 });
}

function validateAuditSignoffMutation(existingAudit: QualityAudit | null, incomingAudit: QualityAudit, allowedActorIds: Set<string>) {
  if (!existingAudit) return null;

  const existingAuditorSignoff = existingAudit.auditorSignoff ?? null;
  const incomingAuditorSignoff = incomingAudit.auditorSignoff ?? null;
  if (toStableJson(existingAuditorSignoff) !== toStableJson(incomingAuditorSignoff)) {
    if (allowedActorIds.size === 0) return 'You must be signed in to record an auditor sign-off.';
    if (!allowedActorIds.has((incomingAudit.auditorId || '').trim())) {
      return 'Only the assigned auditor can sign the auditor sign-off.';
    }
    if (!incomingAuditorSignoff || !allowedActorIds.has((incomingAuditorSignoff.signedById || '').trim())) {
      return 'Auditor sign-off must belong to the active assigned auditor.';
    }
  }

  const existingAuditeeSignoff = existingAudit.auditeeSignoff ?? null;
  const incomingAuditeeSignoff = incomingAudit.auditeeSignoff ?? null;
  if (toStableJson(existingAuditeeSignoff) !== toStableJson(incomingAuditeeSignoff)) {
    if (allowedActorIds.size === 0) return 'You must be signed in to record an auditee sign-off.';
    if (!allowedActorIds.has((incomingAudit.auditeeId || '').trim())) {
      return 'Only the assigned auditee can sign the auditee sign-off.';
    }
    if (!incomingAuditeeSignoff || !allowedActorIds.has((incomingAuditeeSignoff.signedById || '').trim())) {
      return 'Auditee sign-off must belong to the active assigned auditee.';
    }
  }

  return null;
}

function existingAuditNumber(existingAudit: QualityAudit | undefined, incomingAudit: QualityAudit, nextAuditNumber: string | null) {
  if (existingAudit?.auditNumber?.trim()) return existingAudit.auditNumber.trim();
  if (nextAuditNumber) return nextAuditNumber;
  if (incomingAudit.auditNumber?.trim()) return incomingAudit.auditNumber.trim();
  return formatAuditSequenceNumber(AUDIT_SEQUENCE_PREFIX, 1);
}
