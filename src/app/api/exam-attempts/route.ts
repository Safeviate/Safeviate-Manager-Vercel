import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { listExamResults, saveExamResult } from '@/lib/server/exam-attempts';
import { ensurePersonnelSchema, ensureTenantConfigSchema } from '@/lib/server/bootstrap-db';
import { getTenantIdForRoute } from '@/lib/server/session-tenant';
import type { ExamTemplate } from '@/types/training';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

const TEMPLATE_KEY = 'exam-templates';

const isAnswerMap = (value: unknown): value is Record<string, string> => (
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.values(value).every((answer) => typeof answer === 'string')
);

async function loadTemplate(tenantId: string, templateId: string) {
  const rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
    `SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1`,
    tenantId,
  );
  const config = (rows[0]?.data as Record<string, unknown> | undefined) || {};
  const templates = Array.isArray(config[TEMPLATE_KEY]) ? config[TEMPLATE_KEY] : [];
  return templates.find((template): template is ExamTemplate => (
    Boolean(template) && typeof template === 'object' && (template as ExamTemplate).id === templateId
  )) || null;
}

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantIdForRoute(request);
    if (!tenantId) return NextResponse.json({ results: [] }, { status: 200 });

    const studentId = new URL(request.url).searchParams.get('studentId')?.trim() || undefined;
    const results = await listExamResults(tenantId, studentId);
    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error('[exam-attempts] unable to load results:', error);
    return NextResponse.json({ results: [] }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantIdForRoute(request);
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const templateId = typeof body?.templateId === 'string' ? body.templateId.trim() : '';
    const studentId = typeof body?.studentId === 'string' ? body.studentId.trim() : '';
    if (!templateId || !studentId || !isAnswerMap(body?.answers)) {
      return NextResponse.json({ error: 'A template, student, and answer set are required.' }, { status: 400 });
    }

    await Promise.all([ensurePersonnelSchema(), ensureTenantConfigSchema()]);
    const [template, student, session] = await Promise.all([
      loadTemplate(tenantId, templateId),
      prisma.personnel.findFirst({ where: { id: studentId, tenantId }, select: { firstName: true, lastName: true } }),
      getServerSession(authOptions),
    ]);
    if (!template || !Array.isArray(template.questions) || template.questions.length === 0) {
      return NextResponse.json({ error: 'The selected exam template is unavailable.' }, { status: 404 });
    }
    if (!student) {
      return NextResponse.json({ error: 'The selected student is unavailable.' }, { status: 404 });
    }

    const correctCount = template.questions.reduce(
      (total, question) => total + (body.answers[question.id] === question.correctOptionId ? 1 : 0),
      0,
    );
    const score = Math.round((correctCount / template.questions.length) * 100);
    const date = new Date().toISOString();
    const recordedBy = session?.user?.name?.trim() || session?.user?.email?.trim() || undefined;
    const result = {
      id: crypto.randomUUID(),
      templateId: template.id,
      templateTitle: template.title,
      studentId,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      date,
      score,
      passingScore: template.passingScore,
      passed: score >= template.passingScore,
      isMock: false,
      subject: template.subject,
      questionCount: template.questions.length,
      ...(recordedBy ? { recordedBy } : {}),
    };

    await saveExamResult(tenantId, result);
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    console.error('[exam-attempts] unable to record result:', error);
    return NextResponse.json({ error: 'Unable to record the official exam result.' }, { status: 500 });
  }
}
