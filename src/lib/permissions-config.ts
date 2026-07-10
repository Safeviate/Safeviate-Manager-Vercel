export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'sign' | 'export';

export type PermissionResource = {
  id: string;
  name: string;
  actions: PermissionAction[];
  hidden?: boolean;
  description?: string;
};

/**
 * Defines all the granular permissions available in the application.
 */
const CRUD_ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete'];

export const permissionsConfig: PermissionResource[] = [
  { id: 'dashboard', name: 'Dashboard', actions: ['view'] },
  { id: 'my-dashboard', name: 'My Dashboard', actions: ['view'] },
  
  { id: 'operations', name: 'Operations', actions: ['view'] },
  { id: 'operations-alerts', name: 'Alerts', actions: CRUD_ACTIONS },
  { id: 'operations-documents', name: 'Company Documents', actions: CRUD_ACTIONS },
  { id: 'operations-erp', name: 'Emergency Response Plan', actions: CRUD_ACTIONS },
  
  {
    id: 'bookings',
    name: 'Bookings',
    actions: [...CRUD_ACTIONS, 'approve'],
    description: 'Schedule access also respects aircraft service-block rules, so red 50h/100h warnings prevent new flight bookings until hours are updated.',
  },

  { id: 'accounting', name: 'Accounting & Billing', actions: [...CRUD_ACTIONS, 'export'] },

  { id: 'safety', name: 'Safety', actions: ['view'] },
  { id: 'safety-reports', name: 'Safety Reports', actions: CRUD_ACTIONS },
  { id: 'risk-register', name: 'Risk Register', actions: CRUD_ACTIONS },
  { id: 'risk-matrix', name: 'Risk Matrix', actions: CRUD_ACTIONS },
  { id: 'safety-indicators', name: 'Safety Indicators', actions: ['view'] },
  { id: 'moc', name: 'Management of Change', actions: CRUD_ACTIONS },

  { id: 'quality', name: 'Quality', actions: ['view'] },
  { id: 'quality-audits', name: 'Audits', actions: [...CRUD_ACTIONS, 'sign'] },
  { id: 'quality-audit-schedule', name: 'Audit Schedule', actions: CRUD_ACTIONS },
  { id: 'quality-templates', name: 'Quality Templates', actions: CRUD_ACTIONS, hidden: true },
  { id: 'quality-caps', name: 'Quality CAPs', actions: CRUD_ACTIONS, hidden: true },
  { id: 'quality-tasks', name: 'Task Tracker', actions: ['view'] },
  { id: 'quality-matrix', name: 'Coherence Matrix', actions: CRUD_ACTIONS },
  { id: 'quality-risk-plan', name: 'Quality Risk Plan', actions: CRUD_ACTIONS },

  { id: 'training', name: 'Training', actions: ['view'] },
  { id: 'training-debriefs', name: 'Student Progress', actions: CRUD_ACTIONS },
  { id: 'training-exams', name: 'Exams', actions: CRUD_ACTIONS },
  { id: 'training-student-instructors', name: 'Student Instructor Assignments', actions: CRUD_ACTIONS, hidden: true },
  { id: 'training-student-progression', name: 'Student Progression Decisions', actions: CRUD_ACTIONS, hidden: true },

  { id: 'assets', name: 'Aircraft', actions: CRUD_ACTIONS },

  { id: 'maintenance', name: 'Maintenance', actions: CRUD_ACTIONS },
  { id: 'maintenance-workpacks', name: 'Workpacks', actions: [...CRUD_ACTIONS, 'approve', 'sign'] },
  { id: 'maintenance-defects', name: 'Defect Reports', actions: CRUD_ACTIONS },
  { id: 'maintenance-schedule', name: 'Maintenance Schedule', actions: CRUD_ACTIONS },

  { id: 'users', name: 'Users', actions: CRUD_ACTIONS },

  { id: 'admin', name: 'Admin', actions: ['view'] },
  { id: 'admin-roles', name: 'Roles', actions: CRUD_ACTIONS },
  { id: 'admin-permissions', name: 'Permissions List', actions: ['view', 'edit'] },
  { id: 'admin-departments', name: 'Department', actions: CRUD_ACTIONS },
  { id: 'admin-external-orgs', name: 'External Companies', actions: CRUD_ACTIONS },
  { id: 'admin-settings', name: 'Admin Settings', actions: ['view', 'edit'] },
  { id: 'admin-database', name: 'Database Management', actions: ['view', 'edit'] },

  { id: 'settings', name: 'Theme & Branding', actions: ['view', 'edit'], hidden: true },
  { id: 'development', name: 'Development', actions: ['view'] },
];
