import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare, hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { assertRequiredEnv } from '@/lib/server/env';

assertRequiredEnv(['NEXTAUTH_SECRET'], 'authentication');

const cleanEnvValue = (value: string | undefined) =>
  value?.replace(/\\r\\n|\\n|\\r/g, '').trim() || '';

const normalizeNextAuthUrl = () => {
  const current = cleanEnvValue(process.env.NEXTAUTH_URL);
  if (process.env.NODE_ENV === 'development' && (!current || current.includes('vercel.app'))) {
    return 'http://localhost:9002';
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

process.env.NEXTAUTH_URL = normalizeNextAuthUrl();

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  secret: resolveNextAuthSecret(),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().toLowerCase().trim();
        const password = credentials?.password?.toString();
        const seedEmail = cleanEnvValue(process.env.AUTH_SEED_EMAIL).toLowerCase();
        const seedPasswordHash = cleanEnvValue(process.env.AUTH_SEED_PASSWORD_HASH);
        const seedPassword = cleanEnvValue(process.env.AUTH_SEED_PASSWORD);

        if (!email || !password) return null;

        console.info('[AUTH] Credentials login attempt received.', {
          email,
          seedEmailConfigured: Boolean(seedEmail),
          seedHashConfigured: Boolean(seedPasswordHash),
          seedPasswordConfigured: Boolean(seedPassword),
          nextAuthUrl: cleanEnvValue(process.env.NEXTAUTH_URL),
        });

        let dbUser = null;
        try {
          dbUser = await prisma.user.findUnique({ where: { email } });
        } catch (error) {
          console.error('[AUTH] Database lookup failed, falling back to seed credentials when possible.', error);
        }

        if (dbUser?.passwordHash) {
          const looksHashed = /^\$2[aby]\$\d{2}\$/.test(dbUser.passwordHash);
          const ok = looksHashed ? await compare(password, dbUser.passwordHash) : password === dbUser.passwordHash;
          console.info('[AUTH] Database password compare result:', ok, { looksHashed });

          if (ok) {
            if (!looksHashed) {
              const upgradedHash = await hash(password, 12);
              await prisma.user.update({
                where: { id: dbUser.id },
                data: { passwordHash: upgradedHash },
              });
            }

            return {
              id: dbUser.id,
              email: dbUser.email,
              name: `${dbUser.firstName} ${dbUser.lastName}`.trim(),
            };
          }
        }

        if (!seedEmail) {
          console.warn('[AUTH] Missing AUTH_SEED_EMAIL in runtime env.');
          return null;
        }

        if (seedEmail && email === seedEmail) {
          if (seedPasswordHash) {
            const ok = await compare(password, seedPasswordHash);
            console.info('[AUTH] Password hash compare result:', ok);
            if (!ok) return null;
          } else if (seedPassword) {
            console.info('[AUTH] Plain seed password configured; comparing directly.');
            if (password !== seedPassword) return null;
          } else {
            console.warn('[AUTH] Seed email matched but no password secret is configured.');
            return null;
          }

          return {
            id: 'vercel-seed-admin',
            email: seedEmail,
            name: 'Admin',
          };
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string | undefined;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
