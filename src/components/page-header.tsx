import type { FC, ReactNode } from 'react';
import { CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const HEADER_ACTION_BUTTON_CLASS =
  "h-10 px-4 py-2 text-sm font-medium shadow-md gap-2 shrink-0 rounded-md transition-transform hover:scale-[1.02] active:scale-[0.98]";

export const HEADER_SECONDARY_BUTTON_CLASS =
  "h-10 px-4 py-2 text-sm font-medium shadow-sm gap-2 shrink-0 rounded-md border border-[hsl(var(--header-button-border))] bg-[hsl(var(--header-button-background))] text-[hsl(var(--header-button-foreground))] transition-transform hover:bg-[hsl(var(--header-button-hover))] hover:text-[hsl(var(--header-button-foreground))] hover:scale-[1.02] active:scale-[0.98]";

export const HEADER_MOBILE_ACTION_BUTTON_CLASS =
  "h-10 w-full justify-between border-[hsl(var(--header-button-border))] bg-[hsl(var(--header-button-background))] px-4 py-2 text-sm font-medium text-[hsl(var(--header-button-foreground))] shadow-sm hover:bg-[hsl(var(--header-button-hover))]";

export const HEADER_TAB_LIST_CLASS =
  "bg-transparent h-auto p-0 gap-1.5 border-0 rounded-md justify-start flex min-w-max flex-nowrap shadow-none";

export const HEADER_TAB_TRIGGER_CLASS =
  "h-8 rounded-md px-3 text-[9px] font-medium uppercase tracking-[0.08em] transition-all shadow-none border border-input gap-1.5 shrink-0 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none";

const DEFAULT_HEADER_DESCRIPTIONS: Record<string, string> = {
  'Flight Billing': 'Review completed flights ready for billing and export.',
  'Flight Billing (Admin)': 'Review billing records, exports, and financial totals.',
  Departments: 'Create and maintain company departments.',
  'Threshold & Expiry': 'Set document expiry thresholds and warning windows.',
  'Exam Topics': 'Manage the subject list used across exams and the question bank.',
  'Feature Management': 'Control tenant features, module access, and finding levels.',
  'Mass & Balance Configurator': 'Build and maintain aircraft mass and balance profiles.',
  'Safety Monitor Thresholds': 'Configure the alert limits used by the safety monitor.',
  Permissions: 'Review the permission catalog available in the app.',
  Roles: 'Create roles and assign the permissions they can use.',
  'Bookings History': 'Review past bookings and completed activity.',
  'Daily Schedule': 'Plan and monitor resource bookings for the day.',
  'My Logbook': 'Track your personal logbook entries and records.',
  Messages: 'See your latest messages and discussions.',
  'My Outstanding Tasks': 'Review tasks assigned to you and follow up on due items.',
  'Operations Alerts': 'View and manage critical operational alerts.',
  'Emergency Response Plan': 'Manage emergency contacts, triggers, and response records.',
  'Route Planner': 'Manage standardized and general aviation flight paths.',
  'Training Routes': 'Manage standardized training flight paths and sectors.',
  'Annual Audit Schedule': 'Plan and track the annual audit program.',
  Audits: 'Review audit results and follow-up status.',
  'Coherence Matrix': 'Compare requirements, policies, and procedures for alignment.',
  'Risk Matrix': 'Visualize risk likelihood and severity across the organization.',
  'Question Bank Manager': 'Manage aviation questions and organize them by topic.',
  'Student Progress': 'Track student progress and open individual reports.',
  'Access Overview': 'See which modules each role can access.',
};

interface MainPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Shared supporting header for pages that already expose the title in the app top bar.
 * Keep this strip slim and use it for secondary description text and in-page actions.
 */
export const MainPageHeader: FC<MainPageHeaderProps> = ({
  title,
  description,
  actions,
  className
}) => {
  const hasExplicitDescription = description !== undefined;
  const resolvedDescription = hasExplicitDescription
    ? description?.trim()
    : DEFAULT_HEADER_DESCRIPTIONS[title] || 'Overview of this section.';

  return (
    <div className={cn("main-page-header flex w-full shrink-0 flex-col border-b bg-muted/5", className)}>
      <CardHeader className="main-page-header__header flex flex-col gap-2 px-3 py-2 md:px-4 md:py-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          {resolvedDescription ? (
            <p className="main-page-header__description text-[10px] font-medium text-muted-foreground sm:text-xs">
              {resolvedDescription}
            </p>
          ) : null}
        </div>

        {actions && (
          <div className="flex w-full flex-wrap items-center gap-1.5 lg:w-auto [&_button]:h-8 [&_button]:gap-1.5 [&_button]:px-3 [&_button]:text-[9px] [&_button]:tracking-[0.08em] [&_a]:h-8 [&_a]:gap-1.5 [&_a]:px-3 [&_a]:text-[9px] [&_a]:tracking-[0.08em]">
            {actions}
          </div>
        )}
      </CardHeader>
    </div>
  );
};

export default MainPageHeader;
