import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ensureSafetyFileAssignmentsSchema } from '@/lib/server/bootstrap-db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

async function getTenantId() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;
  const currentUser = await prisma.user.findUnique({
    where: { email },
    select: { tenantId: true },
  });
  return currentUser?.tenantId || 'safeviate';
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    await ensureSafetyFileAssignmentsSchema();

    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, assignmentId } = await params;
    await prisma.$executeRawUnsafe(
      `DELETE FROM safety_file_assignments WHERE id = $1 AND tenant_id = $2 AND project_id = $3`,
      assignmentId,
      tenantId,
      projectId
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[safety-files/[id]/assignments/[assignmentId]] failed to delete assignment:', error);
    return NextResponse.json({ error: 'Failed to delete project assignment.' }, { status: 500 });
  }
}
