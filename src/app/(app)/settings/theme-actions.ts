'use server';

import { prisma } from '@/lib/prisma';
import { authenticateAiRequest } from '@/lib/server/ai-auth';
import { ensureTenantConfigSchema } from '@/lib/server/bootstrap-db';
import { hasHierarchicalPermission } from '@/lib/permission-model';
import { revalidatePath } from 'next/cache';

/**
 * Saves the current theme configuration as the organization default in the database.
 * This will be applied to all users within the same tenant.
 */
export async function saveOrganizationThemeAction(themeConfig: any) {
  try {
    const auth = await authenticateAiRequest();
    
    if (!auth.ok) {
      return { ok: false, error: auth.error };
    }

    // Check permissions (Developer or Admin)
    const role = auth.userProfile.role?.toLowerCase();
    const isDeveloper = role === 'dev' || role === 'developer';
    
    if (!isDeveloper
      && !hasHierarchicalPermission(auth.effectivePermissions, 'admin-settings-edit')
      && !hasHierarchicalPermission(auth.effectivePermissions, 'settings-edit')) {
      return { ok: false, error: 'Unauthorized to update organization branding.' };
    }

    await ensureTenantConfigSchema();

    const tenantId = auth.tenantId;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.tenantConfig.findUnique({
        where: { tenantId },
        select: { data: true },
      });
      const existingData = (existing?.data as Record<string, unknown>) || {};
      const mergedData = {
        ...existingData,
        theme: themeConfig,
      };

      await tx.tenantConfig.upsert({
        where: { tenantId },
        create: {
          tenantId,
          data: mergedData,
        },
        update: {
          data: mergedData,
          updatedAt: new Date(),
        },
      });
    });

    revalidatePath('/');
    
    return { ok: true };
  } catch (error) {
    console.error('[saveOrganizationThemeAction] error:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
