export const COMPANY_DASHBOARD_VIEWS = [
  'overview',
  'flight-operations',
  'training',
  'safety',
  'quality',
] as const;

export type CompanyDashboardView = (typeof COMPANY_DASHBOARD_VIEWS)[number];
export type ConfigurableCompanyDashboardView = Exclude<CompanyDashboardView, 'overview'>;

export type CompanyDashboardSettings = {
  id: 'company-dashboard';
  enabledViews: CompanyDashboardView[];
  defaultView: CompanyDashboardView;
};

export const COMPANY_DASHBOARD_VIEW_OPTIONS: Array<{
  value: ConfigurableCompanyDashboardView;
  label: string;
  description: string;
}> = [
  { value: 'flight-operations', label: 'Flight Operations', description: 'Aircraft, booking, and fleet activity.' },
  { value: 'training', label: 'Training', description: 'Instructor workload and student progress.' },
  { value: 'safety', label: 'Safety', description: 'Safety reports, risks, and management of change.' },
  { value: 'quality', label: 'Quality', description: 'Audits and corrective action plans.' },
];

export const DEFAULT_COMPANY_DASHBOARD_SETTINGS: CompanyDashboardSettings = {
  id: 'company-dashboard',
  enabledViews: [...COMPANY_DASHBOARD_VIEWS],
  defaultView: 'overview',
};

const isDashboardView = (value: unknown): value is CompanyDashboardView =>
  typeof value === 'string' && COMPANY_DASHBOARD_VIEWS.includes(value as CompanyDashboardView);

export function normalizeCompanyDashboardSettings(value: unknown): CompanyDashboardSettings {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  // Existing layout settings can use the same `enabledViews` key without being
  // the Company Dashboard configuration. Only this versioned shape opts a
  // tenant into a restricted dashboard; all older tenants retain every module.
  if (source.id !== 'company-dashboard') {
    return { ...DEFAULT_COMPANY_DASHBOARD_SETTINGS, enabledViews: [...DEFAULT_COMPANY_DASHBOARD_SETTINGS.enabledViews] };
  }
  const requestedViews = Array.isArray(source.enabledViews) ? source.enabledViews.filter(isDashboardView) : [];
  const requestedWithOverview = requestedViews.includes('overview') ? requestedViews : ['overview', ...requestedViews];
  const enabledViews = COMPANY_DASHBOARD_VIEWS.filter((view) => requestedWithOverview.includes(view));
  const defaultView = isDashboardView(source.defaultView) && enabledViews.includes(source.defaultView)
    ? source.defaultView
    : 'overview';

  return {
    id: 'company-dashboard',
    enabledViews: enabledViews.length ? enabledViews : [...DEFAULT_COMPANY_DASHBOARD_SETTINGS.enabledViews],
    defaultView,
  };
}

export function getCompanyDashboardDataRequirements(value: unknown) {
  const settings = normalizeCompanyDashboardSettings(value);
  const enabledViews = new Set(settings.enabledViews);
  const hasFlightOperations = enabledViews.has('flight-operations');
  const hasTraining = enabledViews.has('training');
  const hasSafety = enabledViews.has('safety');
  const hasQuality = enabledViews.has('quality');

  return {
    aircrafts: hasFlightOperations,
    bookings: hasFlightOperations || hasTraining,
    personnel: hasTraining,
    attendance: hasTraining,
    managementOfChange: hasSafety,
    safetyReports: hasSafety,
    technicalReports: hasSafety,
    risks: hasSafety,
    qualityAudits: hasQuality,
    correctiveActionPlans: hasQuality,
  };
}
