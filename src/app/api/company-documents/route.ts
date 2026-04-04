import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ensureCoreSchema, getBootstrapDbState } from '@/lib/server/bootstrap-db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

async function getTenantIdForSession() {
  const { bootstrapMode } = await getBootstrapDbState();
  if (bootstrapMode) {
    await ensureCoreSchema();
    return 'safeviate';
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  const authUserId = session?.user?.id?.trim();

  if (!email) {
    return null;
  }

  await ensureCoreSchema();

  await prisma.tenant.upsert({
    where: { id: 'safeviate' },
    update: { updatedAt: new Date() },
    create: { id: 'safeviate', name: 'Safeviate' },
  });

  const profile = await prisma.user.upsert({
    where: { email },
    update: {
      id: authUserId || `user_${email.replace(/[^a-z0-9]+/g, '_')}`,
      tenantId: 'safeviate',
      firstName: session?.user?.name?.split(' ')[0] ?? 'User',
      lastName: session?.user?.name?.split(' ').slice(1).join(' ') || '',
      role: 'developer',
      updatedAt: new Date(),
    },
    create: {
      id: authUserId || `user_${email.replace(/[^a-z0-9]+/g, '_')}`,
      tenantId: 'safeviate',
      email,
      firstName: session?.user?.name?.split(' ')[0] ?? 'User',
      lastName: session?.user?.name?.split(' ').slice(1).join(' ') || '',
      role: 'developer',
    },
  });

  return profile.tenantId;
}

export async function GET() {
  const tenantId = await getTenantIdForSession();
  if (!tenantId) {
    return NextResponse.json({ documents: [] }, { status: 200 });
  }

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, name, url, upload_date, expiration_date, doc_type FROM company_documents WHERE tenant_id = $1 ORDER BY created_at ASC`,
    tenantId
  );

  return NextResponse.json({
    documents: rows.map((row) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      uploadDate: row.upload_date ? new Date(row.upload_date).toISOString() : new Date().toISOString(),
      expirationDate: row.expiration_date ? new Date(row.expiration_date).toISOString() : null,
      type: row.doc_type === 'image' ? 'image' : 'file',
    })),
  });
}

export async function POST(request: Request) {
  const tenantId = await getTenantIdForSession();
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json();
  const id = payload?.id?.toString() || crypto.randomUUID();
  const name = payload?.name?.toString()?.trim();
  const url = payload?.url?.toString()?.trim();
  const uploadDate = payload?.uploadDate ? new Date(payload.uploadDate) : new Date();
  const expirationDate = payload?.expirationDate ? new Date(payload.expirationDate) : null;
  const docType = payload?.type === 'image' ? 'image' : 'file';

  if (!name || !url) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO company_documents (id, tenant_id, name, url, upload_date, expiration_date, doc_type, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
    id,
    tenantId,
    name,
    url,
    uploadDate,
    expirationDate,
    docType
  );

  return NextResponse.json({ ok: true, id });
}

export async function PATCH(request: Request) {
  const tenantId = await getTenantIdForSession();
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json();
  const id = payload?.id?.toString();
  const expirationDate = payload?.expirationDate ? new Date(payload.expirationDate) : null;

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  await prisma.$executeRawUnsafe(
    `UPDATE company_documents SET expiration_date = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
    id,
    tenantId,
    expirationDate
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const tenantId = await getTenantIdForSession();
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  await prisma.$executeRawUnsafe(`DELETE FROM company_documents WHERE id = $1 AND tenant_id = $2`, id, tenantId);

  return NextResponse.json({ ok: true });
}
