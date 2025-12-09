import {
  LayoutDashboard,
  Users,
  Wrench,
  Settings,
  LucideIcon,
  Palette,
  Shield,
  User,
  GraduationCap,
  Package,
  Database,
  Code,
} from 'lucide-react';

export type SubMenuItem = {
  href: string;
  label: string;
  description: string;
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
    icon: LayoutDashboard,
  },
  {
    href: '/my-dashboard',
    label: 'My Dashboard',
    icon: User,
  },
  {
    href: '/operations',
    label: 'Operations',
    icon: Wrench,
    subItems: [
      {
        href: '/operations/maintenance',
        label: 'Maintenance',
        description: 'Track and manage aircraft maintenance.',
      },
      {
        href: '/operations/safety',
        label: 'Safety & Quality',
        description: 'Oversee safety protocols and quality assurance.',
      },
    ],
  },
  {
    href: '/training',
    label: 'Training',
    icon: GraduationCap,
  },
  {
    href: '/assets',
    label: 'Assets',
    icon: Package,
  },
  {
    href: '/users',
    label: 'Users',
    icon: Users,
    subItems: [
      {
        href: '/users/students',
        label: 'Students',
        description: 'Manage student records and progress.',
      },
      {
        href: '/users/instructors',
        label: 'Instructors',
        description: 'Manage instructor profiles and schedules.',
      },
      {
        href: '/users/personnel',
        label: 'Personnel',
        description: 'Manage all other personnel records.',
      },
    ],
  },
  {
    href: '/admin',
    label: 'Admin',
    icon: Shield,
  },
  {
    href: '/development',
    label: 'Development',
    icon: Code,
    subItems: [
        {
            href: '/development/database',
            label: 'Database',
            description: 'Manage database seeding and setup.',
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
