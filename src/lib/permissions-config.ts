
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'manage';

export type PermissionResource = {
  id: string;
  name: string;
  actions: PermissionAction[];
};

/**
 * Defines all the granular permissions available in the application.
 * This is the single source of truth for what actions can be performed.
 * The `id` is used to construct the permission string (e.g., 'dashboard-view').
 * The `name` is the user-friendly label for the UI.
 * The `actions` are the specific operations available for that resource.
 */
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
    id: 'users',
    name: 'Users',
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
    id: 'admin-document-dates',
    name: 'Document Dates',
    actions: ['view', 'manage'],
  },
  {
    id: 'admin-database',
    name: 'Database Seeding',
    actions: ['manage'],
  },
  {
    id: 'settings-appearance',
    name: 'Appearance Settings',
    actions: ['edit'],
  },
  {
    id: 'development',
    name: 'Development Tools',
    actions: ['view'],
  },
];
