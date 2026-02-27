export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'manage' | 'manage-templates' | 'calculate-booking';

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
  { id: 'operations', name: 'Operations', actions: ['view'] },
  { id: 'operations-alerts', name: 'Operations Alerts', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'operations-bookings', name: 'Operations Bookings', actions: ['view', 'manage'] },

  { id: 'safety', name: 'Safety', actions: ['view'] },
  { id: 'safety-reports', name: 'Safety Reports', actions: ['manage'] },
  { id: 'risk-register', name: 'Risk Register', actions: ['view'] },
  { id: 'risk-matrix', name: 'Risk Matrix', actions: ['view'] },
  { id: 'safety-indicators', name: 'Safety Indicators', actions: ['view'] },
  { id: 'moc', name: 'Management of Change', actions: ['manage'] },

  { id: 'quality', name: 'Quality', actions: ['view'] },
  { id: 'quality-audits', name: 'Quality Audits', actions: ['view', 'manage'] },
  { id: 'quality-templates', name: 'Quality Templates', actions: ['manage'] },
  { id: 'quality-caps', name: 'Quality CAPs', actions: ['view'] },
  { id: 'quality-tasks', name: 'Quality Tasks', actions: ['view'] },
  { id: 'quality-matrix', name: 'Quality Coherence Matrix', actions: ['manage'] },

  { id: 'training', name: 'Training', actions: ['view'] },
  { id: 'training-debriefs', name: 'Training: Student Debriefs', actions: ['view', 'edit'] },

  { id: 'assets', name: 'Assets: Aircraft', actions: ['view', 'create', 'edit', 'delete'] },

  { id: 'users', name: 'Users', actions: ['view', 'create', 'edit', 'delete'] },

  // --- Admin Section ---
  { id: 'admin', name: 'Admin', actions: ['view'] },
  { id: 'admin-roles', name: 'Admin: Roles', actions: ['manage'] },
  { id: 'admin-permissions', name: 'Admin: Permissions', actions: ['view', 'manage'] },
  { id: 'admin-departments', name: 'Admin: Departments', actions: ['manage'] },
  { id: 'admin-settings', name: 'Admin: General Settings', actions: ['manage'] },
  { id: 'admin-database', name: 'Admin: Database Seeding', actions: ['manage'] },

  // --- Settings Section ---
  {
    id: 'settings',
    name: 'Settings',
    actions: ['manage'],
  },

  // --- Development Section (for dev environment) ---
  {
    id: 'development',
    name: 'Development Tools',
    actions: ['view'],
  },
];
