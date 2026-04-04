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

  await prisma.personnel.deleteMany({
    where: { id, tenantId },
  });

  await prisma.user.deleteMany({
    where: { id, tenantId },
  });

  return NextResponse.json({ ok: true });
}
