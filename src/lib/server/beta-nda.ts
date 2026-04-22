import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { BETA_NDA_AGREEMENT_TEXT, BETA_NDA_VERSION } from '@/lib/beta-nda-content';

export { BETA_NDA_AGREEMENT_TEXT, BETA_NDA_VERSION } from '@/lib/beta-nda-content';

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export async function hasAcceptedBetaNda(tenantId: string, email: string): Promise<boolean> {
  const normalizedTenantId = tenantId.trim() || 'safeviate';
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;

  const acceptance = await prisma.betaNdaAcceptance.findUnique({
    where: {
      tenantId_email_ndaVersion: {
        tenantId: normalizedTenantId,
        email: normalizedEmail,
        ndaVersion: BETA_NDA_VERSION,
      },
    },
    select: { id: true },
  });

  return Boolean(acceptance);
}

export type RecordBetaNdaAcceptanceInput = {
  tenantId: string;
  email: string;
  name: string;
  signatureDataUrl: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function recordBetaNdaAcceptance(input: RecordBetaNdaAcceptanceInput) {
  const tenantId = input.tenantId.trim() || 'safeviate';
  const email = normalizeEmail(input.email);
  const name = input.name.trim().replace(/\s+/g, ' ') || email.split('@')[0] || 'User';
  const now = new Date();

  return prisma.betaNdaAcceptance.upsert({
    where: {
      tenantId_email_ndaVersion: {
        tenantId,
        email,
        ndaVersion: BETA_NDA_VERSION,
      },
    },
    create: {
      id: `nda_${crypto.randomUUID().replace(/-/g, '')}`,
      tenantId,
      email,
      name,
      ndaVersion: BETA_NDA_VERSION,
      agreementText: BETA_NDA_AGREEMENT_TEXT,
      signatureDataUrl: input.signatureDataUrl,
      acceptedAt: now,
      ipAddress: input.ipAddress?.trim() || null,
      userAgent: input.userAgent?.trim() || null,
    },
    update: {
      tenantId,
      name,
      agreementText: BETA_NDA_AGREEMENT_TEXT,
      signatureDataUrl: input.signatureDataUrl,
      acceptedAt: now,
      ipAddress: input.ipAddress?.trim() || null,
      userAgent: input.userAgent?.trim() || null,
    },
  });
}
