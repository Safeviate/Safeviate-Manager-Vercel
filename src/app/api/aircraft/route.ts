import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { normalizeUploadUrl } from '@/lib/server/azure-blob';
import { ensureAircraftSchema } from '@/lib/server/bootstrap-db';
import { recordSimulationRouteMetric } from '@/lib/server/simulation-telemetry';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

const SUPER_USERS = ['deanebolton@gmail.com', 'barry@safeviate.com'];

async function getTenantId() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) {
    return process.env.NODE_ENV === 'development' ? 'safeviate' : null;
  }

  const seedEmail = process.env.AUTH_SEED_EMAIL?.trim().toLowerCase();
  if (SUPER_USERS.includes(email) || (seedEmail && email === seedEmail)) {
    return 'safeviate';
  }

  const currentUser = await prisma.user.findUnique({
    where: { email },
    select: { tenantId: true },
  });

  return currentUser?.tenantId || 'safeviate';
}

function normalizeAircraftDocumentUrls(aircraft: unknown) {
  if (!aircraft || typeof aircraft !== 'object') return aircraft;

  const record = aircraft as Record<string, unknown>;
  const documents = Array.isArray(record.documents)
    ? record.documents.map((document) => {
        if (!document || typeof document !== 'object') return document;
        const docRecord = document as Record<string, unknown>;
        return {
          ...docRecord,
          url: typeof docRecord.url === 'string' ? normalizeUploadUrl(docRecord.url) : docRecord.url,
        };
      })
    : record.documents;

  return { ...record, documents };
}

export async function GET() {
  const startedAt = Date.now();
  let tenantId: string | null = null;
  try {
    await ensureAircraftSchema();
    tenantId = await getTenantId();
    if (!tenantId) return NextResponse.json({ aircraft: [] }, { status: 200 });

    const aircraft = await prisma.aircraftRecord.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    await recordSimulationRouteMetric({
      tenantId,
      routeKey: 'aircraft.GET',
      reads: 1,
      writes: 0,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ aircraft: aircraft.map((row) => normalizeAircraftDocumentUrls(row.data)) }, { status: 200 });
  } catch (error) {
    console.error('[aircraft] fallback to empty list:', error);
    await recordSimulationRouteMetric({
      tenantId,
      routeKey: 'aircraft.GET',
      reads: 0,
      writes: 0,
      durationMs: Date.now() - startedAt,
      isError: true,
    });
    return NextResponse.json({ aircraft: [] }, { status: 200 });
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let tenantId: string | null = null;
  try {
    await ensureAircraftSchema();
    tenantId = await getTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const incoming = body?.aircraft ?? {};
    const id = incoming.id || randomUUID();
    const data = {
      ...incoming,
      id,
      organizationId: incoming.organizationId || tenantId,
      components: Array.isArray(incoming.components) ? incoming.components : [],
      documents: Array.isArray(incoming.documents)
        ? incoming.documents.map((document: unknown) => {
            if (!document || typeof document !== 'object') return document;
            const docRecord = document as Record<string, unknown>;
            return {
              ...docRecord,
              url: typeof docRecord.url === 'string' ? normalizeUploadUrl(docRecord.url) : docRecord.url,
            };
          })
        : [],
    };

    await prisma.aircraftRecord.upsert({
      where: { id },
      update: {
        tenantId,
        data,
        updatedAt: new Date(),
      },
      create: {
        id,
        tenantId,
        data,
      },
    });

    await recordSimulationRouteMetric({
      tenantId,
      routeKey: 'aircraft.POST',
      reads: 0,
      writes: 1,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ aircraft: data }, { status: 200 });
  } catch (error) {
    console.error('[aircraft] failed to save aircraft:', error);
    await recordSimulationRouteMetric({
      tenantId,
      routeKey: 'aircraft.POST',
      reads: 0,
      writes: 0,
      durationMs: Date.now() - startedAt,
      isError: true,
    });
    return NextResponse.json({ error: 'Failed to save aircraft.' }, { status: 500 });
  }
}
