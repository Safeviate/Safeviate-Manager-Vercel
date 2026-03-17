import {
  LayoutDashboard,
  Users,
  LucideIcon,
  Code,
  UserCog,
  GaugeCircle,
  PlaneTakeoff,
  AlertTriangle,
  GraduationCap,
  Plane,
  CheckSquare,
  CalendarDays,
  ShieldAlert,
} from 'lucide-react';

export type SubMenuItem = {
  href: string;
  label: string;
  description?: string;
  permissionId?: string;
};

export type MenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permissionId?: string;
  subItems?: SubMenuItem[];
};

export const menuConfig: MenuItem[] = [
  {
    href: '/dashboard',
    label: 'Company Dashboard',
    icon: GaugeCircle,
    permissionId: 'dashboard-view',
  },
  {
    href: '/my-dashboard',
    label: 'My Dashboard',
    icon: LayoutDashboard,
    permissionId: 'my-dashboard-view',
  },
  {
    href: '/bookings',
    label: 'Bookings',
    icon: CalendarDays,
    permissionId: 'bookings-view',
    subItems: [
      {
        href: '/bookings/history',
        label: 'History',
        description: 'View past bookings and logs.',
        permissionId: 'bookings-history-view',
      },
      {
        href: '/bookings/schedule',
        label: 'Daily Schedule',
        description: 'View and manage resource bookings.',
        permissionId: 'bookings-schedule-view',
      },
    ],
  },
  {
    href: '/operations',
    label: 'Operations',
    icon: PlaneTakeoff,
    permissionId: 'operations-view',
    subItems: [
      {
        href: '/operations/alerts',
        label: 'Alerts',
        description: 'View and manage critical system alerts.',
        permissionId: 'operations-alerts-view',
      },
      {
        href: '/operations/emergency-response',
        label: 'Emergency Response Plan',
        description: 'Manage emergency contacts, triggers, and live response diaries.',
        permissionId: 'operations-view',
      },
    ],
  },
  {
    href: '/safety',
    label: 'Safety',
    icon: AlertTriangle,
    permissionId: 'safety-view',
    subItems: [
      {
        href: '/safety/management-of-change',
        label: 'Management of Change',
        description: 'Manage changes to procedures and policies.',
        permissionId: 'moc-manage',
      },
      {
        href: '/safety/risk-matrix',
        label: 'Risk Matrix',
        description: 'Visualize the organizational risk landscape.',
        permissionId: 'risk-matrix-view',
      },
      {
        href: '/safety/risk-register',
        label: 'Risk Register',
        description: 'View the organizational risk register.',
        permissionId: 'risk-register-view',
      },
      {
        href: '/safety/safety-indicators',
        label: 'Safety Indicators',
        description: 'Track and analyze key safety metrics.',
        permissionId: 'safety-indicators-view',
      },
      {
        href: '/safety/safety-reports',
        label: 'Safety Reports',
        description: 'View and manage safety reports.',
        permissionId: 'safety-reports-manage',
      },
    ],
  },
  {
    href: '/quality',
    label: 'Quality',
    icon: CheckSquare,
    permissionId: 'quality-view',
    subItems: [
      {
        href: '/quality/audit-checklists',
        label: 'Audit Checklists',
        description: 'Manage audit templates.',
        permissionId: 'quality-templates-manage',
      },
      {
        href: '/quality/audit-schedule',
        label: 'Audit Schedule',
        description: 'Plan and view the annual audit schedule.',
        permissionId: 'quality-audits-manage',
      },
      {
        href: '/quality/audits',
        label: 'Audits',
        description: 'View the quality assurance dashboard.',
        permissionId: 'quality-audits-view',
      },
      {
        href: '/quality/coherence-matrix',
        label: 'Coherence Matrix',
        description: 'Ensure regulatory coherence.',
        permissionId: 'quality-matrix-manage',
      },
      {
        href: '/quality/task-tracker',
        label: 'Task Tracker',
        description: 'Track all quality-related tasks.',
        permissionId: 'quality-tasks-view',
      },
    ],
  },
  {
    href: '/training',
    label: 'Training',
    icon: GraduationCap,
    permissionId: 'training-view',
    subItems: [
      {
        href: '/training/student-progress',
        label: 'Student Progress',
        description: 'View and manage student progress reports.',
        permissionId: 'training-debriefs-view',
      },
    ],
  },
  {
    href: '/assets',
    label: 'Assets',
    icon: Plane,
    permissionId: 'assets-view',
    subItems: [
      {
        href: '/assets/aircraft',
        label: 'Aircraft',
        description: 'Manage all aircraft in your fleet.',
        permissionId: 'assets-view',
      },
    ],
  },
  {
    href: '/users',
    label: 'Users',
    icon: Users,
    permissionId: 'users-view',
    subItems: [
      {
        href: '/users/external',
        label: 'External',
        permissionId: 'users-view',
      },
      {
        href: '/users/instructors',
        label: 'Instructors',
        permissionId: 'users-view',
      },
      {
        href: '/users/personnel',
        label: 'Personnel',
        permissionId: 'users-view',
      },
      {
        href: '/users/private-pilots',
        label: 'Private Pilots',
        permissionId: 'users-view',
      },
      {
        href: '/users/students',
        label: 'Students',
        permissionId: 'users-view',
      },
    ],
  },
  {
    href: '/admin',
    label: 'Admin',
    icon: UserCog,
    permissionId: 'admin-view',
    subItems: [
      {
        href: '/admin/appearance',
        label: 'Appearance',
        description: 'Customize application branding and theme colors.',
        permissionId: 'admin-settings-manage',
      },
      {
        href: '/admin/database',
        label: 'Database',
        description: 'Manage database seeding and setup.',
        permissionId: 'admin-database-manage',
      },
      {
        href: '/admin/department',
        label: 'Department',
        description: 'Manage company departments.',
        permissionId: 'admin-departments-manage',
      },
      {
        href: '/admin/document-dates',
        label: 'Document Expiration',
        description: 'Manage document expiration and inspection warnings.',
        permissionId: 'admin-settings-manage',
      },
      {
        href: '/admin/external',
        label: 'External Companies',
        description: 'Manage external companies for auditing and scoping.',
        permissionId: 'admin-external-orgs-manage',
      },
      {
        href: '/admin/features',
        label: 'Features',
        description: 'Enable or disable application features.',
        permissionId: 'admin-settings-manage',
      },
      {
        href: '/admin/mb-config',
        label: 'M&B Configuration',
        description: 'Configure mass and balance profiles.',
        permissionId: 'admin-settings-manage',
      },
      {
        href: '/admin/permissions',
        label: 'Permissions',
        description: 'View all available application permissions.',
        permissionId: 'admin-permissions-view',
      },
      {
        href: '/admin/roles',
        label: 'Roles',
        description: 'Create and manage user roles.',
        permissionId: 'admin-roles-manage',
      },
    ],
  },
  {
    href: '/development',
    label: 'Development',
    icon: Code,
    permissionId: 'development-view',
    subItems: [
      {
        href: '/development/database',
        label: 'Database Seeder',
        description: 'Manage database seeding and setup.',
        permissionId: 'development-view',
      },
      {
        href: '/development/logbook-parser',
        label: 'Logbook Parser',
        description: 'Parse the structure of a logbook table.',
        permissionId: 'development-view',
      },
      {
        href: '/development/table-builder',
        label: 'Table Builder',
        description: 'Create and manipulate table structures.',
        permissionId: 'development-view',
      },
    ],
  },
];