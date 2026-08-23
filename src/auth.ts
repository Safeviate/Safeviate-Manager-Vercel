import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare, hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { assertRequiredEnv } from '@/lib/server/env';
import { enforceRateLimit } from '@/lib/server/request-security';
import { MASTER_TENANT_EMAILS } from '@/lib/tenant-constants';
import { decryptMfaSecret, verifyMfaCode } from '@/lib/server/mfa';
import { createTrackedSession, isTrackedSessionActive, revokeTrackedSession } from '@/lib/server/user-sessions';

assertRequiredEnv(['NEXTAUTH_SECRET'], 'authentication');

const cleanEnvValue = (value: string | undefined) =>
  value?.replace(/\\r\\n|\\n|\\r/g, '').trim() || '';

const SEED_USER_ID = 'vercel-seed-admin';

const normalizeNextAuthUrl = () => {
  const current = cleanEnvValue(process.env.NEXTAUTH_URL);
  if (process.env.NODE_ENV === 'development') {
    if (!current || current.includes('vercel.app')) {
      return '';
    }
  }

  return current;
};

const resolveNextAuthSecret = () => {
  const configuredSecret = cleanEnvValue(process.env.NEXTAUTH_SECRET);
  if (configuredSecret) return configuredSecret;

  if (process.env.NODE_ENV === 'development') {
    return 'safeviate-development-nextauth-secret';
  }

  throw new Error('[auth] NEXTAUTH_SECRET is required.');
};

