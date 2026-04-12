export type PlatformUserGroupKey = 'crew' | 'ops' | 'viewer';

export type PrismaMode = 'external' | 'prisma-postgres';

export type PrismaPostgresPlan = 'starter' | 'pro' | 'business';

type RoleProfile = {
  label: string;
  sessionsPerUserPerDay: number;
  pageViewsPerSession: number;
  apiCallsPerSession: number;
  dbOpsPerSession: number;
  responseKbPerPage: number;
  responseKbPerApi: number;
  storageMbPerUserPerMonth: number;
};

export type PlatformUsageInput = {
  crewUsers: number;
  opsUsers: number;
  viewerUsers: number;
  activityIntensityPercent: number;
  trackingMinutesPerCrewUserPerDay: number;
  trackingWriteIntervalSeconds: number;
  prismaMode: PrismaMode;
  prismaPlan: PrismaPostgresPlan;
};

export type GroupUsage = {
  label: string;
  users: number;
  monthlySessions: number;
  monthlyEdgeRequests: number;
  monthlyFunctionInvocations: number;
  monthlyDbOps: number;
  monthlyBandwidthGb: number;
  monthlyStorageGb: number;
};

export type PlatformUsageEstimate = {
  groups: Record<PlatformUserGroupKey, GroupUsage>;
  totals: {
    users: number;
    monthlySessions: number;
    monthlyEdgeRequests: number;
    monthlyFunctionInvocations: number;
    monthlyDbOps: number;
    monthlyBandwidthGb: number;
    monthlyStorageGb: number;
  };
  vercel: {
    baseCost: number;
    invocationCost: number;
    edgeRequestCost: number;
    bandwidthCost: number;
    totalCost: number;
    includedInvocations: number;
    includedEdgeRequests: number;
    includedBandwidthGb: number;
  };
  prisma: {
    baseCost: number;
    operationCost: number;
    storageCost: number;
    totalCost: number;
    includedOperations: number;
    includedStorageGb: number;
  };
  notes: string[];
};

const DAYS_PER_MONTH = 30;

const VERCEL_INCLUDED_INVOCATIONS = 1_000_000;
const VERCEL_INCLUDED_EDGE_REQUESTS = 10_000_000;
const VERCEL_INCLUDED_BANDWIDTH_GB = 1024;

const VERCEL_INVOCATION_OVERAGE_PER_1M = 0.60;
const VERCEL_EDGE_REQUEST_OVERAGE_PER_1M = 2.0;
const VERCEL_BANDWIDTH_OVERAGE_PER_GB = 0.15;
const VERCEL_PRO_BASE = 20;

const PRISMA_PLANS = {
  starter: {
    label: 'Starter',
    baseCost: 10,
    includedOperations: 1_000_000,
    includedStorageGb: 10,
    operationOveragePer1k: 0.008,
    storageOveragePerGb: 2,
  },
  pro: {
    label: 'Pro',
    baseCost: 49,
    includedOperations: 10_000_000,
    includedStorageGb: 50,
    operationOveragePer1k: 0.002,
    storageOveragePerGb: 2,
  },
  business: {
    label: 'Business',
    baseCost: 129,
    includedOperations: 50_000_000,
    includedStorageGb: 100,
    operationOveragePer1k: 0.001,
    storageOveragePerGb: 1,
  },
} as const;

const ROLE_PROFILES: Record<PlatformUserGroupKey, RoleProfile> = {
  crew: {
    label: 'Flight Crew',
    sessionsPerUserPerDay: 4,
    pageViewsPerSession: 6,
    apiCallsPerSession: 5,
    dbOpsPerSession: 9,
    responseKbPerPage: 72,
    responseKbPerApi: 24,
    storageMbPerUserPerMonth: 6,
  },
  ops: {
    label: 'Operations',
    sessionsPerUserPerDay: 5,
    pageViewsPerSession: 5,
    apiCallsPerSession: 6,
    dbOpsPerSession: 11,
    responseKbPerPage: 64,
    responseKbPerApi: 22,
    storageMbPerUserPerMonth: 4,
  },
  viewer: {
    label: 'Viewers',
    sessionsPerUserPerDay: 2,
    pageViewsPerSession: 3,
    apiCallsPerSession: 3,
    dbOpsPerSession: 4,
    responseKbPerPage: 44,
    responseKbPerApi: 14,
    storageMbPerUserPerMonth: 1.5,
  },
};

