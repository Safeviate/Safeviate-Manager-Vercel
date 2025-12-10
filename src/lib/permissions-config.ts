
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
  // --- General Sections ---
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
  
  // --- Core Features ---
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

  // --- Admin Section ---
  {
    id: 'admin-roles',
    name: 'Admin: Roles',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'admin-permissions',
    name: 'Admin: Permissions',
    actions: ['view'],
  },
  {
    id: 'admin-department',
    name: 'Admin: Departments',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'admin-document-dates',
    name: 'Admin: Document Dates',
    actions: ['view', 'manage'],
  },
  {
    id: 'admin-database',
    name: 'Admin: Database Seeding',
    actions: ['manage'],
  },

  // --- Settings Section ---
  {
    id: 'settings-appearance',
    name: 'Settings: Appearance',
    actions: ['manage'],
  },

  // --- Development Section (for dev environment) ---
  {
    id: 'development',
    name: 'Development Tools',
    actions: ['view'],
  },
];
