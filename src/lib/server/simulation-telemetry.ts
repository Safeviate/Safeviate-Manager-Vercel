import { prisma } from '@/lib/prisma';
import { ensureSimulationRouteMetricsSchema, ensureTenantConfigSchema } from '@/lib/server/bootstrap-db';

export const ACTIVE_SIMULATION_RUN_KEY = 'simulation-lab-active-run-id';

export type SimulationRouteMetric = {
  routeKey: string;
  requestCount: number;
  readCount: number;
  writeCount: number;
  errorCount: number;
  totalDurationMs: number;
  lastSeenAt: string;
};

export async function getActiveSimulationRunId(tenantId: string) {
  await ensureTenantConfigSchema();
  const row = await prisma.tenantConfig.findUnique({
    where: { tenantId },
    select: { data: true },
  });
  const config = (row?.data as Record<string, unknown> | null) || {};
  const activeRunId = config[ACTIVE_SIMULATION_RUN_KEY];
  return typeof activeRunId === 'string' && activeRunId.trim() ? activeRunId.trim() : null;
}

export async function recordSimulationRouteMetric(input: {
  tenantId: string | null | undefined;
  routeKey: string;
  reads?: number;
  writes?: number;
  durationMs?: number;
  isError?: boolean;
}) {
  const tenantId = input.tenantId?.trim();
  if (!tenantId) return;

  const runId = await getActiveSimulationRunId(tenantId);
  if (!runId) return;

  await ensureSimulationRouteMetricsSchema();
  await prisma.$executeRawUnsafe(
    `INSERT INTO simulation_route_metrics (
        tenant_id, run_id, route_key, request_count, read_count, write_count, error_count, total_duration_ms, last_seen_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, 1, $4, $5, $6, $7, NOW(), NOW(), NOW())
      ON CONFLICT (tenant_id, run_id, route_key)
      DO UPDATE SET
        request_count = simulation_route_metrics.request_count + 1,
        read_count = simulation_route_metrics.read_count + EXCLUDED.read_count,
        write_count = simulation_route_metrics.write_count + EXCLUDED.write_count,
        error_count = simulation_route_metrics.error_count + EXCLUDED.error_count,
        total_duration_ms = simulation_route_metrics.total_duration_ms + EXCLUDED.total_duration_ms,
        last_seen_at = NOW(),
        updated_at = NOW()`,
    tenantId,
    runId,
    input.routeKey,
    input.reads || 0,
    input.writes || 0,
    input.isError ? 1 : 0,
    Math.max(0, Math.round(input.durationMs || 0))
  );
}

export async function listSimulationRouteMetrics(tenantId: string, runId: string) {
  await ensureSimulationRouteMetricsSchema();
  const rows = await prisma.$queryRawUnsafe<{
    route_key: string;
    request_count: number;
    read_count: number;
    write_count: number;
    error_count: number;
    total_duration_ms: number;
    last_seen_at: Date | string;
  }[]>(
    `SELECT route_key, request_count, read_count, write_count, error_count, total_duration_ms, last_seen_at
     FROM simulation_route_metrics
     WHERE tenant_id = $1 AND run_id = $2
     ORDER BY request_count DESC, route_key ASC`,
    tenantId,
    runId
  );

  return rows.map((row) => ({
    routeKey: row.route_key,
    requestCount: Number(row.request_count) || 0,
    readCount: Number(row.read_count) || 0,
    writeCount: Number(row.write_count) || 0,
    errorCount: Number(row.error_count) || 0,
    totalDurationMs: Number(row.total_duration_ms) || 0,
    lastSeenAt: row.last_seen_at instanceof Date ? row.last_seen_at.toISOString() : String(row.last_seen_at),
  })) satisfies SimulationRouteMetric[];
}

