
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
        href: '/operations/maintenance',
        label: 'Maintenance',
        description: 'Track and manage aircraft maintenance.',
      },
      {
        href: '/operations/bookings',
        label: 'Bookings',
        description: 'Schedule and manage aircraft bookings.',
      },
    ],
  },
  {
    href: '/safety',
    label: 'Safety',
    icon: AlertTriangle,
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
            href: '/users/private-pilots',
            label: 'Private Pilots',
        },
        {
            href: '/users/students',
            label: 'Students',
        }
    ]
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
          href: '/development/test',
          label: 'Test Page',
          description: 'A test page for development purposes.'
        }
    ]
  }
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
