export type PermissionTier = 'view' | 'create' | 'edit' | 'delete' | 'archive' | 'approve' | 'sign' | 'export' | 'manage';

export type CanonicalPermission = {
  resource: string;
  tier: PermissionTier;
};

const CRUD_TIERS: Array<'view' | 'create' | 'edit' | 'delete'> = ['view', 'create', 'edit', 'delete'];

const LEGACY_TO_CANONICAL: Record<string, CanonicalPermission> = {
  bookings: { resource: 'bookings', tier: 'view' },
  'bookings-view': { resource: 'bookings', tier: 'view' },
  'bookings-schedule-view': { resource: 'bookings', tier: 'view' },
  'bookings-history-view': { resource: 'bookings', tier: 'view' },
  'bookings-edit': { resource: 'bookings', tier: 'edit' },
  'bookings-schedule-manage': { resource: 'bookings', tier: 'edit' },
  'bookings-preflight-manage': { resource: 'bookings', tier: 'edit' },
  'bookings-postflight-manage': { resource: 'bookings', tier: 'edit' },
  'bookings-manage': { resource: 'bookings', tier: 'manage' },
  'bookings-delete': { resource: 'bookings', tier: 'delete' },
  'bookings-approve': { resource: 'bookings', tier: 'approve' },
  'bookings-approve-override': { resource: 'bookings', tier: 'approve' },
  'bookings-techlog-override': { resource: 'bookings', tier: 'manage' },

  'accounting-view': { resource: 'accounting', tier: 'view' },
  'accounting-export': { resource: 'accounting', tier: 'export' },
  'accounting-edit': { resource: 'accounting', tier: 'edit' },
  'accounting-manage': { resource: 'accounting', tier: 'manage' },

  'quality-audits-view': { resource: 'quality-audits', tier: 'view' },
  'quality-audits-view-all': { resource: 'quality-audits', tier: 'edit' },
  'quality-audits-edit': { resource: 'quality-audits', tier: 'edit' },
  'quality-audits-manage': { resource: 'quality-audits', tier: 'manage' },

  'quality-audit-schedule-view': { resource: 'quality-audit-schedule', tier: 'view' },
  'quality-audit-schedule-edit': { resource: 'quality-audit-schedule', tier: 'edit' },
  'quality-audit-schedule-archive': { resource: 'quality-audit-schedule', tier: 'archive' },
  'quality-audit-schedule-manage': { resource: 'quality-audit-schedule', tier: 'manage' },

  'quality-caps-view': { resource: 'quality-caps', tier: 'view' },
  'quality-caps-manage': { resource: 'quality-caps', tier: 'manage' },

  'operations-alerts-view': { resource: 'operations-alerts', tier: 'view' },
  'operations-alerts-create': { resource: 'operations-alerts', tier: 'create' },
  'operations-alerts-edit': { resource: 'operations-alerts', tier: 'edit' },
  'operations-alerts-delete': { resource: 'operations-alerts', tier: 'delete' },

  'operations-erp-view': { resource: 'operations-erp', tier: 'view' },
  'operations-erp-manage': { resource: 'operations-erp', tier: 'manage' },
  'operations-erp-admin': { resource: 'operations-erp', tier: 'manage' },

  'risk-register-view': { resource: 'risk-register', tier: 'view' },
  'risk-register-manage-definitions': { resource: 'risk-register', tier: 'edit' },

  'risk-matrix-view': { resource: 'risk-matrix', tier: 'view' },
  'risk-matrix-manage-definitions': { resource: 'risk-matrix', tier: 'edit' },
  'risk-matrix-edit-colors': { resource: 'risk-matrix', tier: 'edit' },

  'assets-view': { resource: 'assets', tier: 'view' },
  'assets-create': { resource: 'assets', tier: 'create' },
  'assets-edit': { resource: 'assets', tier: 'edit' },
  'assets-delete': { resource: 'assets', tier: 'delete' },

  'maintenance-workpacks-view': { resource: 'maintenance-workpacks', tier: 'view' },
  'maintenance-workpacks-create': { resource: 'maintenance-workpacks', tier: 'create' },
  'maintenance-workpacks-edit': { resource: 'maintenance-workpacks', tier: 'edit' },
  'maintenance-workpacks-delete': { resource: 'maintenance-workpacks', tier: 'delete' },
  'maintenance-workpacks-sign': { resource: 'maintenance-workpacks', tier: 'sign' },
  'maintenance-workpacks-approve': { resource: 'maintenance-workpacks', tier: 'approve' },

  'maintenance-defects-view': { resource: 'maintenance-defects', tier: 'view' },
  'maintenance-defects-create': { resource: 'maintenance-defects', tier: 'create' },
  'maintenance-defects-edit': { resource: 'maintenance-defects', tier: 'edit' },
  'maintenance-defects-delete': { resource: 'maintenance-defects', tier: 'delete' },

  'users-view': { resource: 'users', tier: 'view' },
  'users-create': { resource: 'users', tier: 'create' },
  'users-edit': { resource: 'users', tier: 'edit' },
  'users-delete': { resource: 'users', tier: 'delete' },
};