const TRACKING_PAYLOAD_KB_PER_WRITE = 0.9;
const TRACKING_STORAGE_KB_PER_WRITE = 1.2;
const TRACKING_DB_OPS_PER_WRITE = 1;

const clampPositive = (value: number) => Math.max(0, value);

function estimateRoleUsage(
  label: string,
  users: number,
  profile: RoleProfile,
  intensityMultiplier: number,
) {
  const monthlySessions = users * profile.sessionsPerUserPerDay * intensityMultiplier * DAYS_PER_MONTH;
  const monthlyPageViews = monthlySessions * profile.pageViewsPerSession;
  const monthlyApiCalls = monthlySessions * profile.apiCallsPerSession;
  const monthlyDbOps = monthlySessions * profile.dbOpsPerSession;
  const monthlyBandwidthGb =
    ((monthlyPageViews * profile.responseKbPerPage) + (monthlyApiCalls * profile.responseKbPerApi)) /
    1024 /
    1024;
  const monthlyStorageGb = (users * profile.storageMbPerUserPerMonth * intensityMultiplier) / 1024;

  return {
    label,
    users,
    monthlySessions,
    monthlyEdgeRequests: monthlyPageViews,
    monthlyFunctionInvocations: monthlyApiCalls,
    monthlyDbOps,
    monthlyBandwidthGb,
    monthlyStorageGb,
  };
}

export function estimatePlatformUsage(input: PlatformUsageInput): PlatformUsageEstimate {
  const intensityMultiplier = clampPositive(input.activityIntensityPercent) / 100;
  const crewUsers = clampPositive(input.crewUsers);
  const opsUsers = clampPositive(input.opsUsers);
  const viewerUsers = clampPositive(input.viewerUsers);
  const trackingMinutesPerCrewUserPerDay = clampPositive(input.trackingMinutesPerCrewUserPerDay);
  const trackingWriteIntervalSeconds = Math.max(1, clampPositive(input.trackingWriteIntervalSeconds) || 1);

  const crew = estimateRoleUsage('Flight Crew', crewUsers, ROLE_PROFILES.crew, intensityMultiplier);
  const ops = estimateRoleUsage('Operations', opsUsers, ROLE_PROFILES.ops, intensityMultiplier);
  const viewer = estimateRoleUsage('Viewers', viewerUsers, ROLE_PROFILES.viewer, intensityMultiplier);

  const trackingWritesDaily = crewUsers * (trackingMinutesPerCrewUserPerDay * 60) / trackingWriteIntervalSeconds;
  const trackingWritesMonthly = trackingWritesDaily * DAYS_PER_MONTH;
  const trackingMonthlyFunctionInvocations = trackingWritesMonthly;
  const trackingMonthlyDbOps = trackingWritesMonthly * TRACKING_DB_OPS_PER_WRITE;
  const trackingMonthlyBandwidthGb = (trackingWritesMonthly * TRACKING_PAYLOAD_KB_PER_WRITE) / 1024 / 1024;
  const trackingMonthlyStorageGb = (trackingWritesMonthly * TRACKING_STORAGE_KB_PER_WRITE) / 1024 / 1024;

  const totals = {
    users: crewUsers + opsUsers + viewerUsers,
    monthlySessions: crew.monthlySessions + ops.monthlySessions + viewer.monthlySessions,
    monthlyEdgeRequests: crew.monthlyEdgeRequests + ops.monthlyEdgeRequests + viewer.monthlyEdgeRequests,
    monthlyFunctionInvocations:
      crew.monthlyFunctionInvocations +
      ops.monthlyFunctionInvocations +
      viewer.monthlyFunctionInvocations +
      trackingMonthlyFunctionInvocations,
    monthlyDbOps: crew.monthlyDbOps + ops.monthlyDbOps + viewer.monthlyDbOps + trackingMonthlyDbOps,
    monthlyBandwidthGb:
      crew.monthlyBandwidthGb +
      ops.monthlyBandwidthGb +
      viewer.monthlyBandwidthGb +
      trackingMonthlyBandwidthGb,
    monthlyStorageGb:
      crew.monthlyStorageGb +
      ops.monthlyStorageGb +
      viewer.monthlyStorageGb +
      trackingMonthlyStorageGb,
  };

  const vercelInvocationOverage = clampPositive(totals.monthlyFunctionInvocations - VERCEL_INCLUDED_INVOCATIONS);
  const vercelEdgeRequestOverage = clampPositive(totals.monthlyEdgeRequests - VERCEL_INCLUDED_EDGE_REQUESTS);
  const vercelBandwidthOverage = clampPositive(totals.monthlyBandwidthGb - VERCEL_INCLUDED_BANDWIDTH_GB);

  const vercel = {
    baseCost: VERCEL_PRO_BASE,
    invocationCost: (vercelInvocationOverage / 1_000_000) * VERCEL_INVOCATION_OVERAGE_PER_1M,
    edgeRequestCost: (vercelEdgeRequestOverage / 1_000_000) * VERCEL_EDGE_REQUEST_OVERAGE_PER_1M,
    bandwidthCost: vercelBandwidthOverage * VERCEL_BANDWIDTH_OVERAGE_PER_GB,
    totalCost: 0,
    includedInvocations: VERCEL_INCLUDED_INVOCATIONS,
    includedEdgeRequests: VERCEL_INCLUDED_EDGE_REQUESTS,
    includedBandwidthGb: VERCEL_INCLUDED_BANDWIDTH_GB,
  };
  vercel.totalCost = vercel.baseCost + vercel.invocationCost + vercel.edgeRequestCost + vercel.bandwidthCost;

  const prismaPlan = PRISMA_PLANS[input.prismaPlan];
  const prismaOperationOverage = clampPositive(totals.monthlyDbOps - prismaPlan.includedOperations);
  const prismaStorageOverage = clampPositive(totals.monthlyStorageGb - prismaPlan.includedStorageGb);

  const prisma =
    input.prismaMode === 'external'
      ? {
          baseCost: 0,
          operationCost: 0,
          storageCost: 0,
          totalCost: 0,
          includedOperations: 0,
          includedStorageGb: 0,
        }
      : {
          baseCost: prismaPlan.baseCost,
          operationCost: (prismaOperationOverage / 1_000) * prismaPlan.operationOveragePer1k,
          storageCost: prismaStorageOverage * prismaPlan.storageOveragePerGb,
          totalCost: 0,
          includedOperations: prismaPlan.includedOperations,
          includedStorageGb: prismaPlan.includedStorageGb,
        };

  prisma.totalCost = prisma.baseCost + prisma.operationCost + prisma.storageCost;

  const notes = [
    'Vercel bandwidth and edge request estimates count app traffic and middleware hits, not external map tiles or third-party assets.',
    input.prismaMode === 'external'
      ? 'Prisma ORM is free in the current setup; this estimate does not include your external PostgreSQL provider.'
      : 'Prisma Postgres pricing uses operation counts, not SQL statement counts.',
    `Active flight tracking assumes one write every ${trackingWriteIntervalSeconds}s while a flight is live.`,
  ];

  return {
    groups: {
      crew,
      ops,
      viewer,
    },
    totals,
    vercel,
    prisma,
    notes,
  };
}

