import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { compare } from 'bcryptjs';
import { getDb } from '@/lib/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { serverConfig } from '@/lib/config';

const db = serverConfig.hasDatabaseConfig ? getDb() : null;
const adapter = db ? DrizzleAdapter(db, {
  usersTable: schema.users,
  accountsTable: schema.accounts,
  sessionsTable: schema.sessions,
  verificationTokensTable: schema.verificationTokens,
}) : undefined;

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const db = getDb();
        if (!db) return null;

        const [user] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, credentials.email as string))
          .limit(1);

        if (!user || !user.passwordHash) return null;

        const isValid = await compare(credentials.password as string, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) { token.id = user.id; }
      return token;
    },
    session({ session, token }) {
      if (session.user) { session.user.id = token.id as string; }
      return session;
    },
  },
});