const CANONICAL_PERMISSION_PATTERN = /^(.*)-(view|create|edit|delete|archive|approve|sign|export|manage)$/;

export function parseCanonicalPermission(permissionId: string): CanonicalPermission | null {
  const legacy = LEGACY_TO_CANONICAL[permissionId];
  if (legacy) return legacy;

  const match = permissionId.match(CANONICAL_PERMISSION_PATTERN);
  if (!match) return null;

  return {
    resource: match[1],
    tier: match[2] as PermissionTier,
  };
}

export function normalizePermissionId(permissionId: string): string | null {
  const canonical = parseCanonicalPermission(permissionId);
  if (!canonical) return null;
  return `${canonical.resource}-${canonical.tier}`;
}

export function normalizePermissionIds(permissionIds: string[] | undefined | null): string[] {
  if (!Array.isArray(permissionIds) || permissionIds.length === 0) return [];
  const normalized = new Set<string>();

  for (const permissionId of permissionIds) {
    if (!permissionId) continue;
    if (permissionId === '*') {
      normalized.add('*');
      continue;
    }
    const isDeny = permissionId.startsWith('!');
    const rawId = isDeny ? permissionId.slice(1) : permissionId;
    const canonical = normalizePermissionId(rawId);
    if (!canonical) continue;
    normalized.add(isDeny ? `!${canonical}` : canonical);
  }

  return Array.from(normalized);
}

/** Converts a legacy full-access grant into explicit CRUD selections for role editors. */
export function expandLegacyManagePermissions(permissionIds: string[] | undefined | null): string[] {
  const expanded = new Set<string>();

  for (const permissionId of normalizePermissionIds(permissionIds)) {
    if (permissionId === '*') {
      expanded.add('*');
      continue;
    }

    const isDeny = permissionId.startsWith('!');
    const canonical = parseCanonicalPermission(isDeny ? permissionId.slice(1) : permissionId);
    if (!canonical || canonical.tier !== 'manage') {
      expanded.add(permissionId);
      continue;
    }

    CRUD_TIERS.forEach((tier) => expanded.add(`${isDeny ? '!' : ''}${canonical.resource}-${tier}`));
  }

  return Array.from(expanded);
}

export function hasHierarchicalPermission(
  grantedPermissionIds: Iterable<string>,
  requestedPermissionId: string,
  deniedPermissionIds?: Iterable<string>,
): boolean {
  const requested = parseCanonicalPermission(requestedPermissionId);
  if (!requested) return false;

  const requestedKey = `${requested.resource}-${requested.tier}`;
  const deniedSet = deniedPermissionIds ? new Set(deniedPermissionIds) : new Set<string>();
  const manageKey = `${requested.resource}-manage`;
  if (deniedSet.has(requestedKey) || (requested.tier !== 'manage' && deniedSet.has(manageKey))) return false;

  const grantedSet = new Set(grantedPermissionIds);
  if (grantedSet.has(manageKey)) return true;

  if (requested.tier === 'manage') {
    return CRUD_TIERS.every((tier) => grantedSet.has(`${requested.resource}-${tier}`));
  }

  if (requested.tier === 'view') {
    return CRUD_TIERS.some((tier) => grantedSet.has(`${requested.resource}-${tier}`));
  }

  for (const grantedPermissionId of grantedSet) {
    const granted = parseCanonicalPermission(grantedPermissionId);
    if (!granted || granted.resource !== requested.resource) continue;
    if (granted.tier === requested.tier) {
      return true;
    }
  }

  return false;
}
