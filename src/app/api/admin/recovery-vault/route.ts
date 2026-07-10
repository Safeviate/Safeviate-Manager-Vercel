import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  listRecoveryArchives,
  markRecoveryArchiveRestored,
  type RecoveryArchiveRow,
} from '@/lib/server/recovery-vault';
import { getTenantIdFromSession } from '@/lib/server/session-tenant';
import { MASTER_TENANT_EMAILS, MASTER_TENANT_ID } from '@/lib/tenant-constants';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

function isRecoveryAdministrator(email: string | null | undefined, tenantId: string | null) {
  return Boolean(email && tenantId === MASTER_TENANT_ID && MASTER_TENANT_EMAILS.includes(email));
}

async function getRecoveryContext(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase() || null;
  const activeTenantId = await getTenantIdFromSession(request);
  return {
    userId: session?.user?.id || null,
    email,
    isAllowed: isRecoveryAdministrator(email, activeTenantId),
  };
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asDate(value: unknown, fallback = new Date()) {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return fallback;
}

async function restoreArchive(archive: RecoveryArchiveRow) {
  const snapshot = asRecord(archive.snapshot);
  if (!snapshot) throw new Error('The archived snapshot is invalid.');

  await prisma.$transaction(async (tx) => {
    switch (archive.entityType) {
      case 'safety-report': {
        const report = asRecord(snapshot.report);
        if (!report) throw new Error('The safety report snapshot is incomplete.');
        await tx.$executeRawUnsafe(
          `INSERT INTO safety_reports (id, tenant_id, data, created_at, updated_at)
           VALUES ($1, $2, $3::jsonb, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, data = EXCLUDED.data, updated_at = NOW()`,
          archive.entityId,
          archive.tenantId,
          JSON.stringify(report),
        );
        break;
      }
      case 'quality-audit': {
        const audit = asRecord(snapshot.audit);
        if (!audit) throw new Error('The audit snapshot is incomplete.');
        await tx.$executeRawUnsafe(
          `INSERT INTO quality_audits (id, tenant_id, data, created_at, updated_at)
           VALUES ($1, $2, $3::jsonb, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, data = EXCLUDED.data, updated_at = NOW()`,
          archive.entityId,
          archive.tenantId,
          JSON.stringify(audit),
        );
        break;
      }
      case 'aircraft': {
        const aircraft = asRecord(snapshot.aircraft);
        if (!aircraft) throw new Error('The aircraft snapshot is incomplete.');
        await tx.$executeRawUnsafe(
          `INSERT INTO aircrafts (id, tenant_id, data, created_at, updated_at)
           VALUES ($1, $2, $3::jsonb, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, data = EXCLUDED.data, updated_at = NOW()`,
          archive.entityId,
          archive.tenantId,
          JSON.stringify(aircraft),
        );
        break;
      }
      case 'personnel-account': {
        const personnel = asRecord(snapshot.personnel);
        const user = asRecord(snapshot.user);
        if (!personnel) throw new Error('The personnel snapshot is incomplete.');
        const email = typeof personnel.email === 'string' ? personnel.email.trim().toLowerCase() : '';
        if (!email) throw new Error('The personnel snapshot has no email address.');
        const existingUser = await tx.user.findFirst({ where: { email } });
        if (existingUser && existingUser.id !== String(user?.id || '')) {
          throw new Error('An active account already uses this email address. Archive that account before restoring this user.');
        }
        const personnelData = {
          ...personnel,
          id: String(personnel.id || archive.entityId),
          tenantId: archive.tenantId,
          createdAt: asDate(personnel.createdAt),
          updatedAt: asDate(personnel.updatedAt),
        };
        const { id: personnelId, ...personnelUpdate } = personnelData;
        await tx.personnel.upsert({
          where: { id: personnelId },
          create: personnelData as never,
          update: personnelUpdate as never,
        });
        if (user) {
          const userData = {
            ...user,
            id: String(user.id || archive.entityId),
            tenantId: archive.tenantId,
            createdAt: asDate(user.createdAt),
            updatedAt: asDate(user.updatedAt),
            suspendedAt: user.suspendedAt ? asDate(user.suspendedAt) : null,
          };
          const { id: userId, ...userUpdate } = userData;
          await tx.user.upsert({
            where: { id: userId },
            create: userData as never,
            update: userUpdate as never,
          });
        }
        break;
      }
      case 'audit-checklist': {
        const template = asRecord(snapshot.template);
        if (!template) throw new Error('The audit checklist snapshot is incomplete.');
        const configRows = await tx.$queryRawUnsafe<{ data: unknown }[]>(
          `SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1`,
          archive.tenantId,
        );
        const config = asRecord(configRows[0]?.data) || {};
        const templates = Array.isArray(config['quality-audit-templates']) ? config['quality-audit-templates'] as Array<Record<string, unknown>> : [];
        const nextTemplates = templates.some((item) => item.id === template.id)
          ? templates.map((item) => item.id === template.id ? template : item)
          : [template, ...templates];
        await tx.$executeRawUnsafe(
          `INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at)
           VALUES ($1, $2::jsonb, NOW(), NOW())
           ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
          archive.tenantId,
          JSON.stringify({ ...config, 'quality-audit-templates': nextTemplates }),
        );
        break;
      }
      case 'audit-schedule-area':
      case 'audit-schedule-item': {
        const configRows = await tx.$queryRawUnsafe<{ data: unknown }[]>(
          `SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1`,
          archive.tenantId,
        );
        const config = asRecord(configRows[0]?.data) || {};
        const areas = Array.isArray(config['audit-areas']) ? config['audit-areas'].filter((area): area is string => typeof area === 'string') : [];
        const items = Array.isArray(config['audit-schedule-items']) ? config['audit-schedule-items'] as Array<Record<string, unknown>> : [];
        const restoredAreas = new Set(areas);
        const restoredItems = new Map(items.map((item) => [String(item.id || ''), item]));
        if (archive.entityType === 'audit-schedule-area') {
          const area = typeof snapshot.area === 'string' ? snapshot.area : '';
          if (area) restoredAreas.add(area);
          const archivedItems = Array.isArray(snapshot.items) ? snapshot.items : [];
          archivedItems.forEach((item) => {
            const itemRecord = asRecord(item);
            if (itemRecord?.id) restoredItems.set(String(itemRecord.id), itemRecord);
          });
        } else {
          const item = asRecord(snapshot.item);
          if (!item?.id) throw new Error('The audit schedule item snapshot is incomplete.');
          if (typeof item.area === 'string') restoredAreas.add(item.area);
          restoredItems.set(String(item.id), item);
        }
        await tx.$executeRawUnsafe(
          `INSERT INTO tenant_configs (tenant_id, data, created_at, updated_at)
           VALUES ($1, $2::jsonb, NOW(), NOW())
           ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
          archive.tenantId,
          JSON.stringify({ ...config, 'audit-areas': Array.from(restoredAreas), 'audit-schedule-items': Array.from(restoredItems.values()) }),
        );
        break;
      }
      default:
        throw new Error('This archived record type cannot be restored yet.');
    }
  });
}

export async function GET(request: Request) {
  const context = await getRecoveryContext(request);
  if (!context.isAllowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const archives = await listRecoveryArchives({ limit: 500 });
  return NextResponse.json({ archives }, { status: 200 });
}

export async function PATCH(request: Request) {
  const context = await getRecoveryContext(request);
  if (!context.isAllowed || !context.email) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => null);
  const archiveId = typeof body?.archiveId === 'string' ? body.archiveId : '';
  if (!archiveId) return NextResponse.json({ error: 'An archive record is required.' }, { status: 400 });
  const archives = await listRecoveryArchives({ limit: 500 });
  const archive = archives.find((entry) => entry.id === archiveId && entry.status === 'archived');
  if (!archive) return NextResponse.json({ error: 'Archived record not found.' }, { status: 404 });
  try {
    await restoreArchive(archive);
    await markRecoveryArchiveRestored(archive.id, { userId: context.userId, email: context.email });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to restore archived record.' }, { status: 400 });
  }
}
