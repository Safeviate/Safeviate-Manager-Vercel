import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canEditSafetyReportsForTenant } from '@/lib/server/safety-report-permissions';
import { getTenantIdForRoute } from '@/lib/server/session-tenant';
import { sendSafetyActionEscalationEmail } from '@/lib/server/mail';
import type { SafetyReport } from '@/types/safety-report';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const ESCALATION_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request, context: { params: Promise<{ reportId: string; actionId: string }> }) {
  const tenantId = await getTenantIdForRoute(request);
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await canEditSafetyReportsForTenant(tenantId))) {
    return NextResponse.json({ error: 'You do not have permission to escalate safety actions for this tenant.' }, { status: 403 });
  }
  const session = await getServerSession(authOptions);

  const { reportId, actionId } = await context.params;
  const rows = await prisma.$queryRawUnsafe<{ data: unknown; tenant_id: string }[]>(
    'SELECT data, tenant_id FROM safety_reports WHERE id = $1 LIMIT 1',
    reportId,
  );
  const row = rows[0];
  if (!row || row.tenant_id !== tenantId) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });

  const report = row.data as SafetyReport;
  const action = (report.correctiveActions || []).find((item) => item.id === actionId);
  if (!action) return NextResponse.json({ error: 'Corrective action not found.' }, { status: 404 });
  if (['Closed', 'Cancelled'].includes(action.status)) {
    return NextResponse.json({ error: 'Closed or cancelled actions cannot be escalated.' }, { status: 400 });
  }

  const deadline = new Date(action.deadline);
  if (Number.isNaN(deadline.getTime()) || deadline.getTime() >= Date.now()) {
    return NextResponse.json({ error: 'Only overdue corrective actions can be escalated.' }, { status: 400 });
  }

  const lastEscalated = action.lastEscalatedAt ? new Date(action.lastEscalatedAt) : null;
  if (lastEscalated && !Number.isNaN(lastEscalated.getTime()) && Date.now() - lastEscalated.getTime() < ESCALATION_COOLDOWN_MS) {
    return NextResponse.json({ error: 'An escalation reminder was already sent in the last 24 hours.' }, { status: 429 });
  }

  if (!action.responsiblePersonId) {
    return NextResponse.json({ error: 'Assign an owner before escalating this corrective action.' }, { status: 400 });
  }
  const owner = await prisma.personnel.findFirst({
    where: { id: action.responsiblePersonId, tenantId },
    select: { firstName: true, lastName: true, email: true },
  });
  if (!owner?.email) return NextResponse.json({ error: 'The assigned action owner does not have an email address.' }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const result = await sendSafetyActionEscalationEmail({
    email: owner.email,
    name: `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.email,
    reportNumber: report.reportNumber,
    reportTitle: report.title || report.description,
    actionDescription: action.description,
    deadline: deadline.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }),
    reportLink: `${appUrl}/safety/safety-reports/${report.id}`,
  });
  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Unable to send the escalation reminder.' }, { status: 502 });
  }

  const now = new Date().toISOString();
  const actor = session?.user;
  const nextReport: SafetyReport = {
    ...report,
    correctiveActions: (report.correctiveActions || []).map((item) => item.id === actionId ? {
      ...item,
      lastEscalatedAt: now,
      lastEscalatedBy: actor?.name || actor?.email || 'Safety report editor',
      escalationCount: (item.escalationCount || 0) + 1,
    } : item),
    discussion: [
      ...(report.discussion || []),
      {
        id: crypto.randomUUID(),
        userId: actor?.id || 'system',
        userName: actor?.name || actor?.email || 'Safety report editor',
        message: `Overdue corrective action escalation sent to ${owner.email}.`,
        timestamp: now,
        entryType: 'decision',
        linkedTaskId: actionId,
        assignedToId: action.responsiblePersonId,
        assignedToName: `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.email,
        dueDate: action.deadline,
      },
    ],
  };

  await prisma.$executeRawUnsafe(
    'UPDATE safety_reports SET data = $2::jsonb, updated_at = NOW() WHERE id = $1 AND tenant_id = $3',
    reportId,
    JSON.stringify(nextReport),
    tenantId,
  );

  return NextResponse.json({ report: nextReport, message: 'Overdue action escalation sent.' });
}
