import crypto from 'node:crypto';
import { hash } from 'bcryptjs';
import { isDatabaseAvailable, prisma } from '@/lib/prisma';
import { getPublicBaseUrl } from '@/lib/server/site-url';

const INVITE_TTL_DAYS = 7;
const ACTIVE_INVITE_SELECT = {
  id: true,
  tenantId: true,
  userId: true,
  email: true,
  name: true,
  createdAt: true,
  expiresAt: true,
} as const;

export type PasswordSetupInviteInput = {
  tenantId: string;
  email: string;
  name: string;
  userId?: string | null;
};

type PasswordSetupInviteRecord = {
  id: string;
  tenantId: string;
  userId: string | null;
  email: string;
  name: string | null;
  createdAt: Date;
  expiresAt: Date;
};

export type PasswordSetupInviteResult = {
  token: string;
  setupLink: string;
  email: string;
  name: string;
  expiresAt: Date;
  inviteId: string;
  reusedExistingInvite: boolean;
};

export type RecentPasswordSetupInviteLookup = {
  tenantId: string;
  email: string;
  userId?: string | null;
  windowMinutes?: number;
};

export type PasswordSetupCompletionResult = {
  success: boolean;
  error?: string;
  email?: string;
  userId?: string;
  diagnostics?: Record<string, unknown>;
};

export type PasswordSetupStatus = {
  tenantId: string;
  hasActivePassword: boolean;
  hasPendingInvite: boolean;
  passwordSetupPending: boolean;
  passwordSetupMessage: string;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const getPasswordSetupTokenSecret = () => {
  const configuredSecret =
    process.env.PASSWORD_SETUP_TOKEN_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();

  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV === 'development') {
    return 'safeviate-development-password-setup-secret';
  }

  throw new Error('[password-setup] Missing password setup token secret.');
};

const derivePasswordSetupToken = (invite: PasswordSetupInviteRecord) => {
  const secret = getPasswordSetupTokenSecret();
  const tokenSource = [
    invite.id,
    invite.tenantId,
    invite.userId || '',
    invite.email,
    invite.createdAt.toISOString(),
  ].join(':');

  return crypto
    .createHmac('sha256', secret)
    .update(tokenSource)
    .digest('base64url');
};

const buildPasswordSetupLink = (request: Request, invite: PasswordSetupInviteRecord) => {
  const token = derivePasswordSetupToken(invite);
  const baseUrl = getPublicBaseUrl(request);
  return {
    token,
    setupLink: `${baseUrl}/setup-password?token=${encodeURIComponent(token)}`,
  };
};

const splitName = (name: string) => {
  const compact = name.trim().replace(/\s+/g, ' ');
  if (!compact) return { firstName: 'User', lastName: '' };
  const [firstName, ...rest] = compact.split(' ');
  return { firstName, lastName: rest.join(' ') };
};

export async function findRecentActivePasswordSetupInvite({
  tenantId,
  email,
  userId,
  windowMinutes = 10,
}: RecentPasswordSetupInviteLookup) {
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  return prisma.passwordSetupInvite.findFirst({
    where: {
      tenantId,
      email: normalizedEmail,
      ...(userId ? { userId } : {}),
      usedAt: null,
      expiresAt: { gt: now },
      createdAt: { gte: new Date(now.getTime() - windowMinutes * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
      tenantId: true,
      userId: true,
      email: true,
      name: true,
    },
  });
}

export async function findActivePasswordSetupInvite({
  tenantId,
  email,
  userId,
}: RecentPasswordSetupInviteLookup) {
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  return prisma.passwordSetupInvite.findFirst({
    where: {
      tenantId,
      email: normalizedEmail,
      ...(userId ? { userId } : {}),
      usedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
    select: ACTIVE_INVITE_SELECT,
  });
}

export async function getPasswordSetupStatusByEmail(
  email: string,
  fallbackTenantId = 'safeviate',
): Promise<PasswordSetupStatus> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return {
      tenantId: fallbackTenantId,
      hasActivePassword: false,
      hasPendingInvite: false,
      passwordSetupPending: false,
      passwordSetupMessage: '',
    };
  }

  const now = new Date();
  const [user, invite] = await Promise.all([
    prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { tenantId: true, passwordHash: true },
    }).catch(() => null),
    prisma.passwordSetupInvite.findFirst({
      where: {
        email: normalizedEmail,
        usedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
      select: { tenantId: true },
    }).catch(() => null),
  ]);

  const tenantId = user?.tenantId?.trim() || invite?.tenantId?.trim() || fallbackTenantId;
  const hasActivePassword = Boolean(user?.passwordHash);
  const hasPendingInvite = Boolean(invite);

  if (hasActivePassword) {
    return {
      tenantId,
      hasActivePassword,
      hasPendingInvite,
      passwordSetupPending: false,
      passwordSetupMessage: '',
    };
  }

  if (hasPendingInvite) {
    return {
      tenantId,
      hasActivePassword,
      hasPendingInvite,
      passwordSetupPending: true,
      passwordSetupMessage: 'Password setup is still pending. Please open the reset link you received and save a new password.',
    };
  }

  if (user) {
    return {
      tenantId,
      hasActivePassword,
      hasPendingInvite,
      passwordSetupPending: true,
      passwordSetupMessage: 'This account does not have an active password yet. Please request a new password reset link.',
    };
  }

  return {
    tenantId,
    hasActivePassword,
    hasPendingInvite,
    passwordSetupPending: false,
    passwordSetupMessage: '',
  };
}

