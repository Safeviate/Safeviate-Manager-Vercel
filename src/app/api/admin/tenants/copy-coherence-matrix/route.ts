import { authOptions } from '@/auth';
import { isDatabaseAvailable } from '@/lib/prisma';
import {
  CoherenceMatrixCopyError,
  copyMasterCoherenceMatrixToTenant,
} from '@/lib/server/coherence-matrix-copy';
import { isMasterTenantEmail } from '@/lib/server/tenant-access';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    const role = session?.user?.role?.trim().toLowerCase() || '';
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const isDeveloper = role === 'dev' || role === 'developer';
    if (!isDeveloper && !isMasterTenantEmail(email)) {
      return NextResponse.json(
        { error: 'Only Safeviate master administrators can copy the master coherence matrix.' },
        { status: 403 }
      );
    }

    if (!(await isDatabaseAvailable())) {
      return NextResponse.json({ error: 'Database is unavailable.' }, { status: 503 });
    }

    const body = await request.json().catch(() => null);
    const targetTenantId = typeof body?.targetTenantId === 'string' ? body.targetTenantId : '';
    const result = await copyMasterCoherenceMatrixToTenant(targetTenantId, {
      replaceExisting: body?.replaceExisting === true,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (error) {
    if (error instanceof CoherenceMatrixCopyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[copy-coherence-matrix] failed:', error);
    return NextResponse.json({ error: 'Failed to copy the master coherence matrix.' }, { status: 500 });
  }
}
