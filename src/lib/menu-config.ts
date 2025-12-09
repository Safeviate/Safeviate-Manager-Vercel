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
    href: '/management',
    label: 'Management',
    icon: Users,
    subItems: [
      {
        href: '/management/students',
        label: 'Students',
        description: 'Manage student records and progress.',
      },
      {
        href: '/management/instructors',
        label: 'Instructors',
        description: 'Manage instructor profiles and schedules.',
      },
      {
        href: '/management/personnel',
        label: 'Personnel',
        description: 'Manage all other personnel records.',
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
