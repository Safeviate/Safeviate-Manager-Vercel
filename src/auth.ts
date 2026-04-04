import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
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
        const seedEmail = process.env.AUTH_SEED_EMAIL?.toLowerCase().trim();
        const seedPasswordHash = process.env.AUTH_SEED_PASSWORD_HASH?.trim();
        const seedPassword = process.env.AUTH_SEED_PASSWORD?.trim();

        if (!email || !password) return null;

        if (!seedEmail) {
          console.warn('[AUTH] Missing AUTH_SEED_EMAIL in runtime env.');
          return null;
        }

        console.info('[AUTH] Credentials login attempt received.', {
          email,
          seedEmailConfigured: Boolean(seedEmail),
          seedHashConfigured: Boolean(seedPasswordHash),
          seedPasswordConfigured: Boolean(seedPassword),
        });

        const dbUser = await prisma.user.findUnique({ where: { email } });

        if (dbUser?.passwordHash) {
          const ok = await compare(password, dbUser.passwordHash);
          console.info('[AUTH] Database password compare result:', ok);
          if (ok) {
            return {
              id: dbUser.id,
              email: dbUser.email,
              name: `${dbUser.firstName} ${dbUser.lastName}`.trim(),
            };
          }
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
