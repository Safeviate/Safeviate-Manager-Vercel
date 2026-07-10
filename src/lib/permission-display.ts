import type { PermissionAction } from '@/lib/permissions-config';

export type PermissionDisplayLabel = 'View' | 'Create' | 'Edit' | 'Delete' | 'Approve' | 'Sign' | 'Export';

export function getPermissionDisplayLabel(action: PermissionAction): PermissionDisplayLabel {
  switch (action) {
    case 'view': return 'View';
    case 'create': return 'Create';
    case 'edit': return 'Edit';
    case 'delete': return 'Delete';
    case 'approve': return 'Approve';
    case 'sign': return 'Sign';
    case 'export': return 'Export';
  }
}