export const DEFAULT_PLATFORM_USAGE_INPUT: PlatformUsageInput = {
  crewUsers: 40,
  opsUsers: 12,
  viewerUsers: 18,
  activityIntensityPercent: 100,
  trackingMinutesPerCrewUserPerDay: 30,
  trackingWriteIntervalSeconds: 5,
  prismaMode: 'external',
  prismaPlan: 'starter',
};

export const PRISMA_POSTGRES_PLAN_OPTIONS = [
  {
    value: 'starter' as const,
    label: 'Starter',
    baseCost: PRISMA_PLANS.starter.baseCost,
    includedOperations: PRISMA_PLANS.starter.includedOperations,
    includedStorageGb: PRISMA_PLANS.starter.includedStorageGb,
  },
  {
    value: 'pro' as const,
    label: 'Pro',
    baseCost: PRISMA_PLANS.pro.baseCost,
    includedOperations: PRISMA_PLANS.pro.includedOperations,
    includedStorageGb: PRISMA_PLANS.pro.includedStorageGb,
  },
  {
    value: 'business' as const,
    label: 'Business',
    baseCost: PRISMA_PLANS.business.baseCost,
    includedOperations: PRISMA_PLANS.business.includedOperations,
    includedStorageGb: PRISMA_PLANS.business.includedStorageGb,
  },
] as const;

export const PLATFORM_ROLE_ORDER: PlatformUserGroupKey[] = ['crew', 'ops', 'viewer'];

export const PLATFORM_ROLE_LABELS: Record<PlatformUserGroupKey, string> = {
  crew: ROLE_PROFILES.crew.label,
  ops: ROLE_PROFILES.ops.label,
  viewer: ROLE_PROFILES.viewer.label,
};