export async function createPasswordSetupInvite(
  request: Request,
  input: PasswordSetupInviteInput,
): Promise<PasswordSetupInviteResult> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim() || email.split('@')[0] || 'User';
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, tenantId: true },
  });

  if (existingUser && existingUser.tenantId !== input.tenantId) {
    throw new Error('This email address is already assigned to a different tenant.');
  }

  const lockKey = `password-setup-invite:${input.tenantId}:${email}:${input.userId ?? ''}`;

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const activeInvite = await tx.passwordSetupInvite.findFirst({
      where: {
        tenantId: input.tenantId,
        email,
        ...(input.userId ? { userId: input.userId } : {}),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: ACTIVE_INVITE_SELECT,
    });

    if (activeInvite) {
      const { token, setupLink } = buildPasswordSetupLink(request, activeInvite);
      return {
        token,
        setupLink,
        email: activeInvite.email,
        name: activeInvite.name?.trim() || name,
        expiresAt: activeInvite.expiresAt,
        inviteId: activeInvite.id,
        reusedExistingInvite: true,
      };
    }

    const inviteId = `invite_${crypto.randomUUID().replace(/-/g, '')}`;
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
    const inviteRecord: PasswordSetupInviteRecord = {
      id: inviteId,
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      email,
      name,
      createdAt,
      expiresAt,
    };
    const { token, setupLink } = buildPasswordSetupLink(request, inviteRecord);
    const tokenHash = hashToken(token);

    await tx.passwordSetupInvite.create({
      data: {
        id: inviteId,
        tenantId: input.tenantId,
        userId: input.userId ?? null,
        email,
        name,
        tokenHash,
        createdAt,
        expiresAt,
      },
    });

    return { token, setupLink, email, name, expiresAt, inviteId, reusedExistingInvite: false };
  });
}

export async function completePasswordSetup(token: string, password: string): Promise<PasswordSetupCompletionResult> {
  const tokenHash = hashToken(token);
  if (!(await isDatabaseAvailable())) {
    return { success: false, error: 'Database is unavailable.' };
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tokenHash}))`;

    const invite = await tx.passwordSetupInvite.findUnique({
      where: { tokenHash },
      include: { tenant: true, user: true },
    });

    if (!invite) {
      return { success: false, error: 'Invalid or expired setup link.' };
    }

    if (invite.usedAt) {
      const completedUser = invite.user?.passwordHash
        ? invite.user
        : await tx.user.findFirst({
            where: {
              tenantId: invite.tenantId,
              email: normalizeEmail(invite.email),
              passwordHash: { not: null },
            },
            select: { id: true, passwordHash: true },
          }).catch(() => null);

      if (completedUser?.passwordHash) {
        return {
          success: false,
          error: 'This setup link has already been used. Please sign in or request a new password reset link.',
        };
      }

      return {
        success: false,
        error: 'This setup link has already been used. Please request a new password reset link.',
      };
    }

    if (invite.expiresAt.getTime() < Date.now()) {
      return { success: false, error: 'This setup link has expired. Please request a new invite.' };
    }

    const passwordHash = await hash(password, 12);
    const email = normalizeEmail(invite.email);
    const displayName = invite.name?.trim() || email.split('@')[0] || 'User';
    const { firstName, lastName } = splitName(displayName);
    const userId = invite.userId || `user_${email.replace(/[^a-z0-9]+/g, '_')}`;

    await tx.tenant.upsert({
      where: { id: invite.tenantId },
      update: { updatedAt: new Date() },
      create: { id: invite.tenantId, name: invite.tenant.name || invite.tenantId },
    });

    const existingUser = invite.user || (await tx.user.findUnique({ where: { email } }));

    if (existingUser) {
      if (existingUser.tenantId !== invite.tenantId) {
        return {
          success: false,
          error: 'This email address is already assigned to a different tenant.',
        };
      }

      await tx.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          firstName: existingUser.firstName || firstName,
          lastName: existingUser.lastName || lastName,
          updatedAt: new Date(),
        },
      });
    } else {
      await tx.user.create({
        data: {
          id: userId,
          tenantId: invite.tenantId,
          email,
          passwordHash,
          firstName,
          lastName,
          role: 'Personnel',
          profilePath: `tenants/${invite.tenantId}/personnel/${userId}`,
        },
      });
    }

    await tx.passwordSetupInvite.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    });

    await tx.passwordSetupInvite.updateMany({
      where: {
        id: { not: invite.id },
        usedAt: null,
        tenantId: invite.tenantId,
        OR: [
          { email },
          ...(invite.userId ? [{ userId: invite.userId }] : []),
        ],
      },
      data: { usedAt: new Date() },
    });

    return {
      success: true,
      email,
      userId: existingUser?.id || userId,
      diagnostics: {
        tenantId: invite.tenantId,
        inviteId: invite.id,
        expiresAt: invite.expiresAt.toISOString(),
      },
    };
  });
}
