import { authOptions } from '@/auth';
import { getDb } from '@/db';
import { companyDocuments, tenants, users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

async function getTenantIdForSession() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  const authUserId = session?.user?.id?.trim();

  if (!email) {
    return null;
  }

  const db = getDb();
  await db.insert(tenants).values({ id: 'safeviate', name: 'Safeviate', updatedAt: new Date() }).onConflictDoNothing();

  let [profile] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!profile) {
    [profile] = await db
      .insert(users)
      .values({
        id: authUserId || `user_${email.replace(/[^a-z0-9]+/g, '_')}`,
        tenantId: 'safeviate',
        email,
        firstName: session?.user?.name?.split(' ')[0] ?? 'User',
        lastName: session?.user?.name?.split(' ').slice(1).join(' ') || '',
        role: 'developer',
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          updatedAt: new Date(),
        },
      })
      .returning();
  }

  return profile.tenantId;
}

export async function GET() {
  const tenantId = await getTenantIdForSession();
  if (!tenantId) {
    return NextResponse.json({ documents: [] }, { status: 200 });
  }

  const db = getDb();
  const rows = await db.select().from(companyDocuments).where(eq(companyDocuments.tenantId, tenantId));

  return NextResponse.json({
    documents: rows.map((row) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      uploadDate: row.uploadDate?.toISOString() ?? new Date().toISOString(),
      expirationDate: row.expirationDate ? row.expirationDate.toISOString() : null,
      type: row.docType === 'image' ? 'image' : 'file',
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

  const db = getDb();
  await db.insert(companyDocuments).values({
    id,
    tenantId,
    name,
    url,
    uploadDate,
    expirationDate,
    docType,
    updatedAt: new Date(),
  });

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

  const db = getDb();
  await db
    .update(companyDocuments)
    .set({
      expirationDate,
      updatedAt: new Date(),
    })
    .where(and(eq(companyDocuments.id, id), eq(companyDocuments.tenantId, tenantId)));

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

  const db = getDb();
  await db.delete(companyDocuments).where(and(eq(companyDocuments.id, id), eq(companyDocuments.tenantId, tenantId)));

  return NextResponse.json({ ok: true });
}
