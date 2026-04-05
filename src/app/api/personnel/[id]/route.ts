import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  const { id } = await params;

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { email },
    select: { tenantId: true },
  });
  const tenantId = currentUser?.tenantId || 'safeviate';

  const deletedPersonnel = await prisma.personnel.deleteMany({
    where: { id, tenantId },
  });

  await prisma.user.deleteMany({
    where: { id, tenantId },
  });

  if (deletedPersonnel.count === 0) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  const { id } = await params;

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { email },
    select: { tenantId: true },
  });
  const tenantId = currentUser?.tenantId || 'safeviate';

  const body = await request.json().catch(() => null);
  const personnel = body?.personnel;
  if (!personnel || typeof personnel !== 'object') {
    return NextResponse.json({ error: 'Invalid personnel payload.' }, { status: 400 });
  }

  const existing = await prisma.personnel.findFirst({
    where: { id, tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  const data = {
    ...existing,
    ...personnel,
    id,
    tenantId,
  };

  const updatedPersonnel = await prisma.personnel.updateMany({
    where: { id, tenantId },
    data: {
      userNumber: data.userNumber || null,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      userType: data.userType || existing.userType,
      canBeInstructor: typeof data.canBeInstructor === 'boolean' ? data.canBeInstructor : existing.canBeInstructor,
      canBeStudent: typeof data.canBeStudent === 'boolean' ? data.canBeStudent : existing.canBeStudent,
      role: data.role,
      department: data.department || null,
      organizationId: data.organizationId || null,
      contactNumber: data.contactNumber || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      isErpIncerfaContact: !!data.isErpIncerfaContact,
      isErpAlerfaContact: !!data.isErpAlerfaContact,
      permissions: data.permissions || [],
      accessOverrides: data.accessOverrides || {},
      documents: data.documents || [],
      pilotLicense: data.pilotLicense || null,
      updatedAt: new Date(),
    },
  });

  if (updatedPersonnel.count === 0) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  await prisma.user.updateMany({
    where: { id, tenantId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      role: data.role,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ personnel: data }, { status: 200 });
}
