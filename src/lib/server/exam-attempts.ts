import type { ExamResult } from '@/types/training';
import { prisma } from '@/lib/prisma';
import { ensureExamAttemptsSchema, ensureTenantConfigSchema } from '@/lib/server/bootstrap-db';

export const EXAM_RESULT_CONFIG_KEY = 'student-exam-results';

const asExamResult = (value: unknown): ExamResult | null => {
  if (!value || typeof value !== 'object') return null;
  const result = value as Partial<ExamResult>;
  if (
    typeof result.id !== 'string' ||
    typeof result.templateId !== 'string' ||
    typeof result.templateTitle !== 'string' ||
    typeof result.studentId !== 'string' ||
    typeof result.studentName !== 'string' ||
    typeof result.date !== 'string' ||
    typeof result.score !== 'number' ||
    typeof result.passingScore !== 'number' ||
    typeof result.passed !== 'boolean'
  ) {
    return null;
  }

  return { ...result, isMock: Boolean(result.isMock) } as ExamResult;
};

export async function listExamResults(tenantId: string, studentId?: string) {
  await Promise.all([ensureExamAttemptsSchema(), ensureTenantConfigSchema()]);

  const [attemptRows, configRows] = await Promise.all([
    studentId
      ? prisma.$queryRawUnsafe<{ data: unknown }[]>(
          `SELECT data FROM exam_attempts WHERE tenant_id = $1 AND student_id = $2 ORDER BY completed_at DESC`,
          tenantId,
          studentId,
        )
      : prisma.$queryRawUnsafe<{ data: unknown }[]>(
          `SELECT data FROM exam_attempts WHERE tenant_id = $1 ORDER BY completed_at DESC`,
          tenantId,
        ),
    prisma.$queryRawUnsafe<{ data: unknown }[]>(
      `SELECT data FROM tenant_configs WHERE tenant_id = $1 LIMIT 1`,
      tenantId,
    ),
  ]);

  const stored = attemptRows.map((row) => asExamResult(row.data)).filter((result): result is ExamResult => Boolean(result));
  const config = (configRows[0]?.data as Record<string, unknown> | undefined) || {};
  const legacy = (Array.isArray(config[EXAM_RESULT_CONFIG_KEY]) ? config[EXAM_RESULT_CONFIG_KEY] : [])
    .map(asExamResult)
    .filter((result): result is ExamResult => Boolean(result))
    .filter((result) => !studentId || result.studentId === studentId);

  const results = new Map<string, ExamResult>();
  [...stored, ...legacy].forEach((result) => {
    if (!results.has(result.id)) results.set(result.id, result);
  });

  return [...results.values()].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}

export async function saveExamResult(tenantId: string, result: ExamResult) {
  await ensureExamAttemptsSchema();
  await prisma.$executeRawUnsafe(
    `INSERT INTO exam_attempts (id, tenant_id, student_id, template_id, data, completed_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::timestamptz)
     ON CONFLICT (id) DO NOTHING`,
    result.id,
    tenantId,
    result.studentId,
    result.templateId,
    JSON.stringify(result),
    result.date,
  );
}
