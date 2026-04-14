import type { IndustryType } from '@/types/quality';

export const DEVELOPMENT_TENANT_ID = 'safeviate';

const AVIATION_ONLY_PREFIXES: string[] = [];
const FLIGHT_OPS_PREFIXES = ['/bookings', '/operations/bookings', '/operations/booking-history'];
const MAINTENANCE_PREFIXES = ['/maintenance'];

const AVIATION_ONLY_EXACT_HREFS = new Set(['/assets/aircraft']);
const FLIGHT_OPS_EXACT_HREFS = new Set([
  '/admin/mb-config',
  '/assets/mass-balance',
  '/operations/weather',
  '/operations/active-flight',
  '/operations/fleet-tracker',
  '/operations/flight-planner',
  '/operations/training-routes',
]);
const MAINTENANCE_EXACT_HREFS = new Set<string>([]);

export const isAviationIndustry = (industry?: string | null) => industry?.startsWith('Aviation') ?? true;

export const isFlightTrainingIndustry = (industry?: IndustryType | string | null) =>
  industry === 'Aviation: Flight Training (ATO)';

export const isFlightOpsIndustry = (industry?: IndustryType | string | null) =>
  industry === 'Aviation: Flight Training (ATO)' || industry === 'Aviation: Charter / Ops (AOC)';

export const isMaintenanceIndustry = (industry?: IndustryType | string | null) =>
  isAviationIndustry(industry);

const matchesPrefix = (href: string, prefixes: string[]) => prefixes.some((prefix) => href.startsWith(prefix));

export const isAviationOnlyHref = (href: string) =>
  matchesPrefix(href, AVIATION_ONLY_PREFIXES) || AVIATION_ONLY_EXACT_HREFS.has(href);

export const isFlightOpsHref = (href: string) =>
  matchesPrefix(href, FLIGHT_OPS_PREFIXES) || FLIGHT_OPS_EXACT_HREFS.has(href);

export const isMaintenanceHref = (href: string) =>
  matchesPrefix(href, MAINTENANCE_PREFIXES) || MAINTENANCE_EXACT_HREFS.has(href);

export const isHrefEnabledForIndustry = (href: string, industry?: IndustryType | string | null) => {
  if (isFlightOpsHref(href)) return isFlightOpsIndustry(industry);
  if (isMaintenanceHref(href)) return isMaintenanceIndustry(industry);
  if (isAviationOnlyHref(href)) return isAviationIndustry(industry);
  return true;
};

export const shouldBypassIndustryRestrictions = (tenantId?: string | null) =>
  tenantId === DEVELOPMENT_TENANT_ID;
