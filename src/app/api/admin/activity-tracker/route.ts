import { authOptions } from '@/auth';
import { listActivityLogs } from '@/lib/server/activity-log';
import { getTenantIdFromSession } from '@/lib/server/session-tenant';
import { MASTER_TENANT_EMAILS } from '@/lib/tenant-constants';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

function isBarryMasterUser(email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase();
  return Boolean(normalizedEmail && MASTER_TENANT_EMAILS.includes(normalizedEmail));
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase() || null;
    const tenantId = (await getTenantIdFromSession(request)) || session?.user?.tenantId?.trim() || null;

    if (!isBarryMasterUser(email) || !tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const limit = Number(new URL(request.url).searchParams.get('limit') || '100');
    const logs = await listActivityLogs(tenantId, { limit: Number.isFinite(limit) ? limit : 100 });

    return NextResponse.json(
      {
        logs,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[admin/activity-tracker] failed to load logs:', error);
    return NextResponse.json({ logs: [] }, { status: 200 });
  }
}