const normalizedNextAuthUrl = normalizeNextAuthUrl();
if (normalizedNextAuthUrl) {
  process.env.NEXTAUTH_URL = normalizedNextAuthUrl;
} else {
  delete process.env.NEXTAUTH_URL;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  secret: resolveNextAuthSecret(),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        mfaCode: { label: 'Authenticator or recovery code', type: 'text' },
      },
      async authorize(credentials, request) {
        const email = credentials?.email?.toString().toLowerCase().trim();
        const password = credentials?.password?.toString();
        const mfaCode = credentials?.mfaCode?.toString() || '';
        const configuredSeedEmail = cleanEnvValue(process.env.AUTH_SEED_EMAIL).toLowerCase();
        const seedPasswordHash = cleanEnvValue(process.env.AUTH_SEED_PASSWORD_HASH);
        const seedPassword = cleanEnvValue(process.env.AUTH_SEED_PASSWORD);
        const fallbackSeedEmails = process.env.NODE_ENV === 'development'
          ? MASTER_TENANT_EMAILS.map((value) => value.toLowerCase())
          : [];
        const seedEmails = new Set([
          configuredSeedEmail,
          ...fallbackSeedEmails,
        ].filter(Boolean));
        const isSeedEmail = Boolean(email && seedEmails.has(email));
        const effectiveSeedPassword = seedPassword || (process.env.NODE_ENV === 'development' ? 'SafeviateTemp2026!' : '');
        const effectiveSeedPasswordHash = seedPasswordHash || '';

        if (!email || !password) return null;

        const rateLimit = enforceRateLimit({
          request,
          key: 'auth-login',
          limit: 8,
          identity: email,
        });
        if (rateLimit) {
          console.warn('[AUTH] Login throttled due to rate limit.', { email });
          throw new Error('Too many login attempts. Please wait a moment and try again.');
        }

        console.info('[AUTH] Credentials login attempt received.', {
          email,
          seedEmailConfigured: Boolean(configuredSeedEmail),
          seedHashConfigured: Boolean(effectiveSeedPasswordHash),
          seedPasswordConfigured: Boolean(effectiveSeedPassword),
          seedEmailMatched: isSeedEmail,
          nextAuthUrl: cleanEnvValue(process.env.NEXTAUTH_URL),
        });

        if (isSeedEmail) {
          if (effectiveSeedPasswordHash) {
            const ok = await compare(password, effectiveSeedPasswordHash);
            console.info('[AUTH] Password hash compare result:', ok);
            if (!ok) return null;
          } else if (effectiveSeedPassword) {
            console.info('[AUTH] Plain seed password configured; comparing directly.');
            if (password !== effectiveSeedPassword) return null;
          } else {
            console.warn('[AUTH] Seed email matched but no password secret is configured.');
            return null;
          }

          // A fresh database has no tenant rows yet. Seeded admin sessions
          // belong to the Safeviate master tenant, so ensure it exists before
          // the session's foreign key is written.
          await prisma.tenant.upsert({
            where: { id: 'safeviate' },
            update: {},
            create: { id: 'safeviate', name: 'Safeviate' },
          });

          const sessionId = await createTrackedSession({
            userId: SEED_USER_ID,
            tenantId: 'safeviate',
            email,
            role: 'developer',
            request,
          });
          return {
            id: SEED_USER_ID,
            tenantId: 'safeviate',
            email,
            name: 'Admin',
            role: 'developer',
            sessionId,
          };
        }

        let dbUser = null;
        try {
          dbUser = await prisma.user.findUnique({ where: { email } });
        } catch (error) {
          console.error('[AUTH] Database lookup failed, falling back to seed credentials when possible.', error);
        }

        if (dbUser?.suspendedAt) {
          console.warn('[AUTH] Login denied because the account is suspended.', { email });
          return null;
        }

        if (dbUser) {
          if (!dbUser.passwordHash) {
            const pendingInvite = await prisma.passwordSetupInvite.findFirst({
              where: {
                email: dbUser.email.trim().toLowerCase(),
                usedAt: null,
              },
              select: { id: true },
            }).catch(() => null);

            if (pendingInvite) {
              throw new Error('Password setup is still pending. Please open the reset link you received and save a new password.');
            }

            throw new Error('This account does not have an active password yet. Please request a new password reset link.');
          }

        }

        if (dbUser?.passwordHash) {
          const looksHashed = /^\$2[aby]\$\d{2}\$/.test(dbUser.passwordHash);
          const ok = looksHashed ? await compare(password, dbUser.passwordHash) : password === dbUser.passwordHash;
          console.info('[AUTH] Database password compare result:', ok, { looksHashed });

          if (ok) {
            if (dbUser.mfaEnabledAt && dbUser.mfaSecretEncrypted) {
              try {
                const verification = await verifyMfaCode(
                  decryptMfaSecret(dbUser.mfaSecretEncrypted),
                  mfaCode,
                  dbUser.mfaRecoveryCodeHashes,
                );

                if (!verification.valid) {
                  console.warn('[AUTH] MFA verification failed.', { email });
                  return null;
                }

                if (verification.usedRecoveryCodeHash) {
                  await prisma.user.update({
                    where: { id: dbUser.id },
                    data: {
                      mfaRecoveryCodeHashes: dbUser.mfaRecoveryCodeHashes.filter(
                        (codeHash) => codeHash !== verification.usedRecoveryCodeHash,
                      ),
                    },
                  });
                }
              } catch (error) {
                // Do not allow a configured MFA account to bypass MFA if its secret cannot be read.
                console.error('[AUTH] MFA verification could not be completed.', { email, error });
                return null;
              }
            }

            const personnelProfile = await prisma.personnel.findFirst({
              where: {
                tenantId: dbUser.tenantId,
                email: dbUser.email.trim().toLowerCase(),
              },
              select: { accessOverrides: true },
            }).catch(() => null);
            const accessOverrides =
              personnelProfile?.accessOverrides && typeof personnelProfile.accessOverrides === 'object'
                ? (personnelProfile.accessOverrides as Record<string, unknown>)
                : null;
            const mustChangeManualPassword = accessOverrides?.mustChangeManualPassword === true;

            if (!looksHashed) {
              const upgradedHash = await hash(password, 12);
              await prisma.user.update({
                where: { id: dbUser.id },
                data: { passwordHash: upgradedHash },
              });
            }

            // Roles can be stored as either their ID or name. Resolve the display name
            // so custom administrator roles receive the stricter device policy too.
            const assignedRole = await prisma.role.findFirst({
              where: {
                tenantId: dbUser.tenantId,
                OR: [{ id: dbUser.role }, { name: dbUser.role }],
              },
              select: { name: true },
            }).catch(() => null);

            const sessionId = await createTrackedSession({
              userId: dbUser.id,
              tenantId: dbUser.tenantId,
              email: dbUser.email,
              role: assignedRole?.name || dbUser.role,
              request,
            });

            return {
              id: dbUser.id,
              tenantId: dbUser.tenantId,
              email: dbUser.email,
              name: `${dbUser.firstName} ${dbUser.lastName}`.trim(),
              role: dbUser.role,
              mustChangeManualPassword,
              sessionId,
            };
          }
        }

        if (!configuredSeedEmail) {
          console.warn('[AUTH] Missing AUTH_SEED_EMAIL in runtime env.');
          return null;
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name || token.name;
        token.tenantId = user.tenantId;
        token.role = user.role;
        token.mustChangeManualPassword = user.mustChangeManualPassword;
        token.sessionId = user.sessionId;
      } else if (token.sessionId && token.id && token.tenantId) {
        const active = await isTrackedSessionActive({
          sessionId: token.sessionId,
          userId: token.id,
          tenantId: token.tenantId,
        }).catch(() => false);
        if (!active) return {};
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string | undefined) || undefined;
        session.user.email = (token.email as string | undefined) || undefined;
        session.user.name = (token.name as string | undefined) || undefined;
        session.user.tenantId = (token.tenantId as string | undefined) || undefined;
        session.user.role = (token.role as string | undefined) || undefined;
        session.user.mustChangeManualPassword = Boolean(token.mustChangeManualPassword);
        session.user.sessionId = (token.sessionId as string | undefined) || undefined;
      }
      return session;
    },
  },
  events: {
    async signOut(message) {
      if ('token' in message && message.token?.sessionId && message.token.id && message.token.tenantId) {
        await revokeTrackedSession({
          tenantId: message.token.tenantId,
          userId: message.token.id,
          sessionId: message.token.sessionId,
          reason: 'sign_out',
          actorEmail: String(message.token.email || 'unknown'),
        }).catch(() => undefined);
      }
    },
  },
};

export default NextAuth(authOptions);
