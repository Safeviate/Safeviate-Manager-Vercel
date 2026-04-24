export type PlatformUserGroupKey = 'crew' | 'ops' | 'viewer';

export type AzureAppServicePlan = 'basic-b1' | 'standard-s1' | 'premium-p0v3';

export type AzurePostgresPlan = 'burstable-b1ms' | 'burstable-b2s' | 'general-purpose-d2s';

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
  appServicePlan: AzureAppServicePlan;
  postgresPlan: AzurePostgresPlan;
};

export type GroupUsage = {
  label: string;
  users: number;
  monthlySessions: number;
  monthlyRequests: number;
  monthlyApiRequests: number;
  monthlyDbOps: number;
  monthlyBandwidthGb: number;
  monthlyStorageGb: number;
};

export type PlatformUsageEstimate = {
  groups: Record<PlatformUserGroupKey, GroupUsage>;
  totals: {
    users: number;
    monthlySessions: number;
    monthlyRequests: number;
    monthlyApiRequests: number;
    monthlyDbOps: number;
    monthlyBandwidthGb: number;
    monthlyStorageGb: number;
    monthlyTrackingWrites: number;
    computeLoadPercent: number;
  };
  azure: {
    appService: {
      planLabel: string;
      baseCost: number;
      bandwidthCost: number;
      totalCost: number;
      includedBandwidthGb: number;
      estimatedRequestCapacity: number;
      computeLoadPercent: number;
    };
    postgres: {
      planLabel: string;
      computeCost: number;
      storageCost: number;
      backupCost: number;
      totalCost: number;
      provisionedStorageGb: number;
      estimatedOpsCapacity: number;
      opsLoadPercent: number;
    };
  };
  notes: string[];
};

const DAYS_PER_MONTH = 30;
const AZURE_INCLUDED_EGRESS_GB = 100;
const AZURE_EGRESS_OVERAGE_PER_GB = 0.087;
const AZURE_POSTGRES_STORAGE_PER_GB = 0.115;
const AZURE_POSTGRES_BACKUP_PER_GB = 0.095;

const AZURE_APP_SERVICE_PLANS = {
  'basic-b1': {
    label: 'Basic B1',
    baseCost: 13.14,
    estimatedRequestCapacity: 1_500_000,
  },
  'standard-s1': {
    label: 'Standard S1',
    baseCost: 73,
    estimatedRequestCapacity: 6_000_000,
  },
  'premium-p0v3': {
    label: 'Premium P0v3',
    baseCost: 60,
    estimatedRequestCapacity: 12_000_000,
  },
} as const;

