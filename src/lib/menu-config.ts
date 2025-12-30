
import {
  LayoutDashboard,
  Users,
  Settings,
  LucideIcon,
  Code,
  UserCog,
  GaugeCircle,
  PlaneTakeoff,
  AlertTriangle,
  GraduationCap,
  Plane,
  CheckSquare,
  BookCopy,
  Scale,
  ToggleRight,
  BookOpen,
  GitBranch,
  Library,
  LineChart,
  ShieldAlert,
  Map,
  ClipboardList,
  Target,
  ListChecks,
  Network,
  CalendarDays,
  FileJson,
  Table,
} from 'lucide-react';

export type SubMenuItem = {
  href: string;
  label: string;
  description?: string; // Made optional as not all sub-items will have it
};

export type MenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  subItems?: SubMenuItem[];
};

export const menuConfig: MenuItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: GaugeCircle,
  },
  {
    href: '/my-dashboard',
    label: 'My Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/operations',
    label: 'Operations',
    icon: PlaneTakeoff,
    subItems: [
      {
        href: '/operations/bookings',
        label: 'Schedule',
        description: 'View the aircraft booking schedule.',
      },
      {
        href: '/operations/flight-planner',
        label: 'Flight Planner',
        description: 'Create and manage flight plans.',
      },
      {
        href: '/operations/bookings-history',
        label: 'Bookings History',
        description: 'View and manage past bookings.',
      },
    ],
  },
  {
    href: '/safety',
    label: 'Safety',
    icon: AlertTriangle,
    subItems: [
      {
        href: '/safety/safety-reports',
        label: 'Safety Reports',
        description: 'View and manage safety reports.',
      },
      {
        href: '/safety/risk-register',
        label: 'Risk Register',
        description: 'View the organizational risk register.',
      },
      {
        href: '/safety/risk-matrix',
        label: 'Risk Matrix',
        description: 'Visualize the organizational risk landscape.',
      },
      {
        href: '/safety/safety-indicators',
        label: 'Safety Indicators',
        description: 'Track and analyze key safety metrics.',
      },
      {
        href: '/safety/management-of-change',
        label: 'Management of Change',
        description: 'Manage changes to procedures and policies.',
      },
    ],
  },
  {
    href: '/quality',
    label: 'Quality',
    icon: CheckSquare,
    subItems: [
      {
        href: '/quality/audit-schedule',
        label: 'Audit Schedule',
        description: 'Plan and view the annual audit schedule.',
      },
      {
        href: '/quality/audits',
        label: 'Audits',
        description: 'View the quality assurance dashboard.',
      },
      {
        href: '/quality/audit-checklists',
        label: 'Audit Checklists',
        description: 'Manage audit templates.',
      },
      {
        href: '/quality/cap-tracker',
        label: 'CAP Tracker',
        description: 'Track corrective action plans.',
      },
      {
        href: '/quality/task-tracker',
        label: 'Task Tracker',
        description: 'Track all quality-related tasks.',
      },
      {
        href: '/quality/coherence-matrix',
        label: 'Coherence Matrix',
        description: 'Ensure regulatory coherence.',
      },
    ],
  },
  {
    href: '/training',
    label: 'Training',
    icon: GraduationCap,
    subItems: [
      {
        href: '/training/student-debriefs',
        label: 'Student Debriefs',
        description: 'View and manage student progress reports.',
      },
    ],
  },
  {
    href: '/assets',
    label: 'Assets',
    icon: Plane,
    subItems: [
      {
        href: '/assets',
        label: 'Aircraft',
      },
    ],
  },
  {
    href: '/users',
    label: 'Users',
    icon: Users,
    subItems: [
      {
        href: '/users/personnel',
        label: 'Personnel',
      },
      {
        href: '/users/instructors',
        label: 'Instructors',
      },
      {
        href: '/users/students',
        label: 'Students',
      },
      {
        href: '/users/private-pilots',
        label: 'Private Pilots',
      },
    ],
  },
  {
    href: '/admin',
    label: 'Admin',
    icon: UserCog,
    subItems: [
      {
        href: '/admin/roles',
        label: 'Roles',
        description: 'Create and manage user roles.',
      },
      {
        href: '/admin/permissions',
        label: 'Permissions',
        description: 'View all available application permissions.',
      },
      {
        href: '/admin/department',
        label: 'Department',
        description: 'Manage company departments.',
      },
      {
        href: '/admin/document-dates',
        label: 'Document Dates',
        description: 'Manage document expiration dates.',
      },
      {
        href: '/admin/features',
        label: 'Features',
        description: 'Enable or disable application features.',
      },
      {
        href: '/admin/mb-config',
        label: 'M&B Configuration',
        description: 'Configure mass and balance profiles.',
      },
      {
        href: '/admin/database',
        label: 'Database',
        description: 'Manage database seeding and setup.',
      },
    ],
  },
  {
    href: '/development',
    label: 'Development',
    icon: Code,
    subItems: [
      {
        href: '/development/database',
        label: 'Tenant Creator',
        description: 'Create new tenants with custom branding.',
      },
      {
        href: '/development/logbook-parser',
        label: 'Logbook Parser',
        description: 'Parse the structure of a logbook table.',
      },
      {
        href: '/development/table-builder',
        label: 'Table Builder',
        description: 'Create and manipulate table structures.',
      },
    ],
  },
];

export const settingsMenuItem: MenuItem = {
  href: '/settings',
  label: 'Settings',
  icon: Settings,
  subItems: [
    {
      href: '/settings/appearance',
      label: 'Appearance',
      description: '',
    },
  ],
};
