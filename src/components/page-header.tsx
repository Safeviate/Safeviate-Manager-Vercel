import type { FC, ReactNode } from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const HEADER_ACTION_BUTTON_CLASS =
  "h-10 px-4 py-2 text-sm font-medium shadow-md gap-2 shrink-0 rounded-md transition-transform hover:scale-[1.02] active:scale-[0.98]";

export const HEADER_SECONDARY_BUTTON_CLASS =
  "h-10 px-4 py-2 text-sm font-medium shadow-sm gap-2 shrink-0 rounded-md border border-[hsl(var(--header-button-border))] bg-[hsl(var(--header-button-background))] text-[hsl(var(--header-button-foreground))] transition-transform hover:bg-[hsl(var(--header-button-hover))] hover:text-[hsl(var(--header-button-foreground))] hover:scale-[1.02] active:scale-[0.98]";

export const HEADER_MOBILE_ACTION_BUTTON_CLASS =
  "h-10 w-full justify-between border-[hsl(var(--header-button-border))] bg-[hsl(var(--header-button-background))] px-4 py-2 text-sm font-medium text-[hsl(var(--header-button-foreground))] shadow-sm hover:bg-[hsl(var(--header-button-hover))]";

export const HEADER_TAB_LIST_CLASS =
  "bg-transparent h-auto p-0 gap-2 border-0 rounded-md justify-start flex min-w-max flex-nowrap shadow-none";

export const HEADER_TAB_TRIGGER_CLASS =
  "h-10 rounded-md px-4 text-sm font-medium transition-all shadow-none border border-input gap-2 shrink-0 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none";

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
 * Standardized MainPageHeader as per UI Source of Truth.
 * Layout: flex flex-col lg:flex-row lg:items-center lg:justify-between
 * Title: text-xl sm:text-2xl font-black uppercase truncate font-headline
 * Description: text-xs sm:text-sm font-medium text-muted-foreground
 */
export const MainPageHeader: FC<MainPageHeaderProps> = ({
  title,
  description,
  actions,
  className
}) => {
  const resolvedDescription = description?.trim() || DEFAULT_HEADER_DESCRIPTIONS[title] || 'Overview of this section.';

  return (
    <div className={cn("flex flex-col w-full shrink-0 border-b bg-muted/5", className)}>
      <CardHeader
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 md:p-6 gap-4"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle className="text-xl sm:text-2xl font-black uppercase truncate font-headline tracking-tight">
            {title}
          </CardTitle>
          {resolvedDescription ? (
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              {resolvedDescription}
            </p>
          ) : null}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto mt-2 lg:mt-0">
            {actions}
          </div>
        )}
      </CardHeader>
    </div>
  );
};

export default MainPageHeader;