const AZURE_POSTGRES_PLANS = {
  'burstable-b1ms': {
    label: 'Burstable B1ms',
    computeCost: 12.41,
    provisionedStorageGb: 32,
    estimatedOpsCapacity: 4_000_000,
  },
  'burstable-b2s': {
    label: 'Burstable B2s',
    computeCost: 30,
    provisionedStorageGb: 64,
    estimatedOpsCapacity: 10_000_000,
  },
  'general-purpose-d2s': {
    label: 'General Purpose D2s v3',
    computeCost: 110,
    provisionedStorageGb: 128,
    estimatedOpsCapacity: 30_000_000,
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
  const monthlyApiRequests = monthlySessions * profile.apiCallsPerSession;
  const monthlyDbOps = monthlySessions * profile.dbOpsPerSession;
  const monthlyBandwidthGb =
    ((monthlyPageViews * profile.responseKbPerPage) + (monthlyApiRequests * profile.responseKbPerApi)) /
    1024 /
    1024;
  const monthlyStorageGb = (users * profile.storageMbPerUserPerMonth * intensityMultiplier) / 1024;

  return {
    label,
    users,
    monthlySessions,
    monthlyRequests: monthlyPageViews + monthlyApiRequests,
    monthlyApiRequests,
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
  const trackingMonthlyApiRequests = trackingWritesMonthly;
  const trackingMonthlyDbOps = trackingWritesMonthly * TRACKING_DB_OPS_PER_WRITE;
  const trackingMonthlyBandwidthGb = (trackingWritesMonthly * TRACKING_PAYLOAD_KB_PER_WRITE) / 1024 / 1024;
  const trackingMonthlyStorageGb = (trackingWritesMonthly * TRACKING_STORAGE_KB_PER_WRITE) / 1024 / 1024;

  const monthlyRequests = crew.monthlyRequests + ops.monthlyRequests + viewer.monthlyRequests + trackingMonthlyApiRequests;
  const monthlyDbOps = crew.monthlyDbOps + ops.monthlyDbOps + viewer.monthlyDbOps + trackingMonthlyDbOps;
  const monthlyBandwidthGb =
    crew.monthlyBandwidthGb +
    ops.monthlyBandwidthGb +
    viewer.monthlyBandwidthGb +
    trackingMonthlyBandwidthGb;
  const monthlyStorageGb =
    crew.monthlyStorageGb +
    ops.monthlyStorageGb +
    viewer.monthlyStorageGb +
    trackingMonthlyStorageGb;

  const appPlan = AZURE_APP_SERVICE_PLANS[input.appServicePlan];
  const postgresPlan = AZURE_POSTGRES_PLANS[input.postgresPlan];
  const bandwidthOverage = clampPositive(monthlyBandwidthGb - AZURE_INCLUDED_EGRESS_GB);
  const computeLoadPercent = appPlan.estimatedRequestCapacity > 0
    ? (monthlyRequests / appPlan.estimatedRequestCapacity) * 100
    : 0;
  const postgresOpsLoadPercent = postgresPlan.estimatedOpsCapacity > 0
    ? (monthlyDbOps / postgresPlan.estimatedOpsCapacity) * 100
    : 0;
  const storageBillableGb = Math.max(postgresPlan.provisionedStorageGb, Math.ceil(monthlyStorageGb));

  const appService = {
    planLabel: appPlan.label,
    baseCost: appPlan.baseCost,
    bandwidthCost: bandwidthOverage * AZURE_EGRESS_OVERAGE_PER_GB,
    totalCost: 0,
    includedBandwidthGb: AZURE_INCLUDED_EGRESS_GB,
    estimatedRequestCapacity: appPlan.estimatedRequestCapacity,
    computeLoadPercent,
  };
  appService.totalCost = appService.baseCost + appService.bandwidthCost;

  const postgres = {
    planLabel: postgresPlan.label,
    computeCost: postgresPlan.computeCost,
    storageCost: storageBillableGb * AZURE_POSTGRES_STORAGE_PER_GB,
    backupCost: monthlyStorageGb * AZURE_POSTGRES_BACKUP_PER_GB,
    totalCost: 0,
    provisionedStorageGb: storageBillableGb,
    estimatedOpsCapacity: postgresPlan.estimatedOpsCapacity,
    opsLoadPercent: postgresOpsLoadPercent,
  };
  postgres.totalCost = postgres.computeCost + postgres.storageCost + postgres.backupCost;

  const notes = [
    'Azure App Service is modeled as a fixed monthly App Service Plan plus public internet egress after the free monthly bandwidth allowance.',
    'Azure Database for PostgreSQL Flexible Server is modeled as compute, provisioned storage, and backup storage. Actual regional pricing can vary.',
    `Active flight tracking assumes one API write every ${trackingWriteIntervalSeconds}s while a flight is live.`,
  ];

  return {
    groups: {
      crew,
      ops,
      viewer,
    },
    totals: {
      users: crewUsers + opsUsers + viewerUsers,
      monthlySessions: crew.monthlySessions + ops.monthlySessions + viewer.monthlySessions,
      monthlyRequests,
      monthlyApiRequests: crew.monthlyApiRequests + ops.monthlyApiRequests + viewer.monthlyApiRequests + trackingMonthlyApiRequests,
      monthlyDbOps,
      monthlyBandwidthGb,
      monthlyStorageGb,
      monthlyTrackingWrites: trackingWritesMonthly,
      computeLoadPercent,
    },
    azure: {
      appService,
      postgres,
    },
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
  appServicePlan: 'basic-b1',
  postgresPlan: 'burstable-b1ms',
};

export const AZURE_APP_SERVICE_PLAN_OPTIONS = [
  {
    value: 'basic-b1' as const,
    label: AZURE_APP_SERVICE_PLANS['basic-b1'].label,
    baseCost: AZURE_APP_SERVICE_PLANS['basic-b1'].baseCost,
    estimatedRequestCapacity: AZURE_APP_SERVICE_PLANS['basic-b1'].estimatedRequestCapacity,
  },
  {
    value: 'standard-s1' as const,
    label: AZURE_APP_SERVICE_PLANS['standard-s1'].label,
    baseCost: AZURE_APP_SERVICE_PLANS['standard-s1'].baseCost,
    estimatedRequestCapacity: AZURE_APP_SERVICE_PLANS['standard-s1'].estimatedRequestCapacity,
  },
  {
    value: 'premium-p0v3' as const,
    label: AZURE_APP_SERVICE_PLANS['premium-p0v3'].label,
    baseCost: AZURE_APP_SERVICE_PLANS['premium-p0v3'].baseCost,
    estimatedRequestCapacity: AZURE_APP_SERVICE_PLANS['premium-p0v3'].estimatedRequestCapacity,
  },
] as const;

export const AZURE_POSTGRES_PLAN_OPTIONS = [
  {
    value: 'burstable-b1ms' as const,
    label: AZURE_POSTGRES_PLANS['burstable-b1ms'].label,
    computeCost: AZURE_POSTGRES_PLANS['burstable-b1ms'].computeCost,
    provisionedStorageGb: AZURE_POSTGRES_PLANS['burstable-b1ms'].provisionedStorageGb,
  },
  {
    value: 'burstable-b2s' as const,
    label: AZURE_POSTGRES_PLANS['burstable-b2s'].label,
    computeCost: AZURE_POSTGRES_PLANS['burstable-b2s'].computeCost,
    provisionedStorageGb: AZURE_POSTGRES_PLANS['burstable-b2s'].provisionedStorageGb,
  },
  {
    value: 'general-purpose-d2s' as const,
    label: AZURE_POSTGRES_PLANS['general-purpose-d2s'].label,
    computeCost: AZURE_POSTGRES_PLANS['general-purpose-d2s'].computeCost,
    provisionedStorageGb: AZURE_POSTGRES_PLANS['general-purpose-d2s'].provisionedStorageGb,
  },
] as const;

export const PLATFORM_ROLE_ORDER: PlatformUserGroupKey[] = ['crew', 'ops', 'viewer'];

export const PLATFORM_ROLE_LABELS: Record<PlatformUserGroupKey, string> = {
  crew: ROLE_PROFILES.crew.label,
  ops: ROLE_PROFILES.ops.label,
  viewer: ROLE_PROFILES.viewer.label,
};
