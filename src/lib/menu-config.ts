
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
    ],
  },
  {
    href: '/quality',
    label: 'Quality',
    icon: CheckSquare,
  },
  {
    href: '/training',
    label: 'Training',
    icon: GraduationCap,
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
      {
        href: '/assets/mass-balance',
        label: 'Mass & Balance',
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
