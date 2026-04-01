import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '@/lib/server/firebase-admin';

type FirestoreUserLink = {
  profilePath?: string;
};

type FirestoreRole = {
  permissions?: string[];
};

type FirestoreUserProfile = {
  id?: string;
  role?: string;
  permissions?: string[];
};

type FlowPermissionRule = {
  anyOf: string[];
};

export const aiFlowPermissions: Record<string, FlowPermissionRule> = {
  analyzeMoc: { anyOf: ['moc-manage'] },
  generateChecklist: { anyOf: ['quality-templates-manage', 'quality-audits-manage'] },
  generateExam: { anyOf: ['training-exams-manage'] },
  generateSafetyProtocolRecommendations: { anyOf: ['safety-view', 'safety-reports-manage'] },
  parseLogbook: { anyOf: ['development-view'] },
  summarizeDocument: { anyOf: ['operations-documents-manage', 'quality-view', 'safety-view'] },
  summarizeMaintenanceLogs: { anyOf: ['assets-view', 'assets-edit'] },
};

function extractBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authorizationHeader.slice('Bearer '.length).trim();
}

export async function authenticateAiRequest(request: Request) {
  const token = extractBearerToken(request.headers.get('authorization'));
  if (!token) {
    return { ok: false as const, status: 401, error: 'Missing authorization token.' };
  }

  try {
    const auth = getFirebaseAdminAuth();
    const firestore = getFirebaseAdminFirestore();
    const decodedToken = await auth.verifyIdToken(token);

    const userLinkSnapshot = await firestore.doc(`users/${decodedToken.uid}`).get();
    const userLink = userLinkSnapshot.data() as FirestoreUserLink | undefined;

    if (!userLink?.profilePath) {
      return { ok: false as const, status: 403, error: 'No profile is linked to this account.' };
    }

    const userProfileSnapshot = await firestore.doc(userLink.profilePath).get();
    const userProfile = userProfileSnapshot.data() as FirestoreUserProfile | undefined;

    if (!userProfile) {
      return { ok: false as const, status: 403, error: 'The linked profile could not be found.' };
    }

    const profilePathParts = userLink.profilePath.split('/');
    const tenantId = profilePathParts[0] === 'tenants' ? profilePathParts[1] ?? null : null;

    const roleId = userProfile.role;
    const roleSnapshot = roleId && tenantId
      ? await firestore.doc(`tenants/${tenantId}/roles/${roleId}`).get()
      : null;
    const role = roleSnapshot?.data() as FirestoreRole | undefined;

    const inheritedPermissions = role?.permissions ?? [];
    const overridePermissions = userProfile.permissions ?? [];
    const deniedPermissions = new Set(
      overridePermissions.filter((permission) => permission.startsWith('!')).map((permission) => permission.slice(1))
    );
    const effectivePermissions = new Set<string>();

    inheritedPermissions.forEach((permission) => {
      if (!deniedPermissions.has(permission)) {
        effectivePermissions.add(permission);
      }
    });

    overridePermissions.forEach((permission) => {
      if (!permission.startsWith('!')) {
        effectivePermissions.add(permission);
      }
    });

    return {
      ok: true as const,
      decodedToken,
      tenantId,
      userProfile,
      effectivePermissions,
    };
  } catch (error) {
    return { ok: false as const, status: 401, error: 'Authentication failed.' };
  }
}

export function isAuthorizedForAiFlow(flow: string, userProfile: FirestoreUserProfile, effectivePermissions: Set<string>) {
  const role = userProfile.role?.toLowerCase();
  if (role === 'dev' || role === 'developer') {
    return true;
  }

  const rule = aiFlowPermissions[flow];
  if (!rule) return false;

  return rule.anyOf.some((permission) => effectivePermissions.has(permission));
}
