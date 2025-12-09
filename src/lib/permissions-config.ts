
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export type PermissionResource = {
  id: string;
  name: string;
  actions: PermissionAction[];
};

export const permissionsConfig: PermissionResource[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    actions: ['view'],
  },
  {
    id: 'my-dashboard',
    name: 'My Dashboard',
    actions: ['view'],
  },
  {
    id: 'operations-maintenance',
    name: 'Maintenance',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'operations-safety',
    name: 'Safety & Quality',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'training',
    name: 'Training',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'assets',
    name: 'Assets',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'users-students',
    name: 'Students',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'users-instructors',
    name: 'Instructors',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'users-personnel',
    name: 'Personnel',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'admin-roles',
    name: 'Roles',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'admin-permissions',
    name: 'Permissions',
    actions: ['view'],
  },
  {
    id: 'admin-department',
    name: 'Departments',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'settings-appearance',
    name: 'Appearance Settings',
    actions: ['edit'],
  }
];
